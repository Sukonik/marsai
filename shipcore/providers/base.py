"""Provider interface: any no-key language layer plugs in here.

Personality, voice, intelligence provider, and skills stay separate so the
captain's journey survives provider changes.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class Reply:
    text: str
    source: str


class Provider(Protocol):
    name: str

    def available(self) -> bool: ...

    def reply(self, message: str, crew: str) -> Reply: ...
