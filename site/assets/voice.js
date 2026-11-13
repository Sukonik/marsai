/* MARSAI voice. Voices belong to the device: each crew member can sound different on every
 * device without changing who they are.
 *   Listen (STT): ShipCore local Whisper -> browser SpeechRecognition -> typing
 *   Speak  (TTS): recorded phrases -> ShipCore local Piper (20 distinct crew voices)
 *                 -> best matching device voice, tuned per crew -> silent
 * Nothing here is required for navigation. The mic only starts on a click. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var o = null;
  var status = { stt: { available: false }, tts: { available: false, voices: {} } };
  var prefs = { speak: false, voices: {}, rate: 1 };
  var KEY = 'marsai.voice.v2';
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (typeof saved.speak === 'boolean') prefs.speak = saved.speak; if (saved.voices) prefs.voices = saved.voices; if (saved.rate) prefs.rate = saved.rate; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

  var micBtn, speakBtn, statusEl, selectEl, rateEl, engineEl;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var recording = null, rec = null, audioEl = null, voices = [];

  function crewId() { return o ? o.getCrew() : 'MARS'; }
  function crewData() { return (o && o.getCrewData && o.getCrewData()) || { id: 'MARS', name: 'Mars', sigil: '🔴', gender: 'm', voice: { pitch: .25, pace: 1 } }; }
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
    var tl = { shipcore: 'LOCAL CREW VOICES', browser: 'DEVICE VOICES', null: 'NONE' };
    engineEl.textContent = 'LISTEN: ' + label[s] + ' | SPEAK: ' + tl[t];
    $('#voice-state').textContent = (s || t) ? 'READY' : 'UNAVAILABLE';
    $('#node-voice').textContent = (s || t) ? (s === 'shipcore' || t === 'shipcore' ? 'LOCAL' : 'DEVICE') : 'UNAVAILABLE';
    micBtn.hidden = !s;
    speakBtn.hidden = !(t || phraseCount() > 0);
    $('#voice-settings').hidden = !(s || t || canRecord);
    fillVoices(); renderPhrases();
  }
  function refresh() {
    if (!o) return Promise.resolve();
    return fetchT(o.base + '/voice/status', {}, 1500)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { status = d; }, function () { status = { stt: { available: false }, tts: { available: false, voices: {} } }; })
      .then(render);
  }

  /* ---------- device (browser) voice choice, per crew member ---------- */
  var NATURAL = /natural|neural|online|enhanced|premium/i;
  var MALE = /daniel|alan|ryan|guy|david|george|james|arthur|oliver|male|fred|alex|rishi|thomas|mark|aaron|gordon|lee/i;
  var FEMALE = /samantha|ava|serena|jenny|aria|sonia|libby|susan|zira|karen|moira|tessa|female|kate|martha|fiona|allison|victoria|hazel|emma/i;
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function score(v, g) {
    var s = 0, n = v.name || '';
    if (/^en/i.test(v.lang)) s += 40; else return -1;
    if (/en[-_]GB/i.test(v.lang)) s += 6;
    if (NATURAL.test(n)) s += 50;
    if (/google/i.test(n)) s += 20;
    var isM = MALE.test(n), isF = FEMALE.test(n);
    if ((g === 'm' && isM) || (g === 'f' && isF)) s += 30;
    if ((g === 'm' && isF && !isM) || (g === 'f' && isM && !isF)) s -= 40;
    if (!v.localService) s += 5;
    if (/espeak|compact|robot/i.test(n)) s -= 40;
    return s;
  }
  function pickVoice() {
    var c = crewData(), uri = prefs.voices[c.id];
    if (uri) for (var i = 0; i < voices.length; i++) if (voices[i].voiceURI === uri) return voices[i];
    var ranked = voices.map(function (v) { return { v: v, s: score(v, c.gender) }; }).filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; });
    if (!ranked.length) return null;
    var top = ranked.filter(function (x) { return x.s >= ranked[0].s - 12; });
    return top[hash(c.id) % top.length].v;   // crew members spread across the best matching voices
  }
  function profile() {
    var c = crewData(), v = c.voice || {};
    var pitchRank = typeof v.pitch === 'number' ? v.pitch : .5, pace = v.pace || 1;
    return { pitch: 0.78 + 0.5 * pitchRank, rate: Math.min(1.4, Math.max(.65, (1 / pace) * prefs.rate)) };
  }
  function fillVoices() {
    if (!canSpeak || !selectEl) return;
    voices = speechSynthesis.getVoices() || [];
    var c = crewData();
    var list = voices.map(function (v) { return { v: v, s: score(v, c.gender) }; }).filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; });
    selectEl.textContent = '';
    var best = pickVoice(), auto = document.createElement('option'); auto.value = 'auto';
    auto.textContent = 'Auto' + (best ? ' (' + best.name + ')' : '');
    selectEl.appendChild(auto);
    list.forEach(function (x) {
      var op = document.createElement('option'); op.value = x.v.voiceURI; op.textContent = x.v.name + ' (' + x.v.lang + ')';
      selectEl.appendChild(op);
    });
    selectEl.value = prefs.voices[c.id] || 'auto';
    if (selectEl.value !== (prefs.voices[c.id] || 'auto')) selectEl.value = 'auto';
    selectEl.disabled = status.tts.available;     // local crew voices are assigned per crew
    rateEl.value = prefs.rate;
    $('#voice-crew').textContent = 'VOICE FOR ' + c.sigil + ' ' + c.name.toUpperCase() + (status.tts.available ? ' (LOCAL CREW VOICE)' : '');
  }

  /* ---------- recorded phrases (IndexedDB, per device and crew member) ---------- */
  var SLOTS = [['greeting', 'Greeting'], ['confirm', 'Confirmation'], ['warning', 'Warning'], ['celebrate', 'Mission celebration']];
  var db = null, phraseKeys = {};
  function openDb() {
    return new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      try {
        var r = indexedDB.open('marsai-voice', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('phrases'); };
        r.onsuccess = function () { db = r.result; res(db); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function tx(mode) { return db.transaction('phrases', mode).objectStore('phrases'); }
  function loadKeys() {
    return new Promise(function (res) {
      if (!db) return res();
      var q = tx('readonly').getAllKeys();
      q.onsuccess = function () { phraseKeys = {}; q.result.forEach(function (k) { phraseKeys[k] = true; }); res(); };
      q.onerror = function () { res(); };
    });
  }
  function phraseCount() { var n = 0, p = crewId() + ':'; for (var k in phraseKeys) if (k.indexOf(p) === 0) n++; return n; }
  function hasPhrase(slot) { return !!phraseKeys[crewId() + ':' + slot]; }
  function putPhrase(slot, blob) {
    return new Promise(function (res, rej) {
      if (!db) return rej(new Error('storage unavailable'));
      var r = tx('readwrite').put(blob, crewId() + ':' + slot);
      r.onsuccess = function () { phraseKeys[crewId() + ':' + slot] = true; res(); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function delPhrase(slot) {
    return new Promise(function (res) {
      if (!db) return res();
      var r = tx('readwrite').delete(crewId() + ':' + slot);
      r.onsuccess = function () { delete phraseKeys[crewId() + ':' + slot]; res(); };
      r.onerror = function () { res(); };
    });
  }
  function playPhrase(slot) {
    return new Promise(function (res) {
      if (!db || !hasPhrase(slot)) return res(false);
      var r = tx('readonly').get(crewId() + ':' + slot);
      r.onsuccess = function () {
        if (!r.result) return res(false);
        stopAll();
        audioEl = new Audio(URL.createObjectURL(r.result));
        audioEl.onended = function () { res(true); };
        audioEl.play().then(function () {}, function () { res(false); });
      };
      r.onerror = function () { res(false); };
    });
  }
  function recordPhrase(slot, btn) {
    if (!canRecord) { setStatus('Recording is not available in this browser.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var chunks = [], mr = new MediaRecorder(stream);
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); }); btn.textContent = 'RECORD';
        putPhrase(slot, new Blob(chunks, { type: mr.mimeType || 'audio/webm' }))
          .then(function () { setStatus('Saved your ' + slot + ' phrase for ' + crewData().name + ' on this device.'); render(); })
          .catch(function () { setStatus('Could not save the recording.'); });
      };
      btn.textContent = 'STOP'; btn.onclick = function () { if (mr.state !== 'inactive') mr.stop(); };
      setTimeout(function () { if (mr.state !== 'inactive') mr.stop(); }, 8000);
      mr.start(); setStatus('Recording ' + slot + ' phrase (up to 8 seconds). Click STOP when done.');
    }).catch(function (e) { setStatus(permMsg(e)); });
  }
  function renderPhrases() {
    var box = $('#phrases'); if (!box) return;
    box.textContent = '';
    var h = document.createElement('div'); h.className = 'mono small';
    h.textContent = 'RECORDED PHRASES for ' + crewData().sigil + ' ' + crewData().name + ' (stored only on this device; record only your own voice):';
    box.appendChild(h);
    SLOTS.forEach(function (s) {
      var row = document.createElement('div'); row.className = 'row2';
      var lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = s[1];
      var rb = document.createElement('button'); rb.type = 'button'; rb.className = 'hbtn mini'; rb.textContent = 'RECORD';
      rb.onclick = function () { recordPhrase(s[0], rb); };
      var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'hbtn mini'; pb.textContent = 'PLAY';
      pb.disabled = !hasPhrase(s[0]); pb.onclick = function () { playPhrase(s[0]); };
      var db2 = document.createElement('button'); db2.type = 'button'; db2.className = 'hbtn mini'; db2.textContent = 'DELETE';
      db2.disabled = !hasPhrase(s[0]); db2.onclick = function () { delPhrase(s[0]).then(render); };
      row.appendChild(lbl); row.appendChild(rb); row.appendChild(pb); row.appendChild(db2); box.appendChild(row);
    });
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
  function speakDevice(text) {
    if (!canSpeak) return;
    var v = pickVoice(), p = profile();
    sentences(text).forEach(function (part) {
      var u = new SpeechSynthesisUtterance(part.trim());
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = navigator.language || 'en-GB';
      u.pitch = Math.min(2, Math.max(0.1, p.pitch)); u.rate = p.rate;
      speechSynthesis.speak(u);
    });
  }
  function clean(text) { return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, '').replace(/\s+/g, ' ').trim(); }
  function speak(text) {
    if (!prefs.speak || !o) return;
    text = clean(text); if (!text) return;
    stopAll();
    if (status.tts.available) {
      fetchT(o.base + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, crew: crewId() }) }, 20000)
        .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { audioEl = new Audio(URL.createObjectURL(b)); return audioEl.play(); })
        .catch(function () { status.tts.available = false; render(); speakDevice(text); });
    } else speakDevice(text);
  }
  /* A recorded phrase replaces the spoken reply for that event if the captain recorded one. */
  function event(slot, fallbackText) {
    if (!prefs.speak) return;
    playPhrase(slot).then(function (played) { if (!played && fallbackText) speak(fallbackText); });
  }

  /* ---------- listen ---------- */
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
    function syncSpeak() { speakBtn.setAttribute('aria-pressed', prefs.speak); speakBtn.textContent = 'SPEAK REPLIES: ' + (prefs.speak ? 'ON' : 'OFF'); }
    syncSpeak();
    speakBtn.addEventListener('click', function () {
      prefs.speak = !prefs.speak; save(); syncSpeak();
      if (!prefs.speak) stopAll(); else speak(crewData().lines ? crewData().lines.greet[0].replace('{c}', 'Captain').replace('Captain Captain', 'Captain') : 'Voice online.');
    });
    selectEl.addEventListener('change', function () {
      var c = crewData(); if (selectEl.value === 'auto') delete prefs.voices[c.id]; else prefs.voices[c.id] = selectEl.value;
      save(); if (prefs.speak) speak('Voice changed.');
    });
    rateEl.addEventListener('input', function () { prefs.rate = parseFloat(rateEl.value) || 1; save(); });
    $('#voice-test').addEventListener('click', function () {
      var was = prefs.speak; prefs.speak = true;
      speak('Systems nominal. Ready when you are, Captain.'); prefs.speak = was;
    });
    if (canSpeak) speechSynthesis.onvoiceschanged = fillVoices;
    openDb().then(loadKeys).then(function () { render(); refresh(); });
  }
  function stop() { if (recording) recording.cancel(); stopAll(); }
  window.MarsVoice = { init: init, speak: speak, event: event, hasPhrase: hasPhrase, enabled: function () { return prefs.speak; },
    stop: stop, refresh: refresh, refreshVoices: function () { fillVoices(); renderPhrases(); speakBtn.hidden = !(ttsEngine() || phraseCount() > 0); } };
})();
