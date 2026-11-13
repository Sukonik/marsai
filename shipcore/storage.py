"""Tiny local JSON store for captain data (notes and missions).

Everything stays on the captain's machine in MARSAI_HOME (default ~/.marsai).
"""
from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from pathlib import Path

MAX_TEXT = 500
MAX_ITEMS = 500


def default_home() -> Path:
    return Path(os.environ.get("MARSAI_HOME", Path.home() / ".marsai"))


class Store:
    def __init__(self, home: Path | None = None) -> None:
        self.home = Path(home) if home else default_home()
        self.path = self.home / "state.json"
        self._lock = threading.Lock()
        self._data = self._load()

    def _load(self) -> dict:
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                data.setdefault("notes", [])
                data.setdefault("missions", [])
                data.setdefault("next_id", 1)
                return data
        except (OSError, ValueError):
            pass
        return {"notes": [], "missions": [], "next_id": 1}

    def _save(self) -> None:
        self.home.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=self.home, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(self._data, fh, indent=2)
        os.replace(tmp, self.path)

    @staticmethod
    def _clean(text: str) -> str:
        return " ".join(text.split())[:MAX_TEXT]

    def add_note(self, text: str) -> dict:
        with self._lock:
            note = {"id": self._data["next_id"], "text": self._clean(text), "created": int(time.time())}
            self._data["next_id"] += 1
            self._data["notes"] = (self._data["notes"] + [note])[-MAX_ITEMS:]
            self._save()
            return note

    def notes(self) -> list[dict]:
        with self._lock:
            return list(self._data["notes"])

    def add_mission(self, title: str) -> dict:
        with self._lock:
            mission = {
                "id": self._data["next_id"],
                "title": self._clean(title),
                "done": False,
                "created": int(time.time()),
            }
            self._data["next_id"] += 1
            self._data["missions"] = (self._data["missions"] + [mission])[-MAX_ITEMS:]
            self._save()
            return mission

    def missions(self) -> list[dict]:
        with self._lock:
            return list(self._data["missions"])

    def complete_mission(self, mission_id: int) -> dict | None:
        with self._lock:
            for m in self._data["missions"]:
                if m["id"] == mission_id:
                    m["done"] = True
                    self._save()
                    return dict(m)
            return None
