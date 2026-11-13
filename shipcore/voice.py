"""ShipCore voice engine: local speech-to-text and text-to-speech. No key, offline.

- Speech to text: faster-whisper (Whisper models), with built-in silence filtering.
- Text to speech: Piper neural voices (ONNX). One 109-speaker model (VCTK) gives each of the
  20 crew members a distinct voice, matched to gender and personality in crew.json.

Both are optional extras (`pip install -e ".[voice]"`). Everything runs on this
machine. Voice models are downloaded once by `python -m shipcore voice-setup`;
the voice model's license (VCTK-derived, see its model card on Hugging Face) applies.
"""
from __future__ import annotations

import io
import os
import threading
import urllib.request
import wave
from pathlib import Path

from . import crew as crew_mod
from .storage import default_home

MAX_TTS_CHARS = 600
MAX_AUDIO_BYTES = 10 * 1024 * 1024
# Biases Whisper toward MARSAI commands and names (improves command accuracy).
STT_PROMPT = (
    "MARSAI commands: new mission, my missions, complete mission, notes, open crew, "
    "ShipCore, Mars, Venus, Theme Lab, Roadmap, full screen, power off."
)

PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
# One multi-speaker model (VCTK, 109 speakers) gives every crew member a distinct voice.
PIPER_MODEL = "en_GB-vctk-medium"
PIPER_PATH = "en/en_GB/vctk/medium/en_GB-vctk-medium"


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

    def model_installed(self) -> bool:
        return (self.voice_dir / f"{PIPER_MODEL}.onnx").exists() and (self.voice_dir / f"{PIPER_MODEL}.onnx.json").exists()

    def installed_voices(self) -> dict[str, str]:
        """crew id -> Piper speaker for every crew member (empty if the model is missing)."""
        if not self.model_installed():
            return {}
        return {c["id"]: c["voice"]["piper_speaker"] for c in crew_mod.load()["crew"]}

    def tts_available(self) -> bool:
        return _have("piper") and self.model_installed()

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
        c = crew_mod.get(crew)
        if not _have("piper") or not self.model_installed():
            raise RuntimeError("text-to-speech voice not installed (python -m shipcore voice-setup)")
        text = " ".join(text.split())[:MAX_TTS_CHARS]
        if not text:
            raise ValueError("nothing to say")
        with self._tts_lock:
            voice = self._piper.get("model")
            if voice is None:
                from piper import PiperVoice

                voice = PiperVoice.load(str(self.voice_dir / f"{PIPER_MODEL}.onnx"))
                self._piper["model"] = voice
            from piper import SynthesisConfig

            spk_map = voice.config.speaker_id_map or {}
            cfg = SynthesisConfig(speaker_id=spk_map.get(c["voice"]["piper_speaker"], 0), length_scale=c["voice"]["pace"])
            buf = io.BytesIO()
            with wave.open(buf, "wb") as wav:
                voice.synthesize_wav(text, wav, syn_config=cfg)
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
    """Download the Whisper model and the multi-speaker Piper voice model (all 20 crew voices)."""
    eng = VoiceEngine(home)
    print("MARSAI voice setup (everything runs locally after download).")
    print("The crew voice model comes from huggingface.co/rhasspy/piper-voices (en_GB-vctk-medium,")
    print("trained on the VCTK corpus). Review its model card and license before redistributing audio.")
    for ext in (".onnx", ".onnx.json"):
        dest = eng.voice_dir / f"{PIPER_MODEL}{ext}"
        if dest.exists():
            continue
        print(f"  downloading crew voice model {PIPER_MODEL}{ext} ...")
        _download(f"{PIPER_BASE}/{PIPER_PATH}{ext}", dest)
    if eng.stt_available():
        from faster_whisper import WhisperModel

        model = stt_model or eng.stt_model_name
        print(f"  preparing speech-to-text model {model} ...")
        WhisperModel(model, device="cpu", compute_type="int8")
    else:
        print("  faster-whisper is not installed; run: pip install -e '.[voice]'")
    print("Done. Start ShipCore with: python -m shipcore")
