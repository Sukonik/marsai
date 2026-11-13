# MARSAI Voice

Voice is optional everywhere. Typing always works, and no navigation depends on voice.

## How it works

| Direction | Best (local, private, offline) | Fallback (browser, no key) | Last resort |
| --- | --- | --- | --- |
| **Listen** (speech to text) | ShipCore with **Whisper** via faster-whisper | Browser SpeechRecognition (some browsers send audio to their own provider) | Typing |
| **Speak** (text to speech) | ShipCore with **Piper** neural voices, one per crew member | Best available browser voice, chosen per crew, adjustable in Voice Settings | Silent |

The HUD shows which engine is active (for example `LISTEN: LOCAL WHISPER | SPEAK: LOCAL PIPER`) and shows live voice status under the console: listening, transcribing, what it heard, or a plain-language reason it failed (blocked microphone, no microphone, unreachable browser speech service).

### Listening

Click **MIC** and speak. With local Whisper the HUD records from your microphone, stops by itself about 1.4 seconds after you stop talking (or after 30 seconds), sends the clip to ShipCore on this machine, and runs the transcript as a command. Whisper is primed with MARSAI vocabulary (new mission, open crew, ShipCore, Mars, Venus) and speech punctuation is normalized, so "New mission, learn baking." works.

### Speaking

Turn on **SPEAK REPLIES** to hear replies. Mars and Venus have separate voices: Piper voices `en_GB-alan-medium` and `en_GB-jenny_dioco-medium` (calm British register, steady for Mars, warmer for Venus). Without Piper, the HUD picks the most natural browser voice it can find (neural or online voices rank first, robotic or compact voices are avoided) and applies a per-crew pitch and pace. **Voice Settings** lets the captain choose a specific browser voice, change speed, and test it. Settings persist in the browser.

## Set it up

```bash
pip install -e ".[voice]"
python -m shipcore voice-setup      # downloads Piper voices and the Whisper model once
python -m shipcore
```

- Default speech model is `base.en` (about 140 MB, English). For other languages set `MARSAI_STT_MODEL=small` (or larger) and `MARSAI_STT_LANG=` (empty for auto-detect). Larger models are slower but more accurate.
- CPU only is fine: a short command transcribes in about a second on a laptop CPU with `tiny.en` or `base.en`.
- Voices live in `~/.marsai/voices` (override with `MARSAI_HOME`).
- **Voice licenses.** Each Piper voice has its own license in its model card on [huggingface.co/rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices). Review it before redistributing generated audio or shipping a voice with a product.

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
3. More Piper voices per crew member, selectable in Voice Settings
4. Higher-quality or expressive TTS engines (see the reference notes above for candidates), local only
