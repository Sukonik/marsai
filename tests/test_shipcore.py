import pytest
from fastapi.testclient import TestClient

from shipcore.core import ShipCore
from shipcore.providers import Reply
from shipcore.server import create_app
from shipcore.storage import Store


class FakeProvider:
    name = "fake"

    def __init__(self, up=True):
        self.up = up

    def available(self):
        return self.up

    def reply(self, message, crew):
        return Reply(f"{crew}:{message}", "fake")


@pytest.fixture
def core(tmp_path):
    return ShipCore(Store(tmp_path), providers=[])


def test_help_lists_skills(core):
    r = core.chat("help")
    assert r.source == "skill:help" and "new mission" in r.text


def test_notes_roundtrip_and_persist(tmp_path):
    c = ShipCore(Store(tmp_path), providers=[])
    assert "Noted" in c.chat("note buy filters").text
    assert "buy filters" in ShipCore(Store(tmp_path), providers=[]).chat("notes").text


def test_missions_lifecycle(core):
    assert "created" in core.chat("new mission learn to bake").text
    assert "[open]" in core.chat("my missions").text
    assert "complete" in core.chat("complete mission 1").text
    assert "[done]" in core.chat("my missions").text
    assert "No mission" in core.chat("complete mission 99").text


def test_time_status_joke(core):
    assert core.chat("what time is it").source == "skill:time"
    assert "Python" in core.chat("status").text
    assert core.chat("joke").source == "skill:joke"


def test_fallback_without_provider(core):
    r = core.chat("tell me about black holes")
    assert r.source == "fallback"


def test_provider_used_when_available_and_skills_win(tmp_path):
    c = ShipCore(Store(tmp_path), providers=[FakeProvider()])
    assert c.chat("hello there", "venus").text == "VENUS:hello there"
    assert c.chat("help").source == "skill:help"


def test_unavailable_provider_skipped(tmp_path):
    c = ShipCore(Store(tmp_path), providers=[FakeProvider(up=False)])
    assert c.chat("hello").source == "fallback"


@pytest.fixture
def client(core):
    return TestClient(create_app(core))


def test_health(client):
    d = client.get("/health").json()
    assert d["name"] == "shipcore" and "help" in d["skills"]


def test_chat_endpoint_and_validation(client):
    assert client.post("/chat", json={"message": "help"}).json()["source"] == "skill:help"
    assert client.post("/chat", json={"message": ""}).status_code == 422
    assert client.post("/chat", json={"message": "x" * 501}).status_code == 422


def test_origin_guard(client):
    assert client.get("/health", headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.get("/health", headers={"Origin": "https://sukonik.github.io"}).status_code == 200
    assert client.get("/health", headers={"Origin": "http://localhost:8000"}).status_code == 200
    assert client.get("/health").status_code == 200


def test_preflight_private_network(client):
    r = client.options("/chat", headers={
        "Origin": "https://sukonik.github.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
        "Access-Control-Request-Private-Network": "true",
    })
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-private-network") == "true"
    assert r.headers.get("access-control-allow-origin") == "https://sukonik.github.io"


def test_missions_api(client):
    m = client.post("/missions", json={"title": "ship it"}).json()
    assert client.post(f"/missions/{m['id']}/complete").json()["done"] is True
    assert client.post("/missions/999/complete").status_code == 404
    assert len(client.get("/missions").json()["missions"]) == 1


def test_refuses_non_loopback(capsys):
    from shipcore.__main__ import main
    assert main(["--host", "0.0.0.0"]) == 2


# ---------- voice ----------
from shipcore.voice import VoiceEngine, MAX_AUDIO_BYTES  # noqa: E402


class FakeVoice(VoiceEngine):
    def __init__(self, stt=True, tts=True):
        self._stt, self._tts = stt, tts

    def stt_available(self):
        return self._stt

    def tts_available(self):
        return self._tts

    def status(self):
        return {"stt": {"available": self._stt}, "tts": {"available": self._tts, "voices": {}}}

    def transcribe(self, audio):
        return "open crew" if audio else ""

    def synthesize(self, text, crew="MARS"):
        return b"RIFF" + text.encode()


@pytest.fixture
def vclient(core):
    return TestClient(create_app(core, FakeVoice()))


def test_voice_status(vclient):
    assert vclient.get("/voice/status").json()["stt"]["available"] is True


def test_stt_ok_and_limits(vclient):
    r = vclient.post("/stt", content=b"abc", headers={"Content-Type": "audio/webm"})
    assert r.json() == {"text": "open crew"}
    assert vclient.post("/stt", content=b"").status_code == 400
    big = b"x" * (MAX_AUDIO_BYTES + 1)
    assert vclient.post("/stt", content=big).status_code == 413


def test_tts_ok_and_validation(vclient):
    r = vclient.post("/tts", json={"text": "hello", "crew": "venus"})
    assert r.status_code == 200 and r.headers["content-type"] == "audio/wav"
    assert vclient.post("/tts", json={"text": ""}).status_code == 422
    assert vclient.post("/tts", json={"text": "x" * 601}).status_code == 422


def test_voice_unavailable_returns_503(core):
    c = TestClient(create_app(core, FakeVoice(stt=False, tts=False)))
    assert c.post("/stt", content=b"abc").status_code == 503
    assert c.post("/tts", json={"text": "hi"}).status_code == 503


def test_voice_endpoints_respect_origin_guard(vclient):
    assert vclient.post("/tts", json={"text": "hi"}, headers={"Origin": "https://evil.example"}).status_code == 403


def test_voice_status_without_models(tmp_path):
    s = VoiceEngine(tmp_path).status()
    assert s["tts"]["available"] is False and s["tts"]["voices"] == {}


@pytest.mark.skipif(not __import__("os").environ.get("MARSAI_VOICE_IT"), reason="needs local models: set MARSAI_VOICE_IT=1")
def test_voice_round_trip_real_models():
    eng = VoiceEngine()
    wav = eng.synthesize("Open the crew module.", "MARS")
    assert "crew" in eng.transcribe(wav).lower()


def test_transcript_punctuation_is_normalized(core):
    assert "created: learn baking" in core.chat("New mission, learn baking.").text
    assert "Noted (#" in core.chat("Note, buy filters.").text
    assert core.chat("Help.").source == "skill:help"


# ---------- crew framework (from the README) ----------
import json  # noqa: E402
from pathlib import Path  # noqa: E402

from shipcore import crew as crew_mod  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def test_crew_roster_matches_readme():
    crew = crew_mod.load()["crew"]
    assert len(crew) == 20
    groups = [c["group"] for c in crew]
    assert groups.count("foundational") == 2 and groups.count("male") == 9 and groups.count("female") == 9
    names = {c["name"] for c in crew}
    assert {"Mars", "Venus", "Pluto", "Mercury", "Atlas", "Sirius", "Neptune", "Saturn", "Oberon", "Jupiter",
            "Pollux", "Eris", "Luna", "Bellatrix", "Vesta", "Europa", "Vega", "Rhea", "Polaris", "Io"} == names
    sigils = {c["name"]: c["sigil"] for c in crew}
    assert sigils["Pluto"] == "🥊" and sigils["Europa"] == "🕊️" and sigils["Mars"] == "🔴"
    assert len({c["voice"]["piper_speaker"] for c in crew}) == 20          # every crew voice is distinct
    for c in crew:
        for key in ("greet", "how", "thanks", "bye", "cheer", "intro", "unknown"):
            assert c["lines"][key], (c["id"], key)
        assert c["gender"] in ("m", "f") and c["persona"] and c["role"]


def test_hud_crew_file_is_in_sync():
    assert (ROOT / "site/assets/crew.json").read_text(encoding="utf-8") == (ROOT / "shipcore/crew.json").read_text(encoding="utf-8")


def test_chat_speaker_is_crew_member_with_sigil(client):
    d = client.post("/chat", json={"message": "help", "crew": "pluto"}).json()
    assert d["speaker"] == "PLUTO" and d["label"] == "🥊 Pluto"
    assert client.post("/chat", json={"message": "help", "crew": "nobody"}).json()["speaker"] == "MARS"
    assert len(client.get("/crew").json()["crew"]) == 20


def test_persona_reaches_the_language_model_prompt():
    from shipcore.providers.ollama import SYSTEM

    c = crew_mod.get("SATURN")
    prompt = SYSTEM.format(name=c["name"], role=c["role"], persona=c["persona"])
    assert "Saturn" in prompt and "Veteran" in prompt and "Gruff" in prompt


@pytest.mark.skipif(not __import__("os").environ.get("MARSAI_VOICE_IT"), reason="needs local models: set MARSAI_VOICE_IT=1")
def test_crew_voices_really_differ():
    eng = VoiceEngine()
    a, b, c = (eng.synthesize("Systems nominal.", n) for n in ("MARS", "VENUS", "SATURN"))
    assert len({a, b, c}) == 3


def test_crew_has_copilot_topics_and_ack_lines():
    for c in crew_mod.load()["crew"]:
        assert len(c["topics"]) >= 5, c["id"]
        assert c["lines"]["ack"], c["id"]
