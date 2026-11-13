/* MARSAI voice: speech to text and text to speech.
 * Order of preference (all no-key):
 *   STT: ShipCore local Whisper  ->  browser SpeechRecognition  ->  typing
 *   TTS: ShipCore local Piper     ->  best available browser voice
 * Nothing here is required for navigation. Mic only starts on a click. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var o = null;                       // options from app.js
  var status = { stt: { available: false }, tts: { available: false, voices: {} } };
  var prefs = { speak: false, voice: 'auto', rate: 1 };
  var KEY = 'marsai.voice';
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); for (var k in saved) if (k in prefs) prefs[k] = saved[k]; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

  var micBtn, speakBtn, statusEl, selectEl, rateEl, engineEl;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var recording = null, rec = null, audioEl = null, voices = [];

  function setStatus(t) { statusEl.textContent = t; }
  function fetchT(url, opts, ms) {
    var c = new AbortController(), id = setTimeout(function () { c.abort(); }, ms);
    opts = opts || {}; opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(id); });
  }

  /* ---------- engine status ---------- */
  function sttEngine() { return status.stt.available && canRecord ? 'shipcore' : (SR ? 'browser' : null); }
  function ttsEngine() { return status.tts.available ? 'shipcore' : (canSpeak ? 'browser' : null); }
  function render() {
    var s = sttEngine(), t = ttsEngine();
    var label = { shipcore: 'LOCAL WHISPER', browser: 'BROWSER', null: 'NONE' };
    var tl = { shipcore: 'LOCAL PIPER', browser: 'BROWSER', null: 'NONE' };
    engineEl.textContent = 'LISTEN: ' + label[s] + ' | SPEAK: ' + tl[t];
    $('#voice-state').textContent = (s || t) ? 'READY' : 'UNAVAILABLE';
    $('#node-voice').textContent = (s || t) ? (s === 'shipcore' || t === 'shipcore' ? 'LOCAL' : 'BROWSER') : 'UNAVAILABLE';
    micBtn.hidden = !s;
    speakBtn.hidden = !t;
    $('#voice-settings').hidden = !(s || t);
    fillVoices();
  }
  function refresh() {
    if (!o) return Promise.resolve();
    return fetchT(o.base + '/voice/status', {}, 1500)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { status = d; }, function () { status = { stt: { available: false }, tts: { available: false, voices: {} } }; })
      .then(render);
  }

  /* ---------- browser TTS voice choice ---------- */
  var NATURAL = /natural|neural|online|enhanced|premium/i;
  var MALE = /daniel|alan|ryan|guy|david|george|james|arthur|oliver|male|fred|alex|rishi/i;
  var FEMALE = /samantha|ava|serena|jenny|aria|sonia|libby|susan|zira|karen|moira|tessa|female|kate|martha/i;
  var PROFILE = { MARS: { pitch: 0.92, rate: 1.0, like: MALE }, VENUS: { pitch: 1.08, rate: 1.03, like: FEMALE } };
  function score(v, crew) {
    var s = 0, n = v.name || '';
    if (/^en/i.test(v.lang)) s += 40; else return -1;
    if (/en[-_]GB/i.test(v.lang)) s += 6;
    if (NATURAL.test(n)) s += 50;
    if (/google/i.test(n)) s += 20;
    if (PROFILE[crew].like.test(n)) s += 25;
    if (!v.localService) s += 5;
    if (/espeak|compact|robot/i.test(n)) s -= 40;
    return s;
  }
  function pickVoice(crew) {
    if (prefs.voice && prefs.voice !== 'auto') {
      for (var i = 0; i < voices.length; i++) if (voices[i].voiceURI === prefs.voice) return voices[i];
    }
    var best = null, bs = -1;
    voices.forEach(function (v) { var s = score(v, crew); if (s > bs) { bs = s; best = v; } });
    return best;
  }
  function fillVoices() {
    if (!canSpeak) return;
    voices = speechSynthesis.getVoices() || [];
    var crew = o ? o.getCrew() : 'MARS';
    var list = voices.map(function (v) { return { v: v, s: score(v, crew) }; }).filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; });
    selectEl.textContent = '';
    var auto = document.createElement('option'); auto.value = 'auto';
    var best = pickVoice(crew);
    auto.textContent = 'Auto (best for ' + crew + (best ? ': ' + best.name : '') + ')';
    selectEl.appendChild(auto);
    list.forEach(function (x) {
      var op = document.createElement('option'); op.value = x.v.voiceURI; op.textContent = x.v.name + ' (' + x.v.lang + ')';
      selectEl.appendChild(op);
    });
    selectEl.value = prefs.voice;
    if (selectEl.value !== prefs.voice) selectEl.value = 'auto';
    selectEl.disabled = status.tts.available;   // local Piper voices are assigned per crew
    rateEl.value = prefs.rate;
  }

  /* ---------- speak ---------- */
  function stopAll() {
    if (canSpeak) speechSynthesis.cancel();
    if (audioEl) { try { audioEl.pause(); } catch (e) {} audioEl = null; }
  }
  function sentences(text) {
    var parts = text.replace(/\s+/g, ' ').match(/[^.!?\n]+[.!?]*/g) || [text], out = [], cur = '';
    parts.forEach(function (p) { if ((cur + p).length > 180 && cur) { out.push(cur); cur = p; } else cur += p; });
    if (cur.trim()) out.push(cur);
    return out;
  }
  function speakBrowser(text) {
    if (!canSpeak) return;
    var crew = o.getCrew(), p = PROFILE[crew] || PROFILE.MARS, v = pickVoice(crew);
    sentences(text).forEach(function (part) {
      var u = new SpeechSynthesisUtterance(part.trim());
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = navigator.language || 'en-GB';
      u.pitch = p.pitch; u.rate = Math.min(1.5, Math.max(0.6, p.rate * prefs.rate));
      speechSynthesis.speak(u);
    });
  }
  function speak(text) {
    if (!prefs.speak || !o) return;
    stopAll();
    if (status.tts.available) {
      fetchT(o.base + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, crew: o.getCrew() }) }, 20000)
        .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) {
          audioEl = new Audio(URL.createObjectURL(b));
          audioEl.playbackRate = prefs.rate;
          audioEl.onended = function () { URL.revokeObjectURL(audioEl && audioEl.src); };
          return audioEl.play();
        })
        .catch(function () { status.tts.available = false; render(); speakBrowser(text); });
    } else speakBrowser(text);
  }

  /* ---------- listen: ShipCore local Whisper (push to talk, auto-stop on silence) ---------- */
  function micEnd(msg) {
    micBtn.setAttribute('aria-pressed', 'false'); micBtn.classList.remove('listening'); micBtn.textContent = 'MIC';
    if (msg) setStatus(msg);
  }
  function micStart() { micBtn.setAttribute('aria-pressed', 'true'); micBtn.classList.add('listening'); micBtn.textContent = 'STOP'; }
  function permMsg(e) {
    var n = e && (e.name || e.error);
    if (n === 'NotAllowedError' || n === 'not-allowed' || n === 'SecurityError') return 'Microphone blocked. Allow microphone access in your browser site settings, then try again.';
    if (n === 'NotFoundError' || n === 'audio-capture') return 'No microphone found.';
    if (n === 'network') return 'Your browser speech service is unreachable. Run ShipCore voice for private offline transcription (docs/VOICE.md), or type.';
    if (n === 'no-speech') return 'No speech heard. Try again closer to the mic.';
    return 'Voice input failed' + (n ? ' (' + n + ')' : '') + '. Typing still works.';
  }
  function listenLocal() {
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var chunks = [], mime = '';
      ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].some(function (m) { if (MediaRecorder.isTypeSupported(m)) { mime = m; return true; } });
      var mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      var ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser();
      an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
      var buf = new Uint8Array(an.fftSize), heard = false, quietSince = Date.now(), started = Date.now(), cancelled = false;
      var timer = setInterval(function () {
        an.getByteTimeDomainData(buf);
        var sum = 0; for (var i = 0; i < buf.length; i++) { var d = (buf[i] - 128) / 128; sum += d * d; }
        var rms = Math.sqrt(sum / buf.length), now = Date.now();
        if (rms > 0.02) { heard = true; quietSince = now; }
        if ((heard && now - quietSince > 1400) || now - started > 30000 || (!heard && now - started > 9000)) stop();
      }, 100);
      function stop() { if (mr.state !== 'inactive') mr.stop(); }
      recording = { stop: stop, cancel: function () { cancelled = true; stop(); } };
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        clearInterval(timer); stream.getTracks().forEach(function (t) { t.stop(); }); try { ctx.close(); } catch (e) {}
        recording = null;
        if (cancelled) { micEnd('Voice input cancelled.'); return; }
        if (!heard) { micEnd('No speech heard. Try again closer to the mic.'); return; }
        micEnd('Transcribing locally...');
        var blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' });
        fetchT(o.base + '/stt', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }, 60000)
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (d) {
            if (!d.text) { setStatus('Could not make out any words. Try again.'); return; }
            setStatus('Heard: ' + d.text); o.onTranscript(d.text);
          })
          .catch(function () { setStatus('Local transcription failed. Is ShipCore running? Falling back to browser speech if available.'); refresh(); });
      };
      mr.start(); micStart(); setStatus('Listening... speak now (stops automatically after you pause).');
    }).catch(function (e) { micEnd(permMsg(e)); });
  }

  /* ---------- listen: browser SpeechRecognition (fallback) ---------- */
  function listenBrowser() {
    rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    var got = false;
    rec.onresult = function (e) {
      var said = e.results[0][0].transcript.trim();
      if (said) { got = true; setStatus('Heard: ' + said); o.onTranscript(said); }
    };
    rec.onerror = function (e) { got = true; micEnd(permMsg(e)); };
    rec.onend = function () { recording = null; micEnd(got ? null : 'No speech heard. Try again.'); };
    try { rec.start(); recording = { stop: function () { rec.stop(); }, cancel: function () { got = true; rec.abort(); } }; micStart(); setStatus('Listening (browser speech)...'); }
    catch (e) { micEnd('Could not start the microphone.'); }
  }
  function toggleMic() {
    if (recording) { recording.stop(); return; }
    var e = sttEngine();
    if (e === 'shipcore') listenLocal(); else if (e === 'browser') listenBrowser(); else setStatus('Voice input is not available here. Typing still works.');
  }

  /* ---------- wiring ---------- */
  function init(opts) {
    o = opts;
    micBtn = $('#mic'); speakBtn = $('#speak-toggle'); statusEl = $('#voice-status');
    selectEl = $('#voice-select'); rateEl = $('#voice-rate'); engineEl = $('#voice-engine');
    micBtn.addEventListener('click', toggleMic);
    speakBtn.setAttribute('aria-pressed', prefs.speak);
    speakBtn.textContent = 'SPEAK REPLIES: ' + (prefs.speak ? 'ON' : 'OFF');
    speakBtn.addEventListener('click', function () {
      prefs.speak = !prefs.speak; save();
      speakBtn.setAttribute('aria-pressed', prefs.speak);
      speakBtn.textContent = 'SPEAK REPLIES: ' + (prefs.speak ? 'ON' : 'OFF');
      if (!prefs.speak) stopAll(); else speak('Voice online.');
    });
    selectEl.addEventListener('change', function () { prefs.voice = selectEl.value; save(); if (prefs.speak) speak('Voice changed.'); });
    rateEl.addEventListener('input', function () { prefs.rate = parseFloat(rateEl.value) || 1; save(); });
    $('#voice-test').addEventListener('click', function () { var was = prefs.speak; prefs.speak = true; speak('Systems nominal. Ready when you are, Captain.'); prefs.speak = was; });
    if (canSpeak) { speechSynthesis.onvoiceschanged = fillVoices; }
    render(); refresh();
  }
  function stop() { if (recording) recording.cancel(); stopAll(); }
  window.MarsVoice = { init: init, speak: speak, stop: stop, refresh: refresh, refreshVoices: fillVoices };
})();
