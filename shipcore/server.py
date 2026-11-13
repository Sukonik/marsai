"""Local HTTP API for the MARSAI HUD. Binds to loopback only by default."""
from __future__ import annotations

import os
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field

from . import __version__
from .core import ShipCore
from .voice import MAX_AUDIO_BYTES, VoiceEngine

DEFAULT_ORIGINS = {"https://sukonik.github.io"}
LOCAL_ORIGIN = re.compile(r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")


def allowed_origins() -> set[str]:
    extra = {o.strip() for o in os.environ.get("MARSAI_ALLOWED_ORIGINS", "").split(",") if o.strip()}
    return DEFAULT_ORIGINS | extra


def origin_ok(origin: str | None) -> bool:
    if origin is None:
        return True  # non-browser clients (curl, scripts) on this machine
    return origin in allowed_origins() or bool(LOCAL_ORIGIN.match(origin))


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    crew: str = Field(default="MARS", max_length=16)


class TtsIn(BaseModel):
    text: str = Field(min_length=1, max_length=600)
    crew: str = Field(default="MARS", max_length=16)


class MissionIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)


def create_app(core: ShipCore | None = None, voice: VoiceEngine | None = None) -> FastAPI:
    core = core or ShipCore()
    voice = voice or VoiceEngine(core.store.home)
    app = FastAPI(title="MARSAI ShipCore", version=__version__, docs_url=None, redoc_url=None)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(allowed_origins()),
        allow_origin_regex=LOCAL_ORIGIN.pattern,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        allow_private_network=True,
    )

    @app.middleware("http")
    async def guard(request: Request, call_next):
        # Browsers from other sites must not drive this local service.
        if not origin_ok(request.headers.get("origin")):
            return JSONResponse({"detail": "origin not allowed"}, status_code=403)
        return await call_next(request)

    @app.get("/health")
    def health():
        return {**core.health(), "version": __version__}

    @app.post("/chat")
    def chat(body: ChatIn):
        r = core.chat(body.message, body.crew)
        return {"reply": r.text, "source": r.source, "speaker": body.crew.upper() if body.crew.upper() in ("MARS", "VENUS") else "MARS"}

    @app.get("/voice/status")
    def voice_status():
        return voice.status()

    @app.post("/stt")
    async def stt(request: Request):
        if not voice.stt_available():
            raise HTTPException(503, "speech-to-text not installed")
        declared = int(request.headers.get("content-length") or 0)
        if declared > MAX_AUDIO_BYTES:
            raise HTTPException(413, "audio too large")
        data = await request.body()
        if not data or len(data) > MAX_AUDIO_BYTES:
            raise HTTPException(413 if data else 400, "audio missing or too large")
        try:
            text = await run_in_threadpool(voice.transcribe, data)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except Exception:
            raise HTTPException(422, "could not decode audio")
        return {"text": text}

    @app.post("/tts")
    def tts(body: TtsIn):
        if not voice.tts_available():
            raise HTTPException(503, "text-to-speech voice not installed")
        try:
            wav = voice.synthesize(body.text, body.crew)
        except ValueError as e:
            raise HTTPException(400, str(e))
        except RuntimeError as e:
            raise HTTPException(503, str(e))
        return Response(content=wav, media_type="audio/wav", headers={"Cache-Control": "no-store"})

    @app.get("/missions")
    def missions():
        return {"missions": core.store.missions()}

    @app.post("/missions", status_code=201)
    def add_mission(body: MissionIn):
        return core.store.add_mission(body.title)

    @app.post("/missions/{mission_id}/complete")
    def complete(mission_id: int):
        m = core.store.complete_mission(mission_id)
        if not m:
            raise HTTPException(404, "mission not found")
        return m

    return app
