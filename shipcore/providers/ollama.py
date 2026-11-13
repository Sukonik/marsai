"""Optional local language layer via Ollama (https://ollama.com). No API key.

Used only when an Ollama server is running on this machine. Standard library
only; talks to localhost.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

from .base import Reply

MAX_REPLY = 2000
SYSTEM = (
    "You are {crew}, a crew member aboard the captain's starship in an original "
    "life-progression game called MARSAI. Be concise, helpful, and in character. "
    "Never claim to run commands or access files."
)


class OllamaProvider:
    name = "ollama"

    def __init__(self, host: str | None = None, model: str | None = None) -> None:
        self.host = (host or os.environ.get("MARSAI_OLLAMA_HOST", "http://127.0.0.1:11434")).rstrip("/")
        self.model = model or os.environ.get("MARSAI_OLLAMA_MODEL", "llama3.2")
        self._checked = 0.0
        self._ok = False

    def available(self) -> bool:
        if time.time() - self._checked < 10:
            return self._ok
        self._checked = time.time()
        try:
            with urllib.request.urlopen(f"{self.host}/api/tags", timeout=0.8) as r:
                self._ok = r.status == 200
        except (OSError, urllib.error.URLError, ValueError):
            self._ok = False
        return self._ok

    def reply(self, message: str, crew: str) -> Reply:
        body = json.dumps({
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM.format(crew=crew.title())},
                {"role": "user", "content": message},
            ],
        }).encode()
        req = urllib.request.Request(f"{self.host}/api/chat", data=body, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.loads(r.read().decode())
            text = str(data.get("message", {}).get("content", "")).strip()[:MAX_REPLY]
        except (OSError, urllib.error.URLError, ValueError):
            self._ok = False
            raise
        return Reply(text or "(no response)", f"ollama:{self.model}")
