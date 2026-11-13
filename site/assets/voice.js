/* MARSAI voice. Speech to speech by default.
 *   Listen: press and hold the mic (or Space), speak when it says SPEAK NOW, release to send.
 *           A quick tap talks until you pause. Local Whisper (ShipCore) -> browser SpeechRecognition -> typing.
 *   Speak : recorded phrases -> local crew voices (ShipCore + Piper) -> best matching device voice per crew.
 * Voices belong to the device: each crew member can sound different on every device.
 * The mic only starts when pressed. Nothing here is required for navigation. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var o = null;
  var status = { stt: { available: false }, tts: { available: false, voices: {} } };
  var prefs = { speak: true, voices: {}, rate: 1, sfx: true, mic: true, volume: 0.8 };
  var KEY = 'marsai.voice.v3';
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    ['speak', 'sfx', 'mic'].forEach(function (k) { if (typeof saved[k] === 'boolean') prefs[k] = saved[k]; });
    if (saved.voices) prefs.voices = saved.voices; if (saved.rate) prefs.rate = saved.rate;
    if (typeof saved.volume === 'number') prefs.volume = Math.max(0, Math.min(1, saved.volume));
  } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {} }

  var micBtn, statusEl, selectEl, rateEl, engineEl, pill, hint, micLabel, waveEl;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var audioEl = null, voices = [], talk = null, state = 'idle', speakingCount = 0;

  function crewId() { return o ? o.getCrew() : 'MARS'; }
  function crewData() { return (o && o.getCrewData && o.getCrewData()) || { id: 'MARS', name: 'Mars', sigil: '🔴', gender: 'm', voice: { pitch: .25, pace: 1 } }; }
  function fetchT(url, opts, ms) {
    var c = new AbortController(), id = setTimeout(function () { c.abort(); }, ms);
    opts = opts || {}; opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(id); });
  }

  /* ---------- visible state: pill, key, hint, waveform ---------- */
  var LABEL = { idle: 'HOLD TO TALK', starting: 'STARTING...', ready: 'SPEAK NOW', listening: 'RELEASE TO SEND', thinking: 'THINKING...', speaking: 'TAP TO INTERRUPT' };
  var PILL = { idle: 'IDLE', starting: 'STARTING', ready: 'SPEAK NOW', listening: 'LISTENING', thinking: 'THINKING', speaking: 'SPEAKING' };
  var HINT = { idle: 'Hold the mic (or Space) to talk. Release to send.', starting: 'Getting the microphone ready...', ready: 'Speak now. Release when you are done.',
    listening: 'Listening. Release to send.', thinking: 'Working on it...', speaking: 'Speaking. Press the mic to interrupt.' };
  function setState(s, hintText) {
    state = s;
    if (micBtn) { micBtn.setAttribute('data-state', s); micBtn.setAttribute('aria-pressed', s === 'ready' || s === 'listening'); }
    if (micLabel) micLabel.textContent = LABEL[s];
    if (pill) { pill.setAttribute('data-state', s); pill.textContent = PILL[s]; }
    if (hint) hint.textContent = hintText || (talk && talk.mode === 'toggle' && (s === 'ready' || s === 'listening') ? 'Listening until you pause. Tap the mic to send now.' : HINT[s]);
    if (waveEl) {
      waveEl.className = 'wave' + (s === 'ready' || s === 'listening' ? ' live level' : s === 'speaking' ? ' live speak' : s === 'thinking' ? ' live' : '');
      if (s === 'idle') level(0);
    }
    if (o && o.onVoiceState) o.onVoiceState(s);
  }
  function say(msg) { if (hint) hint.textContent = msg; }
  function level(v) {
    if (!waveEl || !waveEl.classList.contains('level')) { if (waveEl && v === 0) [].forEach.call(waveEl.children, function (b) { b.style.height = ''; }); return; }
    var bars = waveEl.children, n = bars.length;
    for (var i = 0; i < n; i++) { var shape = 0.35 + 0.65 * Math.abs(Math.sin((i + 1) * 1.3 + Date.now() / 140)); bars[i].style.height = Math.max(10, Math.min(100, v * 700 * shape)) + '%'; }
  }

  /* ---------- sound cues (start, stop, error) ---------- */
  var actx = null;
  function cue(kind) {
    if (!prefs.sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var now = actx.currentTime, vol = 0.25 + 0.75 * prefs.volume, len = kind === 'tick' ? .018 : .09,
        seq = kind === 'tick' ? [[1700, 0]] : kind === 'start' ? [[740, 0], [1100, .09]] : kind === 'stop' ? [[880, 0], [560, .08]] : [[220, 0], [160, .12]];
      seq.forEach(function (n) {
        var osc = actx.createOscillator(), g = actx.createGain();
        osc.type = 'sine'; osc.frequency.value = n[0]; g.gain.setValueAtTime(0.0001, now + n[1]);
        g.gain.exponentialRampToValueAtTime((kind === 'tick' ? 0.025 : 0.08) * vol, now + n[1] + .004); g.gain.exponentialRampToValueAtTime(0.0001, now + n[1] + len);
        osc.connect(g); g.connect(actx.destination); osc.start(now + n[1]); osc.stop(now + n[1] + len + .01);
      });
    } catch (e) {}
  }

  /* ---------- engines ---------- */
  function sttEngine() { return prefs.mic ? (status.stt.available && canRecord ? 'shipcore' : (SR ? 'browser' : null)) : null; }
  function ttsEngine() { return status.tts.available ? 'shipcore' : (canSpeak ? 'browser' : null); }
  function micPossible() { return !!((status.stt.available && canRecord) || SR); }
  function render() {
    var s = sttEngine(), t = ttsEngine();
    var label = { shipcore: 'LOCAL WHISPER', browser: 'BROWSER', null: prefs.mic ? 'NONE' : 'OFF' };
    var tl = { shipcore: 'LOCAL CREW VOICES', browser: 'DEVICE VOICES', null: 'NONE' };
    engineEl.textContent = 'LISTEN: ' + label[s] + ' | SPEAK: ' + tl[t];
    $('#voice-state').textContent = (s || t) ? 'READY' : 'UNAVAILABLE';
    micBtn.hidden = !micPossible() || !prefs.mic;
    $('#voice-settings').hidden = !(micPossible() || t || canRecord);
    fillVoices(); renderPhrases();
    if (o && o.onEngines) o.onEngines({ stt: s, tts: t, micPossible: micPossible(), micOn: prefs.mic, speakOn: prefs.speak });
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
    var ranked = voices.map(function (v) { return { v: v, s: score(v, c.gender) }; }).filter(function (x) { return x.s >= 0; }).sort(function (a, b) { return b.s - a.s; });
    if (!ranked.length) return null;
    var top = ranked.filter(function (x) { return x.s >= ranked[0].s - 12; });
    return top[hash(c.id) % top.length].v;
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
    var list = voices.map(function (v) { return { v: v, s: score(v, c.gender) }; }).filter(function (x) { return x.s >= 0; }).sort(function (a, b) { return b.s - a.s; });
    selectEl.textContent = '';
    var best = pickVoice(), auto = document.createElement('option'); auto.value = 'auto';
    auto.textContent = 'Auto' + (best ? ' (' + best.name + ')' : '');
    selectEl.appendChild(auto);
    list.forEach(function (x) { var op = document.createElement('option'); op.value = x.v.voiceURI; op.textContent = x.v.name + ' (' + x.v.lang + ')'; selectEl.appendChild(op); });
    selectEl.value = prefs.voices[c.id] || 'auto';
    if (selectEl.value !== (prefs.voices[c.id] || 'auto')) selectEl.value = 'auto';
    selectEl.disabled = status.tts.available;
    rateEl.value = prefs.rate;
    $('#voice-crew').textContent = 'VOICE FOR ' + c.sigil + ' ' + c.name.toUpperCase() + (status.tts.available ? ' (LOCAL CREW VOICE)' : '');
  }

  /* ---------- recorded phrases (IndexedDB, per device and crew member) ---------- */
  var SLOTS = [['greeting', 'Greeting'], ['confirm', 'Confirmation'], ['warning', 'Warning'], ['celebrate', 'Mission celebration']];
  var db = null, phraseKeys = {};
  function openDb() {
    return new Promise(function (res) {
      if (!window.indexedDB) return res(null);
      try { var r = indexedDB.open('marsai-voice', 1); r.onupgradeneeded = function () { r.result.createObjectStore('phrases'); }; r.onsuccess = function () { db = r.result; res(db); }; r.onerror = function () { res(null); }; } catch (e) { res(null); }
    });
  }
  function tx(mode) { return db.transaction('phrases', mode).objectStore('phrases'); }
  function loadKeys() { return new Promise(function (res) { if (!db) return res(); var q = tx('readonly').getAllKeys(); q.onsuccess = function () { phraseKeys = {}; q.result.forEach(function (k) { phraseKeys[k] = true; }); res(); }; q.onerror = function () { res(); }; }); }
  function hasPhrase(slot) { return !!phraseKeys[crewId() + ':' + slot]; }
  function putPhrase(slot, blob) { return new Promise(function (res, rej) { if (!db) return rej(new Error('storage unavailable')); var r = tx('readwrite').put(blob, crewId() + ':' + slot); r.onsuccess = function () { phraseKeys[crewId() + ':' + slot] = true; res(); }; r.onerror = function () { rej(r.error); }; }); }
  function delPhrase(slot) { return new Promise(function (res) { if (!db) return res(); var r = tx('readwrite').delete(crewId() + ':' + slot); r.onsuccess = function () { delete phraseKeys[crewId() + ':' + slot]; res(); }; r.onerror = function () { res(); }; }); }
  function playAudio(url, done) {
    stopAll();
    audioEl = new Audio(url); var a = audioEl; a.volume = prefs.volume;
    a.onplay = function () { speakingCount++; if (state === 'idle') setState('speaking'); };
    a.onended = a.onerror = function () { speakingCount = Math.max(0, speakingCount - 1); if (state === 'speaking') setState('idle'); if (done) done(true); };
    a.play().then(function () {}, function () { if (done) done(false); });
  }
  function playPhrase(slot) {
    return new Promise(function (res) {
      if (!db || !hasPhrase(slot)) return res(false);
      var r = tx('readonly').get(crewId() + ':' + slot);
      r.onsuccess = function () { if (!r.result) return res(false); playAudio(URL.createObjectURL(r.result), res); };
      r.onerror = function () { res(false); };
    });
  }
  function recordPhrase(slot, btn) {
    if (!canRecord) { say('Recording is not available in this browser.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var chunks = [], mr = new MediaRecorder(stream);
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); }); btn.textContent = 'RECORD';
        putPhrase(slot, new Blob(chunks, { type: mr.mimeType || 'audio/webm' })).then(function () { say('Saved your ' + slot + ' phrase for ' + crewData().name + ' on this device.'); renderPhrases(); }).catch(function () { say('Could not save the recording.'); });
      };
      btn.textContent = 'STOP'; btn.onclick = function () { if (mr.state !== 'inactive') mr.stop(); };
      setTimeout(function () { if (mr.state !== 'inactive') mr.stop(); }, 8000);
      mr.start(); cue('start'); say('Recording ' + slot + ' phrase (up to 8 seconds). Click STOP when done.');
    }).catch(function (e) { say(permMsg(e)); });
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
      function mk(txt, fn, dis) { var b = document.createElement('button'); b.type = 'button'; b.className = 'key'; b.textContent = txt; b.disabled = !!dis; b.onclick = function () { fn(b); }; return b; }
      row.appendChild(lbl);
      row.appendChild(mk('RECORD', function (b) { recordPhrase(s[0], b); }));
      row.appendChild(mk('PLAY', function () { playPhrase(s[0]); }, !hasPhrase(s[0])));
      row.appendChild(mk('DELETE', function () { delPhrase(s[0]).then(renderPhrases); }, !hasPhrase(s[0])));
      box.appendChild(row);
    });
  }

  /* ---------- speak ---------- */
  function stopAll() {
    if (canSpeak) speechSynthesis.cancel();
    if (audioEl) { var a = audioEl; audioEl = null; try { a.onended = a.onerror = null; a.pause(); } catch (e) {} }
    speakingCount = 0; if (state === 'speaking') setState('idle');
  }
  function sentences(text) {
    var parts = text.replace(/\s+/g, ' ').match(/[^.!?\n]+[.!?]*/g) || [text], out = [], cur = '';
    parts.forEach(function (p) { if ((cur + p).length > 180 && cur) { out.push(cur); cur = p; } else cur += p; });
    if (cur.trim()) out.push(cur);
    return out;
  }
  function speakDevice(text) {
    if (!canSpeak) return;
    var v = pickVoice(), p = profile(), parts = sentences(text);
    parts.forEach(function (part, i) {
      var u = new SpeechSynthesisUtterance(part.trim());
      if (v) { u.voice = v; u.lang = v.lang; } else u.lang = navigator.language || 'en-GB';
      u.pitch = Math.min(2, Math.max(0.1, p.pitch)); u.rate = p.rate; u.volume = prefs.volume;
      if (i === 0) u.onstart = function () { if (state === 'idle') setState('speaking'); };
      if (i === parts.length - 1) { u.onend = u.onerror = function () { if (state === 'speaking') setState('idle'); }; }
      speechSynthesis.speak(u);
    });
  }
  function clean(text) { return text.replace(/https?:\/\/\S+/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, '').replace(/\s+/g, ' ').trim(); }
  function speak(text) {
    if (!prefs.speak || !o) return;
    text = clean(text); if (!text) return;
    stopAll();
    if (status.tts.available) {
      fetchT(o.base + '/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text, crew: crewId() }) }, 20000)
        .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (b) { playAudio(URL.createObjectURL(b), function (ok) { if (!ok) speakDevice(text); }); })
        .catch(function () { status.tts.available = false; render(); speakDevice(text); });
    } else speakDevice(text);
  }
  function event(slot, fallbackText) {
    if (!prefs.speak) return;
    playPhrase(slot).then(function (played) { if (!played && fallbackText) speak(fallbackText); });
  }

  /* ---------- listen: press and hold (or tap), with clear start and stop cues ---------- */
  function permMsg(e) {
    var n = e && (e.name || e.error);
    if (n === 'NotAllowedError' || n === 'not-allowed' || n === 'SecurityError') return 'Microphone blocked. Allow microphone access in your browser site settings, then try again.';
    if (n === 'NotFoundError' || n === 'audio-capture') return 'No microphone found.';
    if (n === 'network') return 'Your browser speech service is unreachable. Run ShipCore voice for private offline transcription (docs/VOICE.md), or type.';
    if (n === 'no-speech') return 'No speech heard. Try again closer to the mic.';
    return 'Voice input failed' + (n ? ' (' + n + ')' : '') + '. Typing still works.';
  }
  function fail(msg) { talk = null; cue('error'); setState('idle', msg); }
  function startTalk() {
    var e = sttEngine();
    if (!e) { setState('idle', 'Voice input is not available here. Typing still works.'); return; }
    stopAll(); if (talk) return;
    talk = { mode: 'pending', cancel: false, stop: null }; setState('starting');
    if (e === 'shipcore') talkLocal(); else talkBrowser();
  }
  function endTalk() { if (talk) { talk.endRequested = true; if (talk.stop) talk.stop(); } }
  function talkLocal() {
    var t = talk;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      if (t.cancel) { stream.getTracks().forEach(function (x) { x.stop(); }); talk = null; setState('idle'); return; }
      var chunks = [], mime = '';
      ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].some(function (m) { if (MediaRecorder.isTypeSupported(m)) { mime = m; return true; } });
      var mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      var ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser();
      an.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(an);
      var buf = new Uint8Array(an.fftSize), heard = false, quietSince = Date.now(), started = Date.now();
      var timer = setInterval(function () {
        an.getByteTimeDomainData(buf);
        var sum = 0; for (var i = 0; i < buf.length; i++) { var d = (buf[i] - 128) / 128; sum += d * d; }
        var rms = Math.sqrt(sum / buf.length), now = Date.now();
        level(rms);
        if (rms > 0.02) { quietSince = now; if (!heard) { heard = true; setState('listening'); } }
        if (t.endRequested || (t.mode === 'toggle' && heard && now - quietSince > 1400) || now - started > 30000 || (!heard && now - started > 12000 && t.mode !== 'pending')) stop();
      }, 90);
      function stop() { if (mr.state !== 'inactive') mr.stop(); }
      t.stop = stop;
      mr.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = function () {
        clearInterval(timer); stream.getTracks().forEach(function (x) { x.stop(); }); try { ctx.close(); } catch (e) {}
        talk = null; cue('stop');
        if (t.cancel) { setState('idle', 'Voice input cancelled.'); return; }
        if (!heard) { setState('idle', 'I did not hear anything. Press and hold the mic, wait for SPEAK NOW, then talk.'); return; }
        setState('thinking');
        var blob = new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' });
        fetchT(o.base + '/stt', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }, 60000)
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (d) {
            if (!d.text) { setState('idle', 'I could not make out any words. Try again.'); return; }
            setState('idle', 'Heard: ' + d.text); o.onTranscript(d.text);
          })
          .catch(function () { setState('idle', 'Local transcription failed. Is ShipCore running? Browser speech is the fallback.'); refresh(); });
      };
      mr.start(); cue('start'); setState('ready');
    }).catch(function (e) { fail(permMsg(e)); });
  }
  function talkBrowser() {
    var t = talk, rec = new SR(), got = false;
    rec.lang = navigator.language || 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
    rec.onstart = function () { if (t.cancel) { rec.abort(); return; } cue('start'); setState('ready'); };
    rec.onspeechstart = function () { setState('listening'); };
    rec.onresult = function (e) { var said = e.results[0][0].transcript.trim(); if (said) { got = true; setState('thinking'); o.onTranscript(said); } };
    rec.onerror = function (e) { got = true; fail(permMsg(e)); };
    rec.onend = function () { talk = null; cue('stop'); if (state !== 'idle') setState('idle', got ? 'Heard you.' : 'I did not hear anything. Try again.'); };
    t.stop = function () { try { rec.stop(); } catch (e) {} };
    try { rec.start(); } catch (e) { fail('Could not start the microphone.'); }
  }

  var press = { at: 0, down: false, swallow: false };
  function pressDown() {
    if (press.down) return; press.down = true; press.at = Date.now();
    if (talk && talk.mode === 'toggle') { press.swallow = true; endTalk(); return; }   // tap again to send
    press.swallow = false; startTalk();
  }
  function pressUp() {
    if (!press.down) return; press.down = false;
    if (press.swallow) { press.swallow = false; return; }
    if (!talk) return;
    if (Date.now() - press.at >= 380) { if (state === 'starting') talk.cancel = true; talk.endRequested = true; if (talk.stop) talk.stop(); }
    else { talk.mode = 'toggle'; setState(state, 'Listening until you pause. Tap the mic to send now.'); }
  }

  /* ---------- wiring ---------- */
  function init(opts) {
    o = opts;
    micBtn = $('#mic'); statusEl = $('#voice-status'); pill = $('#vpill'); hint = $('#voice-hint'); micLabel = $('#mic-label'); waveEl = $('#wave');
    selectEl = $('#voice-select'); rateEl = $('#voice-rate'); engineEl = $('#voice-engine');
    micBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); try { micBtn.setPointerCapture(e.pointerId); } catch (x) {} pressDown(); });
    micBtn.addEventListener('pointerup', function (e) { e.preventDefault(); pressUp(); });
    micBtn.addEventListener('pointercancel', function () { pressUp(); });
    micBtn.addEventListener('keydown', function (e) { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (!e.repeat) pressDown(); } else if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) { if (talk) endTalk(); else { startTalk(); setTimeout(function () { if (talk) talk.mode = 'toggle'; }, 0); } } } });
    micBtn.addEventListener('keyup', function (e) { if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); pressUp(); } });
    document.addEventListener('keydown', function (e) {     // Space anywhere (not while typing) is push to talk
      if (e.code !== 'Space' || e.repeat || !o.isHudOpen() || micBtn.hidden) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(tag) || document.querySelector('dialog[open]')) return;
      e.preventDefault(); pressDown();
    });
    document.addEventListener('keyup', function (e) { if (e.code === 'Space' && press.down) { e.preventDefault(); pressUp(); } });
    selectEl.addEventListener('change', function () { var c = crewData(); if (selectEl.value === 'auto') delete prefs.voices[c.id]; else prefs.voices[c.id] = selectEl.value; save(); if (prefs.speak) speak('Voice changed.'); });
    rateEl.addEventListener('input', function () { prefs.rate = parseFloat(rateEl.value) || 1; save(); });
    $('#voice-test').addEventListener('click', function () { var was = prefs.speak; prefs.speak = true; speak('Systems nominal. Ready when you are, Captain.'); prefs.speak = was; });
    if (canSpeak) speechSynthesis.onvoiceschanged = fillVoices;
    setState('idle');
    openDb().then(loadKeys).then(function () { render(); refresh(); });
  }
  function setSpeak(on) { prefs.speak = !!on; save(); if (!prefs.speak) stopAll(); render(); return !!ttsEngine(); }
  function setMic(on) { prefs.mic = !!on; save(); if (!on && talk) { talk.cancel = true; endTalk(); } render(); return micPossible(); }
  function setVolume(v) { prefs.volume = Math.max(0, Math.min(1, v)); save(); if (audioEl) audioEl.volume = prefs.volume; }
  function setRate(r) { prefs.rate = Math.max(0.7, Math.min(1.3, r)); save(); if (rateEl) rateEl.value = prefs.rate; }
  function setSfx(on) { prefs.sfx = !!on; save(); if (on) cue('start'); }
  function stop() { if (talk) { talk.cancel = true; endTalk(); } stopAll(); setState('idle'); }
  function listen() { if (!micPossible() || !prefs.mic) return false; if (!talk) { startTalk(); if (talk) talk.mode = 'toggle'; } return true; }
  window.MarsVoice = { init: init, speak: speak, event: event, hasPhrase: hasPhrase, enabled: function () { return prefs.speak; }, micEnabled: function () { return prefs.mic; }, sfxEnabled: function () { return prefs.sfx; },
    setSpeak: setSpeak, setMic: setMic, setSfx: setSfx, setVolume: setVolume, getVolume: function () { return prefs.volume; }, setRate: setRate, getRate: function () { return prefs.rate; }, listen: listen, stop: stop, refresh: refresh, refreshVoices: function () { fillVoices(); renderPhrases(); },
    canSpeak: function () { return !!ttsEngine(); }, micPossible: micPossible, cue: cue };
})();
