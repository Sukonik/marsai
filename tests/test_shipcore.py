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
