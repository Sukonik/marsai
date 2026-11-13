# MARSAI Voice

Voice is optional everywhere. Typing always works, and no navigation depends on voice.

## How it works

| Direction | Best (local, private, offline) | Fallback (browser, no key) | Last resort |
| --- | --- | --- | --- |
| **Listen** (speech to text) | ShipCore with **Whisper** via faster-whisper | Browser SpeechRecognition (some browsers send audio to their own provider) | Typing |
| **Speak** (text to speech) | ShipCore with **Piper** neural voices, one per crew member | Best available browser voice, chosen per crew, adjustable in Voice Settings | Silent |

The HUD shows which engine is active (for example `LISTEN: LOCAL WHISPER | SPEAK: LOCAL PIPER`) and shows live voice status under the console: listening, transcribing, what it heard, or a plain-language reason it failed (blocked microphone, no microphone, unreachable browser speech service).

### Listening: press, wait for SPEAK NOW, talk, release

Speech to speech is the default. The talk disc at the left of the message line is a press-to-talk key:

1. **Press and hold** the disc (or hold **Space** when you are not typing). The ring shows **STARTING**, then **SPEAK NOW** with a rising chime: the mic is live.
2. **Talk.** The ring changes to **LISTENING** (and the marker spins) when it hears you, and the waveform follows your voice.
3. **Release** to send. A falling chime marks the end and the ring shows **THINKING**. The reply is spoken in the crew member's voice (**SPEAKING**).
4. A quick **tap** instead talks until you pause (about 1.4 seconds of silence), and a second tap sends right away. Pressing the disc while a reply is playing interrupts it.

Local Whisper (ShipCore) is used when it is running; otherwise the browser's speech recognition. Voice replies are on by default; turn them off with the **Voice replies** switch in Subsystems. Volume and Voice speed are sliders in Subsystems. The mic only starts when you press it.

### Speaking: every crew member has their own voice

The README's framework says voices belong to the device and are separate from personality and intelligence. MARSAI follows it:

1. **Recorded phrases** (the captain's own voice): in Voice Settings, record a greeting, confirmation, warning, and mission celebration for any crew member. They are stored only on this device (IndexedDB) and play instead of the spoken reply for that event. Record only your own voice.
2. **Local crew voices** (ShipCore + Piper): one 109-speaker neural model (`en_GB-vctk-medium`) gives **all 20 crew members a distinct voice**, matched to gender, pitch, and pace from their personality in `shipcore/crew.json`:

| Crew | Role | Voice | Piper speaker (pitch) | Pace |
| --- | --- | --- | --- | --- |
| 🔴 Mars | Mediator | male | p360 (93 Hz) | slower |
| 🟡 Venus | Guardian | female | p269 (184 Hz) | even |
| 🥊 Pluto | Rival | male | p316 (92 Hz) | brisk |
| ⚡ Mercury | Prodigy | male | p259 (116 Hz) | brisk |
| 📚 Atlas | Scholar | male | p226 (109 Hz) | slower |
| 🌞 Sirius | Optimist | male | p363 (103 Hz) | even |
| 🧭 Neptune | Explorer | male | p275 (106 Hz) | brisk |
| 🪨 Saturn | Veteran | male | p245 (88 Hz) | slower |
| 🛡️ Oberon | Guardian | male | p364 (96 Hz) | slower |
| 🎖️ Jupiter | Commander | male | p256 (88 Hz) | slower |
| 🤝 Pollux | Companion | male | p271 (118 Hz) | even |
| 🃏 Eris | Maverick | female | p228 (197 Hz) | brisk |
| 🔥 Luna | Rebel | female | s5 (210 Hz) | even |
| ⚔️ Bellatrix | Warrior | female | p236 (230 Hz) | brisk |
| 📋 Vesta | Officer | female | p265 (190 Hz) | even |
| 🕊️ Europa | Diplomat | female | p306 (182 Hz) | slower |
| 🛠️ Vega | Engineer | female | p323 (207 Hz) | brisk |
| 🏹 Rhea | Guardian | female | p333 (179 Hz) | slower |
| 👑 Polaris | Commander | female | p231 (175 Hz) | slower |
| 🚀 Io | Ace | female | p329 (204 Hz) | brisk |

3. **Device voices** (no ShipCore): the HUD picks the most natural matching browser or OS voice for each crew member (neural and online voices first, robotic voices avoided), spreads crew members across the best matches, and tunes pitch and pace per personality. **Voice Settings** lets the captain choose a different device voice for each crew member; the choice is saved per device. Voice quality depends on what the device has installed.
4. **Future custom speech**: consent-based adapters (see policy below).

Turn on **SPEAK REPLIES** to hear replies. Speaker labels always show the sigil and name (for example `🥊 Pluto`), as in the README.

## Set it up

```bash
pip install -e ".[voice]"
python -m shipcore voice-setup      # downloads the crew voice model (77 MB) and Whisper (140 MB) once
python -m shipcore
```

- Default speech model is `base.en` (about 140 MB, English). For other languages set `MARSAI_STT_MODEL=small` (or larger) and `MARSAI_STT_LANG=` (empty for auto-detect). Larger models are slower but more accurate.
- CPU only is fine: a short command transcribes in about a second on a laptop CPU with `tiny.en` or `base.en`.
- The voice model lives in `~/.marsai/voices` (override with `MARSAI_HOME`).
- **Voice license.** The crew voice model is trained on the VCTK corpus (distributed under CC BY 4.0; confirm in the model card on [huggingface.co/rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)). Review it before redistributing generated audio or shipping the voices in a product.

## Voice policy

- **No voice cloning in V1.x.** Cloning a real person's voice needs the explicit consent of that person, clear labeling, and a license review of the model. MARSAI crew voices are stock voices, not imitations of real people or of characters from other franchises.
- **Local first.** Audio recorded for local transcription goes only to `127.0.0.1` and is not stored.
- **Mic only on click.** Nothing listens in the background.
- **Never bundle** copyleft apps or closed binaries as part of MARSAI. Optional external tools are installed by the captain.

## Reference projects

Concepts only; no code copied.

| Project | License | Take | Leave |
| --- | --- | --- | --- |
| [Handy (cjpais)](https://github.com/cjpais/Handy) | MIT | Push-to-talk and toggle modes; Whisper and Parakeet locally; silence filtering (VAD) before transcription; manual model install; a hook that pipes audio to a transcriber | The Handy name and branding are not open; desktop paste-into-any-app focus is not our use case |
| [VoiceStudio (debpalash)](https://github.com/debpalash/VoiceStudio) | AGPL-3.0 | Local API plus per-model license display in a model manager; a voice-reference-as-profile idea for the future | AGPL (never bundle), closed Pro build, `curl \| sh` installer, per-voice licenses unstated, cloning governed only by an honor-system line |
| [Voicebox (jamiepine)](https://github.com/jamiepine/voicebox) | MIT code; model licenses vary and are not stated per engine | Local REST API (`/generate`, `/speak`, `/transcribe`, voice profiles), per-client voice binding, a visible "speaking" state, an MCP tool so an agent can speak, a serial generation queue, chunking with crossfade. Its engine list shows good small local TTS candidates (for example Kokoro at 82M parameters and Chatterbox Turbo at 350M) | Voice cloning (see policy), a heavy desktop app, no Linux binaries, upstream model licenses unverified; has a `RESPONSIBLE_USE.md` we have not reviewed |
| [chatterbox-tts-api (travisvn)](https://github.com/travisvn/chatterbox-tts-api) | AGPL-3.0 (never bundle); model license not stated | The OpenAI-compatible speech API shape (`/v1/audio/speech`, SSE streaming events, a named voice library with per-voice language) | GPU recommended, AGPL network clause, `curl \| sh` installer tip, no consent or ethics text, built for cloned voices |

## Next options

1. Parakeet or a larger Whisper model as a selectable speech engine
1. A higher-quality local TTS engine behind the same `/tts` endpoint (Kokoro or Chatterbox Turbo are candidates; verify each model's license first), keeping Piper as the lightweight default
1. An OpenAI-compatible `/v1/audio/speech` alias on ShipCore so other local tools can reuse crew voices
1. A visible "speaking" state in the HUD (Voicebox idea)
2. A "wake word" hold-to-talk key, never always-on listening
3. Per-crew voice selection among Piper speakers in Voice Settings, and language packs for non-English crew voices
4. Higher-quality or expressive TTS engines (see the reference notes above for candidates), local only
