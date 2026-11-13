(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var site = $('#site'), hud = $('#hud'), sr = $('#sr');
  var powerOn = $('#power-on'), powerOff = $('#power-off');
  var opener = powerOn;
  var timer = null, startedAt = 0;

  function say(msg) { sr.textContent = ''; setTimeout(function () { sr.textContent = msg; }, 30); }

  /* ---------- Website tabs ---------- */
  var tabs = $$('[role=tab]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') n = tabs[0];
      else if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* ---------- HUD modules ---------- */
  var modules = [
    ['Bridge', 'Command overview. Your ship, your crew, and your next mission at a glance.'],
    ['Crew', 'Celestial personalities with their own voices and roles. Each keeps the same captain profile.'],
    ['Missions', 'Turn goals into missions and track progress as experience.'],
    ['ShipCore', 'One system, many voices. Personality, voice, provider, and skills stay separate.'],
    ['Theme Lab', 'Eight low-glare palettes share one geometry. Theme switching arrives in a later build.'],
    ['Roadmap', 'Prototype phases from the local demo toward portable .starship exports.']
  ];
  var current = 0;
  var navlist = $('#navlist');
  modules.forEach(function (m, i) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = m[0].toUpperCase();
    b.addEventListener('click', function () { setModule(i, true); closeDrawer(); });
    li.appendChild(b); navlist.appendChild(li);
  });
  function setModule(i, announce) {
    current = i;
    var name = modules[i][0].toUpperCase();
    $('#module-name').textContent = name;
    $('#module-title').textContent = name;
    $('#module-kicker').textContent = 'MODULE 0' + (i + 1);
    $('#module-desc').textContent = modules[i][1];
    $$('button', navlist).forEach(function (b, j) {
      if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    if (announce) { say(name + ' module active'); log('Module: ' + name); }
  }
  function findModule(word) {
    word = word.replace(/\s+/g, '').toLowerCase();
    for (var i = 0; i < modules.length; i++) if (modules[i][0].replace(/\s+/g, '').toLowerCase() === word) return i;
    return -1;
  }

  /* ---------- Chamber rack ---------- */
  var slots = [
    ['♂︎', 'Talk to Mars', function () { setCrew('MARS'); }],
    ['♀︎', 'Talk to Venus', function () { setCrew('VENUS'); }],
    ['⇄', 'Open Crew Link', function () { reply('Crew Link is a later build. LOCAL DEMO only.'); }],
    ['+', 'Create Mission', function () { setModule(2, true); reply('Mission creation arrives in a later build.'); }],
    ['◎', 'Open Crew', function () { setModule(1, true); }],
    ['◐', 'Change Theme', function () { setModule(4, true); }]
  ];
  var rack = $('#rack');
  slots.forEach(function (s) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'slot';
    b.innerHTML = '<span class="glyph" aria-hidden="true"></span><span class="label"></span>';
    $('.glyph', b).textContent = s[0]; $('.label', b).textContent = s[1];
    b.addEventListener('click', s[2]);
    li.appendChild(b); rack.appendChild(li);
  });
  function setCrew(n) { $('#crew').textContent = n; say('Active crew: ' + n); log('Active crew: ' + n); }

  /* ---------- Console ---------- */
  var logEl = $('#log');
  function log(t) {
    var li = document.createElement('li'); li.textContent = t; logEl.appendChild(li);
    while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }
  function reply(t) { log(t); say(t); speak(t); }
  $('#console-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#cmd'), raw = input.value.trim(), cmd = raw.toLowerCase();
    if (!raw) return;
    log('> ' + raw); input.value = '';
    var idx = findModule(cmd.replace(/^(open|go to|goto)\s+/, ''));
    if (cmd === 'help') reply('Commands: help, bridge, crew, missions, shipcore, theme lab, roadmap, mars, venus, connect, fullscreen, clear, power off. With ShipCore running: notes, new mission, joke, status, time, and chat.');
    else if (idx > -1) setModule(idx, true);
    else if (cmd === 'mars' || cmd === 'venus') setCrew(cmd.toUpperCase());
    else if (cmd === 'fullscreen' || cmd === 'full screen') toggleFs();
    else if (cmd === 'clear') logEl.textContent = '';
    else if (cmd === 'power off' || cmd === 'off') power(false);
    else if (cmd === 'connect') checkLink(true);
    else if (link.online) ask(raw);
    else reply('LOCAL DEMO: command not recognized. Type help, or run ShipCore locally (connect).');
  });
  $('#clear').addEventListener('click', function () { logEl.textContent = ''; $('#cmd').focus(); });

  /* ---------- Drawer (mobile) ---------- */
  var drawerBtn = $('#drawer-toggle');
  function closeDrawer() { hud.classList.remove('drawer-open'); drawerBtn.setAttribute('aria-expanded', 'false'); }
  drawerBtn.addEventListener('click', function () {
    var open = hud.classList.toggle('drawer-open');
    drawerBtn.setAttribute('aria-expanded', open);
  });

  /* ---------- Glow ---------- */
  var glowBtn = $('#glow-toggle');
  glowBtn.addEventListener('click', function () {
    var on = glowBtn.getAttribute('aria-pressed') !== 'true';
    glowBtn.setAttribute('aria-pressed', on);
    glowBtn.textContent = 'GLOW: ' + (on ? 'ON' : 'OFF');
    document.body.classList.toggle('no-glow', !on);
  });

  /* ---------- Full screen ---------- */
  var fsBtn = $('#fs-toggle');
  var fsEnabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  var fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement; };
  if (!fsEnabled) fsBtn.hidden = true;
  function toggleFs() {
    if (!fsEnabled) { reply('Full screen is not supported in this browser.'); return; }
    var p;
    if (fsEl()) p = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else p = (hud.requestFullscreen || hud.webkitRequestFullscreen).call(hud);
    if (p && p.catch) p.catch(function () { reply('Full screen was blocked by the browser.'); });
  }
  function syncFs() {
    var on = !!fsEl();
    fsBtn.setAttribute('aria-pressed', on);
    fsBtn.textContent = on ? 'EXIT FULL SCREEN' : 'FULL SCREEN';
    if (hud.hidden) return;
    say(on ? 'Full screen on' : 'Full screen off');
  }
  fsBtn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);

  /* ---------- Session clock ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var s = Math.floor((Date.now() - startedAt) / 1000);
    $('#chrono').textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }
  function startClock() { stopClock(); tick(); timer = setInterval(tick, 1000); }
  function stopClock() { if (timer) { clearInterval(timer); timer = null; } }
  document.addEventListener('visibilitychange', function () {
    if (hud.hidden) return;
    if (document.hidden) stopClock(); else startClock();
  });


  /* ---------- ShipCore link (optional local Python service, no key) ---------- */
  var SHIPCORE = 'http://127.0.0.1:8765';
  var link = { online: false, providers: [] };
  function setLink(online, info) {
    link.online = online;
    var llm = online && info && info.providers && info.providers.some(function (p) { return p.available; });
    $('#link-text').textContent = online ? (llm ? 'SHIPCORE + LOCAL AI' : 'SHIPCORE LOCAL') : 'LOCAL DEMO';
    $('#link-text2').textContent = $('#link-text').textContent;
    $('#node-net').textContent = online ? 'CONNECTED' : 'OFFLINE';
    $('#node-core').textContent = online ? 'SHIPCORE' : 'ONLINE';
  }
  function timeoutFetch(url, opts, ms) {
    var c = new AbortController(), id = setTimeout(function () { c.abort(); }, ms);
    opts = opts || {}; opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(id); });
  }
  function checkLink(announce) {
    return timeoutFetch(SHIPCORE + '/health', {}, 1500)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (info) { setLink(true, info); if (announce) reply('ShipCore connected (v' + info.version + ').'); })
      .catch(function () { setLink(false); if (announce) reply('ShipCore not found on this machine. Staying in LOCAL DEMO. See docs/SHIPCORE.md.'); });
  }
  function ask(raw) {
    log('...'); var pending = logEl.lastChild;
    timeoutFetch(SHIPCORE + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: raw, crew: $('#crew').textContent })
    }, 95000)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (d) { if (pending) pending.remove(); reply(d.speaker + ': ' + d.reply); })
      .catch(function () { if (pending) pending.remove(); setLink(false); reply('ShipCore link lost. Back to LOCAL DEMO.'); });
  }

  /* ---------- Browser voice (no key; optional; never required) ---------- */
  var micBtn = $('#mic'), speakBtn = $('#speak-toggle');
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, speakOn = false, listening = false;
  var canSpeak = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (SR) { micBtn.hidden = false; }
  if (canSpeak) { speakBtn.hidden = false; }
  $('#voice-state').textContent = (SR || canSpeak) ? (SR && canSpeak ? 'MIC + SPEAKER' : SR ? 'MIC' : 'SPEAKER') : 'UNAVAILABLE';
  $('#node-voice').textContent = $('#voice-state').textContent;
  function speak(text) {
    if (!speakOn || !canSpeak) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text); u.lang = navigator.language || 'en-US';
    speechSynthesis.speak(u);
  }
  function stopVoice() {
    if (rec && listening) { try { rec.stop(); } catch (e) {} }
    listening = false; micBtn.setAttribute('aria-pressed', 'false'); micBtn.classList.remove('listening'); micBtn.textContent = 'MIC';
    if (canSpeak) speechSynthesis.cancel();
  }
  if (SR) micBtn.addEventListener('click', function () {
    if (listening) { stopVoice(); return; }
    rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var said = e.results[0][0].transcript.trim();
      if (said) { $('#cmd').value = said; $('#console-form').requestSubmit(); }
    };
    rec.onerror = function (e) { reply('Voice input unavailable: ' + (e.error || 'error') + '. Typing still works.'); };
    rec.onend = function () { listening = false; micBtn.setAttribute('aria-pressed', 'false'); micBtn.classList.remove('listening'); micBtn.textContent = 'MIC'; };
    try { rec.start(); listening = true; micBtn.setAttribute('aria-pressed', 'true'); micBtn.classList.add('listening'); micBtn.textContent = 'LISTENING'; say('Listening'); }
    catch (e) { reply('Could not start the microphone.'); }
  });
  if (canSpeak) speakBtn.addEventListener('click', function () {
    speakOn = !speakOn;
    speakBtn.setAttribute('aria-pressed', speakOn);
    speakBtn.textContent = 'SPEAK REPLIES: ' + (speakOn ? 'ON' : 'OFF');
    if (!speakOn) speechSynthesis.cancel();
  });

  /* ---------- Power ---------- */
  function power(on, from) {
    if (on === !hud.hidden) return;
    if (on) {
      opener = from || powerOn;
      hud.hidden = false;
      site.inert = true;
      document.body.classList.add('hud-on');
      startedAt = Date.now(); startClock();
      setModule(0, false);
      try { history.replaceState(null, '', '#hud'); } catch (e) {}
      $('#hud-title').focus();
      say('HUD powered on. Local demo, no provider connected.');
      log('Power on. LOCAL DEMO.');
      checkLink(false);
    } else {
      if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
      stopClock(); closeDrawer(); stopVoice();
      hud.hidden = true;
      site.inert = false;
      document.body.classList.remove('hud-on');
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      (opener && document.contains(opener) ? opener : powerOn).focus();
      say('HUD powered off.');
    }
  }
  powerOn.addEventListener('click', function () { power(true, powerOn); });
  powerOff.addEventListener('click', function () { power(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || hud.hidden) return;
    if (hud.classList.contains('drawer-open')) { closeDrawer(); drawerBtn.focus(); return; }
    power(false);
  });
  if (location.hash === '#hud') power(true, powerOn);
})();
