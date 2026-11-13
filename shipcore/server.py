"""Local HTTP API for the MARSAI HUD. Binds to loopback only by default."""
from __future__ import annotations

import os
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from . import __version__
from .core import ShipCore

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


class MissionIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)


def create_app(core: ShipCore | None = None) -> FastAPI:
    core = core or ShipCore()
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
