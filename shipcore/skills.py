"""Deterministic, no-AI skills. This is ShipCore's always-available layer.

Skills are original to MARSAI. They are local-first and never touch the
network, the shell, other applications, or credentials.
"""
from __future__ import annotations

import os
import platform
import re
import shutil
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Callable

from .storage import Store

JOKES = [
    "Why did the astronaut break up with the planet? It needed more space.",
    "I told the ship's AI a joke about gravity. It really fell for it.",
    "Mars has great hotels, but no atmosphere.",
    "Why did the comet get promoted? It was always going places.",
    "A moon walked into a bar. It was only a phase.",
    "The crew held a meeting in orbit. It went around in circles.",
]


@dataclass
class Skill:
    name: str
    pattern: re.Pattern
    handler: Callable[[re.Match, Store], str]
    help: str


def _help(_m: re.Match, _s: Store) -> str:
    lines = [f"- {s.help}" for s in SKILLS if s.help]
    return "ShipCore skills (no AI key needed):\n" + "\n".join(lines)


def _time(_m: re.Match, _s: Store) -> str:
    now = datetime.now().astimezone()
    return now.strftime("It is %A, %d %B %Y, %H:%M %Z.")


def _status(_m: re.Match, _s: Store) -> str:
    parts = [f"Host: {platform.system()} {platform.release()}", f"Python {platform.python_version()}"]
    parts.append(f"CPU cores: {os.cpu_count() or 'unknown'}")
    if hasattr(os, "getloadavg"):
        parts.append("Load: " + ", ".join(f"{x:.2f}" for x in os.getloadavg()))
    try:
        usage = shutil.disk_usage(os.path.expanduser("~"))
        parts.append(f"Disk free: {usage.free / 1e9:.1f} GB of {usage.total / 1e9:.1f} GB")
    except OSError:
        pass
    try:
        import psutil  # optional

        parts.append(f"Memory used: {psutil.virtual_memory().percent:.0f}%")
    except Exception:
        pass
    return " | ".join(parts)


def _joke(_m: re.Match, _s: Store) -> str:
    return JOKES[int(time.time() // 5) % len(JOKES)]


def _note_add(m: re.Match, s: Store) -> str:
    text = _title(m.group("text"))
    if not text:
        return "What should the note say? Try: note buy filters for the ship."
    n = s.add_note(text)
    return f"Noted (#{n['id']}): {n['text']}"


def _notes_list(_m: re.Match, s: Store) -> str:
    notes = s.notes()
    if not notes:
        return "No notes yet. Try: note <text>."
    return "Notes:\n" + "\n".join(f"#{n['id']} {n['text']}" for n in notes[-10:])


def _title(raw: str) -> str:
    return raw.strip().lstrip(",;:.- ").strip()


def _mission_add(m: re.Match, s: Store) -> str:
    title = _title(m.group("title"))
    if not title:
        return "Name the mission. Try: new mission learn to bake bread."
    ms = s.add_mission(title)
    return f"Mission #{ms['id']} created: {ms['title']}"


def _missions_list(_m: re.Match, s: Store) -> str:
    ms = s.missions()
    if not ms:
        return "No missions yet. Try: new mission <title>."
    return "Missions:\n" + "\n".join(f"#{x['id']} [{'done' if x['done'] else 'open'}] {x['title']}" for x in ms[-10:])


def _mission_done(m: re.Match, s: Store) -> str:
    res = s.complete_mission(int(m.group("id")))
    if not res:
        return "No mission with that number. Try: my missions."
    return f"Mission #{res['id']} complete: {res['title']}. Experience logged."


# Order matters: specific commands first.
SKILLS: list[Skill] = [
    Skill("mission_done", re.compile(r"^(?:complete|finish|done)\s+mission\s+#?(?P<id>\d+)$", re.I), _mission_done,
          "complete mission <number>"),
    Skill("mission_add", re.compile(r"^(?:new|create|add)\s+mission\s*[:\-]?\s*(?P<title>.*)$", re.I), _mission_add,
          "new mission <title>"),
    Skill("missions_list", re.compile(r"^(?:my\s+missions|list\s+missions|show\s+missions)$", re.I), _missions_list,
          "my missions"),
    Skill("note_add", re.compile(r"^(?:note|remember)(?:\s*[:\-,]\s*|\s+)(?P<text>.+)$", re.I), _note_add, "note <text>"),
    Skill("notes_list", re.compile(r"^(?:notes|my\s+notes|list\s+notes)$", re.I), _notes_list, "notes"),
    Skill("time", re.compile(r"^(?:what(?:'s| is)?\s+)?(?:the\s+)?(?:time|date|day)(?:\s+(?:is it|now|today))?\??$", re.I),
          _time, "time"),
    Skill("status", re.compile(r"^(?:system\s+)?status\??$|^how(?:'s| is)\s+the\s+ship\??$", re.I), _status,
          "status"),
    Skill("joke", re.compile(r"^(?:tell\s+me\s+)?(?:a\s+)?joke$", re.I), _joke, "joke"),
    Skill("help", re.compile(r"^(?:help|what can you do\??|skills)$", re.I), _help, "help"),
]


def run_skill(message: str, store: Store) -> tuple[str, str] | None:
    """Return (skill_name, reply) if a skill matches, else None."""
    text = message.strip().rstrip(".!,;").strip()  # speech-to-text often adds punctuation
    for skill in SKILLS:
        m = skill.pattern.match(text)
        if m:
            return skill.name, skill.handler(m, store)
    return None
