"""ShipCore voice engine: local speech-to-text and text-to-speech. No key, offline.

- Speech to text: faster-whisper (Whisper models), with built-in silence filtering.
- Text to speech: Piper neural voices (ONNX), one voice per crew member.

Both are optional extras (`pip install -e ".[voice]"`). Everything runs on this
machine. Voice models are downloaded once by `python -m shipcore voice-setup`;
each Piper voice has its own license in its model card on Hugging Face.
"""
from __future__ import annotations

import io
import os
import threading
import urllib.request
import wave
from pathlib import Path

from .storage import default_home

MAX_TTS_CHARS = 600
MAX_AUDIO_BYTES = 10 * 1024 * 1024
# Biases Whisper toward MARSAI commands and names (improves command accuracy).
STT_PROMPT = (
    "MARSAI commands: new mission, my missions, complete mission, notes, open crew, "
    "ShipCore, Mars, Venus, Theme Lab, Roadmap, full screen, power off."
)

PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
# crew -> (voice name, path inside the piper-voices repo)
CREW_VOICES = {
    "MARS": ("en_GB-alan-medium", "en/en_GB/alan/medium/en_GB-alan-medium"),
    "VENUS": ("en_GB-jenny_dioco-medium", "en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium"),
}


def _have(module: str) -> bool:
    import importlib.util

    try:
        return importlib.util.find_spec(module) is not None
    except (ImportError, ValueError):
        return False


class VoiceEngine:
    def __init__(self, home: Path | None = None) -> None:
        self.home = Path(home) if home else default_home()
        self.voice_dir = self.home / "voices"
        self.stt_model_name = os.environ.get("MARSAI_STT_MODEL", "base.en")
        self.stt_language = os.environ.get("MARSAI_STT_LANG", "en") or None
        self._whisper = None
        self._piper: dict[str, object] = {}
        self._stt_lock = threading.Lock()
        self._tts_lock = threading.Lock()

    # ---- availability ----
    def stt_available(self) -> bool:
        return _have("faster_whisper")

    def installed_voices(self) -> dict[str, str]:
        out = {}
        for crew, (name, _path) in CREW_VOICES.items():
            if (self.voice_dir / f"{name}.onnx").exists() and (self.voice_dir / f"{name}.onnx.json").exists():
                out[crew] = name
        return out

    def tts_available(self) -> bool:
        return _have("piper") and bool(self.installed_voices())

    def status(self) -> dict:
        voices = self.installed_voices()
        return {
            "stt": {"available": self.stt_available(), "engine": "faster-whisper", "model": self.stt_model_name},
            "tts": {"available": self.tts_available(), "engine": "piper", "voices": voices},
        }

    # ---- speech to text ----
    def transcribe(self, audio: bytes) -> str:
        if not self.stt_available():
            raise RuntimeError("speech-to-text is not installed (pip install -e '.[voice]')")
        if not audio or len(audio) > MAX_AUDIO_BYTES:
            raise ValueError("audio missing or too large")
        with self._stt_lock:
            if self._whisper is None:
                from faster_whisper import WhisperModel

                self._whisper = WhisperModel(self.stt_model_name, device="cpu", compute_type="int8")
            segments, _info = self._whisper.transcribe(
                io.BytesIO(audio), language=self.stt_language, vad_filter=True, beam_size=1,
                initial_prompt=STT_PROMPT,
            )
            return " ".join(s.text.strip() for s in segments).strip()

    # ---- text to speech ----
    def synthesize(self, text: str, crew: str = "MARS") -> bytes:
        crew = crew.upper() if crew.upper() in CREW_VOICES else "MARS"
        voices = self.installed_voices()
        if not _have("piper") or crew not in voices:
            raise RuntimeError("text-to-speech voice not installed (python -m shipcore voice-setup)")
        text = " ".join(text.split())[:MAX_TTS_CHARS]
        if not text:
            raise ValueError("nothing to say")
        with self._tts_lock:
            voice = self._piper.get(crew)
            if voice is None:
                from piper import PiperVoice

                voice = PiperVoice.load(str(self.voice_dir / f"{voices[crew]}.onnx"))
                self._piper[crew] = voice
            buf = io.BytesIO()
            with wave.open(buf, "wb") as wav:
                voice.synthesize_wav(text, wav)
            return buf.getvalue()


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as fh:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
    os.replace(tmp, dest)


def setup(home: Path | None = None, stt_model: str | None = None) -> None:
    """Download the Whisper model and one Piper voice per crew member."""
    eng = VoiceEngine(home)
    print("MARSAI voice setup (everything runs locally after download).")
    print("Piper voices come from huggingface.co/rhasspy/piper-voices. Each voice has its own license")
    print("in its model card; review it before redistributing any audio you generate.")
    for crew, (name, path) in CREW_VOICES.items():
        for ext in (".onnx", ".onnx.json"):
            dest = eng.voice_dir / f"{name}{ext}"
            if dest.exists():
                continue
            print(f"  downloading {crew} voice {name}{ext} ...")
            _download(f"{PIPER_BASE}/{path}{ext}", dest)
    if eng.stt_available():
        from faster_whisper import WhisperModel

        model = stt_model or eng.stt_model_name
        print(f"  preparing speech-to-text model {model} ...")
        WhisperModel(model, device="cpu", compute_type="int8")
    else:
        print("  faster-whisper is not installed; run: pip install -e '.[voice]'")
    print("Done. Start ShipCore with: python -m shipcore")
