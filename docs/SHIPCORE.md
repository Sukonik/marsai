# ShipCore (V1.1 track)

ShipCore is MARSAI's local companion service. It runs on the captain's own machine, needs **no API key**, and the HUD connects to it automatically when it is running. Without it, the HUD runs on its **onboard core** (time, status, notes, missions, jokes, stored in the browser), so it is fully usable on its own.

## Run it

```bash
pip install -e ".[dev]"
python -m shipcore
```

ShipCore listens on `http://127.0.0.1:8765` only. It refuses non-loopback binds unless `--unsafe-bind` is passed. Then power on the HUD: the status badge changes from **ONBOARD CORE** to **SHIPCORE** (or **SHIPCORE + LOCAL AI** when a local model is available). With ShipCore connected, notes and missions live in ShipCore (`~/.marsai`); the onboard core keeps its own browser copy. Type `connect` in the HUD console to retry.

Optional extras: `pip install -e ".[status]"` adds memory usage to the `status` skill.

## Intelligence layers (all no-key)

| Layer | What it is | Status |
| --- | --- | --- |
| 1. Skills | Deterministic, original, local-only skills: `help`, `time`, `status`, `notes`, `new mission`, `my missions`, `complete mission N`, `joke` | Built |
| 2. Local model | [Ollama](https://ollama.com) on this machine (`MARSAI_OLLAMA_MODEL`, default `llama3.2`) for open conversation | Built, used only if Ollama is running |
| 3. Local voice | Whisper (faster-whisper) speech-to-text and Piper neural voices, one per crew member, fully offline. See [VOICE.md](VOICE.md) | Built (`pip install -e ".[voice]"`, `python -m shipcore voice-setup`) |
| 4. Browser voice | Web Speech API fallback when ShipCore voice is not running. No key; some browsers send audio to their own speech provider, so it is opt-in per click | Built |
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
| [page-agent (alibaba)](https://github.com/alibaba/page-agent) | MIT | In-page agent that operates a page's UI from natural language using text DOM processing (no screenshots); drop-in copilot idea; MCP exposure | Hosted demo LLM endpoint; any API key placed in client-side JS is visible to visitors |
| [GEPA (gepa-ai)](https://github.com/gepa-ai/gepa) | MIT | Optimize prompts by reflecting on execution traces plus Pareto search; small adapter interface | Needs an LLM; no stated local-only mode, so run only dev-time with a local model |
| [browser-use](https://github.com/browser-use/browser-use) | MIT | Persistent REPL state, typed outputs, `sensitive_data` redaction, domain allow and deny lists, per-run workspace | Cloud stealth and CAPTCHA solving, unauthenticated local debugging port, feedback telemetry, Python 3.11+ weight |
| [Lightpanda](https://github.com/lightpanda-io/browser) | AGPL-3.0 | Lightweight headless browser for page-to-markdown extraction; `--obey-robots`; replayable sessions | AGPL copyleft (never bundle or modify and serve), telemetry on by default, unsigned nightly binaries |
| [Obscura (h4ckf0r0day)](https://github.com/h4ckf0r0day/obscura) | Apache-2.0 | Private-network fetch blocking by default (a good safety idea) | Built-in anti-detection and fingerprint randomization (`--stealth`); adopt nothing |
| [CloakBrowser (CloakHQ)](https://github.com/CloakHQ/CloakBrowser) | wrapper MIT, closed binary | Nothing | Stated purpose is bot-detection evasion, closed unreviewed binary, license key, vendor contact on launch; do not use |

## Web and agent tooling policy

MARSAI may later offer opt-in web errands (read a page, summarize it, fill a form for the captain). Rules, fixed now so they shape the design:

- **Respect the web.** No stealth, fingerprint spoofing, CAPTCHA bypass, or other bot-detection evasion, and no tools whose purpose is evasion. Honor robots.txt and site terms.
- **Opt-in and visible.** Web skills are off by default, run only after the captain enables them, and show every request in the system log.
- **Read-only first.** Domain allowlist per skill; no logins, payments, or posting without an explicit per-action confirmation.
- **Never bundle copyleft or unreviewed binaries.** AGPL tools such as Lightpanda stay optional, user-installed, external processes. No closed or unsigned browser binaries.
- **Block private networks** by default (borrowed from Obscura) so a web skill cannot reach the captain's LAN or local services.
- **No keys in the page.** Client-side JavaScript never holds provider keys; a hosted LLM call goes through ShipCore only if the captain adds their own key.

Where each reference fits: page-agent's idea becomes a HUD copilot that operates the HUD itself (our own small code, no dependency); GEPA is a dev-time tool for tuning crew persona and routing prompts against our tests using a local model; browser-use is a concept source for the future web-errand skill; Lightpanda is a candidate external page-to-markdown fetcher. Obscura and CloakBrowser are not used.

## Next steps for V1.x

1. Captain Profile and crew memory as local markdown files (javis-os style, git-friendly), shown in the HUD
2. Skill manifests with permission tiers (read, write-local, system); V1.x ships only the first two
3. Offline voice (Vosk, Piper) and an in-browser model so the hosted site works without Python
4. Wikipedia and web lookups as an explicit, opt-in network skill
5. Crew personas as data files, not code
6. HUD copilot: natural-language control of the HUD's own modules (page-agent idea), local model optional
7. Dev-time prompt tuning with GEPA against a persona test set, using a local model
