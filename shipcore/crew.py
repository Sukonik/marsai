"""The MARSAI crew roster (single source of truth: crew.json, from the README).

The same file is served to the HUD as site/assets/crew.json; a test keeps them identical.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

CREW_FILE = Path(__file__).with_name("crew.json")
DEFAULT = "MARS"


@lru_cache(maxsize=1)
def load() -> dict:
    return json.loads(CREW_FILE.read_text(encoding="utf-8"))


def roster() -> dict[str, dict]:
    return {c["id"]: c for c in load()["crew"]}


def get(crew_id: str | None) -> dict:
    r = roster()
    return r.get((crew_id or DEFAULT).upper(), r[DEFAULT])


def ids() -> list[str]:
    return [c["id"] for c in load()["crew"]]


def label(crew: dict) -> str:
    return f'{crew["sigil"]} {crew["name"]}'
