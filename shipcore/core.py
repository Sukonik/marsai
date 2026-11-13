"""ShipCore router: skills first, then optional local language providers."""
from __future__ import annotations

from . import crew as crew_mod
from .providers import OllamaProvider, Provider, Reply
from .skills import SKILLS, run_skill
from .storage import Store

FALLBACK = (
    "ShipCore has no language model connected, so I only know my built-in skills. "
    "Type help. To enable open conversation, run a local model with Ollama (no key needed)."
)


class ShipCore:
    def __init__(self, store: Store | None = None, providers: list[Provider] | None = None) -> None:
        self.store = store or Store()
        self.providers = providers if providers is not None else [OllamaProvider()]

    def chat(self, message: str, crew: str = "MARS") -> Reply:
        crew = crew_mod.get(crew)["id"]
        hit = run_skill(message, self.store)
        if hit:
            return Reply(hit[1], f"skill:{hit[0]}")
        for p in self.providers:
            if p.available():
                try:
                    return p.reply(message, crew)
                except Exception:
                    continue
        return Reply(FALLBACK, "fallback")

    def health(self) -> dict:
        return {
            "name": "shipcore",
            "providers": [{"name": p.name, "available": p.available()} for p in self.providers],
            "skills": [s.name for s in SKILLS],
            "storage": "local",
        }
