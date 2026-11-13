# ShipCore (V1.1 track)

ShipCore is MARSAI's local companion service. It runs on the captain's own machine, needs **no API key**, and the HUD connects to it automatically when it is running. Without it, the HUD stays in **LOCAL DEMO**.

## Run it

```bash
pip install -e ".[dev]"
python -m shipcore
```

ShipCore listens on `http://127.0.0.1:8765` only. It refuses non-loopback binds unless `--unsafe-bind` is passed. Then power on the HUD: the status badge changes from **LOCAL DEMO** to **SHIPCORE LOCAL** (or **SHIPCORE + LOCAL AI** when a local model is available). Type `connect` in the HUD console to retry.

Optional extras: `pip install -e ".[status]"` adds memory usage to the `status` skill.

## Intelligence layers (all no-key)

| Layer | What it is | Status |
| --- | --- | --- |
| 1. Skills | Deterministic, original, local-only skills: `help`, `time`, `status`, `notes`, `new mission`, `my missions`, `complete mission N`, `joke` | Built |
| 2. Local model | [Ollama](https://ollama.com) on this machine (`MARSAI_OLLAMA_MODEL`, default `llama3.2`) for open conversation | Built, used only if Ollama is running |
| 3. Browser voice | Web Speech API in the HUD: mic input and spoken replies. No key. Some browsers send audio to their own speech provider, so it is opt-in per click | Built |
| 4. Offline voice | Vosk or whisper.cpp for speech-to-text, Piper for text-to-speech, fully local | Planned |
| 5. In-browser model | WebLLM or transformers.js so the Pages site can chat with no Python at all | Planned |
| 6. Bring your own key | Optional hosted providers behind the same `Provider` interface | Later, off by default |

Providers implement the `Provider` interface in `shipcore/providers/base.py`, so personality, voice, intelligence provider, and skills stay separate and the captain's journey survives provider changes.

## Security stance

- Loopback only; origin allowlist (`https://sukonik.github.io`, any `localhost` origin, plus `MARSAI_ALLOWED_ORIGINS`) so other websites cannot drive the service
- Skills never touch the shell, other applications, the network, or credentials
- Data stays in `MARSAI_HOME` (default `~/.marsai`) as plain JSON
- Voice or model output is never executed
- System control (power, keystrokes, app launching) is deliberately excluded from V1.x

## Browser notes

The HTTPS site talks to `http://127.0.0.1`. Chrome, Edge, and Firefox allow this (Chrome may ask for local network access permission). **Safari blocks it**, so use the local demo there or serve the site locally.

## Reference projects

Reviewed for concepts only. No code was copied, and none of these names appear in public MARSAI material.

| Project | License | Take | Leave |
| --- | --- | --- | --- |
| [J.A.R.V.I.S (BolisettySujith)](https://github.com/BolisettySujith/J.A.R.V.I.S) | MIT | Feature checklist: time, notes, jokes, system status, Wikipedia, schedules | Windows-only, hardcoded Gmail credentials, news and geocoding keys, PyAutoGUI system control |
| [Jarvis-Desktop-Voice-Assistant (kishanrajput23)](https://github.com/kishanrajput23/Jarvis-Desktop-Voice-Assistant) | MIT | Keyword-to-action table, per-language string tables, listen/parse/act/speak loop (our web version uses the browser Speech APIs) | Voice-triggered restart and shutdown, terminal-only UX |
| [javis-os (blogminhquy)](https://github.com/blogminhquy/javis-os) | MIT | Swappable "brain" separate from memory and skills; skills as plain markdown files; permission tiers; shared tool hub; memory consolidation with undoable git commits; task queue | Full-host agent rights, `curl \| sh` installs, auto-update, open admin signup, third-party brand names |

## Next steps for V1.x

1. Captain Profile and crew memory as local markdown files (javis-os style, git-friendly), shown in the HUD
2. Skill manifests with permission tiers (read, write-local, system); V1.x ships only the first two
3. Offline voice (Vosk, Piper) and an in-browser model so the hosted site works without Python
4. Wikipedia and web lookups as an explicit, opt-in network skill
5. Crew personas as data files, not code
