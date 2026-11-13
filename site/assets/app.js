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


  /* ---------- Small helpers ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function timeoutFetch(url, opts, ms) {
    var c = new AbortController(), id = setTimeout(function () { c.abort(); }, ms);
    opts = opts || {}; opts.signal = c.signal;
    return fetch(url, opts).finally(function () { clearTimeout(id); });
  }
  var SHIPCORE = 'http://127.0.0.1:8765';
  var link = { online: false, llm: false };
  var captain = lsGet('marsai.captain') || '';
  var webOn = lsGet('marsai.web') !== '0';
  var history = [];

  /* ---------- Crew (roster comes from assets/crew.json, built from the README) ---------- */
  var FALLBACK = [{ id: 'MARS', name: 'Mars', sigil: '🔴', role: 'Mediator', group: 'foundational', gender: 'm',
    persona: 'Calm, principled, observant, and quietly authoritative.', voice: { pace: 1.08, pitch: .25 },
    lines: { greet: ['Captain {c}. Good to see you.'], how: ['Steady, thank you, {c}.'], thanks: ['Of course.'], bye: ['Rest well, {c}.'],
      cheer: ['Take a breath, {c}. Tell me what is weighing on you.'], intro: ["I'm Mars, the Mediator."], unknown: ["I don't have a good answer to that yet, {c}."] } }];
  var CREW = FALLBACK, crewId = 'MARS';
  function crewObj(id) { for (var i = 0; i < CREW.length; i++) if (CREW[i].id === id) return CREW[i]; return CREW[0]; }
  function me() { return crewObj(crewId); }
  function label(c) { c = c || me(); return c.sigil + ' ' + c.name; }
  function fill(s) { return s.replace(/\{c\}/g, captain || 'Captain').replace(/Captain Captain/g, 'Captain'); }
  var lastLine = {};
  function line(key) {
    var a = me().lines[key] || [], k = crewId + key, i = Math.floor(Math.random() * a.length);
    if (a.length > 1 && i === lastLine[k]) i = (i + 1) % a.length;     // never repeat the same line twice in a row
    lastLine[k] = i;
    return fill(a[i] || '');
  }
  function findCrew(word) {
    word = word.toLowerCase();
    for (var i = 0; i < CREW.length; i++) if (CREW[i].name.toLowerCase() === word) return CREW[i];
    return null;
  }

  function renderTrace() {
    var el = $('#trace'); if (!el) return;
    var eng = link.online ? (link.llm ? 'SHIPCORE+AI' : 'SHIPCORE') : (window.MarsBrain && MarsBrain.state() === 'ready' ? 'CORE+BRAIN' : 'CORE');
    el.innerHTML = '';
    [[me().name.toUpperCase()], [modules[current][0].toUpperCase()], [eng]].forEach(function (x, i) {
      if (i) el.appendChild(document.createTextNode(' \u00bb '));
      var b = document.createElement('b'); b.textContent = x[0]; el.appendChild(b);
    });
  }

  /* ---------- Conversation ---------- */
  var convo = $('#convo'), logEl = $('#log');
  var URL_RE = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g;
  function safeUrl(u) { try { var x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : null; } catch (e) { return null; } }
  function prettyUrl(u) { try { var x = new URL(u), s = x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname.replace(/\/$/, '') : ''); return s.length > 46 ? s.slice(0, 45) + '...' : s; } catch (e) { return u; } }
  function richText(el, text) {
    var last = 0, m; URL_RE.lastIndex = 0;
    while ((m = URL_RE.exec(text))) {
      if (m.index > last) el.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = document.createElement('a'); a.href = m[0]; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = prettyUrl(m[0]); el.appendChild(a);
      last = m.index + m[0].length;
    }
    if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
  }
  function addMsg(kind, who, text, cards) {
    var d = document.createElement('div'); d.className = 'msg ' + kind;
    if (who) { var w = document.createElement('span'); w.className = 'who'; w.textContent = who; d.appendChild(w); }
    var t = document.createElement('span'); t.className = 'txt'; richText(t, text); d.appendChild(t);
    (cards || []).forEach(function (c) {
      var card = document.createElement('div'), u = c.url && safeUrl(c.url); card.className = 'card';
      var b = document.createElement('b');
      if (u) { var a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = c.title; b.appendChild(a); } else b.textContent = c.title;
      card.appendChild(b);
      if (c.sub) { var s = document.createElement('small'); s.textContent = c.sub; card.appendChild(s); }
      t.appendChild(card);
    });
    convo.appendChild(d);
    while (convo.children.length > 40) convo.removeChild(convo.firstChild);
    convo.scrollTop = convo.scrollHeight;
    return t;
  }
  function log(t) {
    var li = document.createElement('li'); li.textContent = t; logEl.appendChild(li);
    while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
  }
  /* A reply from the active crew member. ev picks a recorded phrase (greeting, confirm, warning, celebrate) if one exists. */
  function reply(text, ev, cards) {
    addMsg('crew', label(), text, cards);
    if (!window.MarsVoice) return;
    if (ev && MarsVoice.hasPhrase(ev)) MarsVoice.event(ev, text); else MarsVoice.speak(text);
  }

  /* ---------- HUD modules ---------- */
  var modules = [
    ['Bridge', 'Command overview. Talk to your crew below, or ask for the weather, facts, math, notes, and missions.'],
    ['Crew', 'Twenty celestial personalities, each with their own role, sigil, and voice. Pick one to talk to.'],
    ['Missions', 'Turn goals into missions and track progress as experience. Try: new mission learn to bake.'],
    ['ShipCore', 'One system, many voices. Personality, voice, provider, and skills stay separate.'],
    ['Theme Lab', 'Eight palettes share one layout. Pick one and it applies everywhere, and I will remember it on this device.'],
    ['Roadmap', 'Prototype phases from the first browser build toward portable .starship exports.']
  ];
  var navlist = $('#navlist');
  modules.forEach(function (m, i) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'key'; b.textContent = m[0].toUpperCase();
    b.addEventListener('click', function () { setModule(i, true); closeDrawer(); });
    li.appendChild(b); navlist.appendChild(li);
  });
  var current = 0;
  function setModule(i, announce) {
    current = i;
    var name = modules[i][0].toUpperCase();
    $('#module-name').textContent = name;
    $('#module-title').textContent = name;
    $('#module-kicker').textContent = 'MODULE 0' + (i + 1);
    $('#module-desc').textContent = modules[i][1];
    $$('button', navlist).forEach(function (b, j) { if (j === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    renderExtra(); renderTrace();
    if (announce) { say(name + ' module active'); log('Module: ' + name); }
  }
  function findModule(word) {
    word = word.replace(/\s+/g, '').toLowerCase();
    for (var i = 0; i < modules.length; i++) if (modules[i][0].replace(/\s+/g, '').toLowerCase() === word) return i;
    return -1;
  }
  var THEMES = [
    { id: 'ares', name: 'Ares Prime', c: ['#E65A3A', '#D99A3D', '#42CFE0'], bg: '#080B10' }, { id: 'lunar', name: 'Lunar Alloy', c: ['#C7D2DC', '#559FD1', '#55C985'], bg: '#08111B' },
    { id: 'forge', name: 'Solar Forge', c: ['#E87532', '#D9B744', '#ED5572'], bg: '#100B08' }, { id: 'helios', name: 'Helios Signal', c: ['#DFAE3F', '#52BE91', '#E66060'], bg: '#0D0E0A' },
    { id: 'europa', name: 'Europa Crown', c: ['#32C3D3', '#BE9D50', '#CE70A9'], bg: '#061116' }, { id: 'orbital', name: 'Orbital Command', c: ['#4B7FCA', '#B5C2D0', '#D89935'], bg: '#070D16' },
    { id: 'nebula', name: 'Nebula Relay', c: ['#8E60CC', '#4DB88C', '#DC717B'], bg: '#0B0812' }, { id: 'phobos', name: 'Phobos Night', c: ['#76B4CC', '#7C8898', '#CFAE47'], bg: '#05080D' }
  ];
  var themeId = 'ares';
  function themeById(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return null; }
  function applyTheme(id, announce) {
    var th = themeById(id) || THEMES[0]; themeId = th.id;
    if (th.id === 'ares') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', th.id);
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', th.bg);
    lsSet('marsai.theme', th.id);
    $$('.theme').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-id') === th.id); });
    if (announce) { say('Theme ' + th.name); log('Theme: ' + th.name); }
    return th;
  }
  function renderThemes(box) {
    if (!box) return; box.textContent = '';
    THEMES.forEach(function (th) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'theme'; b.setAttribute('data-id', th.id); b.setAttribute('aria-pressed', th.id === themeId);
      b.setAttribute('aria-label', 'Theme ' + th.name);
      var nm = document.createElement('b'); nm.textContent = th.name.toUpperCase(); b.appendChild(nm);
      var chips = document.createElement('span'); chips.className = 'chips'; th.c.forEach(function (col) { var i = document.createElement('i'); i.style.background = col; chips.appendChild(i); }); b.appendChild(chips);
      b.style.background = 'linear-gradient(135deg,' + th.bg + ',var(--edge))';
      b.addEventListener('click', function () { var x = applyTheme(th.id, true); reply('Theme set to ' + x.name + '.'); });
      box.appendChild(b);
    });
  }
  function nextTheme(step) { var i = 0; for (var k = 0; k < THEMES.length; k++) if (THEMES[k].id === themeId) i = k; return THEMES[(i + step + THEMES.length) % THEMES.length]; }
  var GROUPS = [['foundational', 'FOUNDATIONAL COMPANIONS'], ['male', 'MALE CONSTELLATION'], ['female', 'FEMALE CONSTELLATION']];
  function renderExtra() {
    var box = $('#module-extra'); box.textContent = '';
    if (current === 4) { var g = document.createElement('div'); g.className = 'themes'; box.appendChild(g); renderThemes(g); return; }
    if (current !== 1) return;
    var wrap = document.createElement('div'); wrap.className = 'roster';
    GROUPS.forEach(function (g) {
      var h = document.createElement('h4'); h.textContent = g[1]; wrap.appendChild(h);
      var ul = document.createElement('ul');
      CREW.filter(function (c) { return c.group === g[0]; }).forEach(function (c) {
        var li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-pressed', c.id === crewId);
        b.innerHTML = '<span class="sig" aria-hidden="true"></span><span><b class="nm"></b><span class="rl"></span></span>';
        $('.sig', b).textContent = c.sigil; $('.nm', b).textContent = c.name; $('.rl', b).textContent = c.role;
        b.setAttribute('aria-label', 'Talk to ' + c.name + ', ' + c.role);
        b.addEventListener('click', function () { setCrew(c.id, true); });
        li.appendChild(b); ul.appendChild(li);
      });
      wrap.appendChild(ul);
    });
    box.appendChild(wrap);
  }
  function setCrew(id, greet) {
    crewId = id;
    var c = me();
    $('#crew').textContent = label(c) + ' (' + c.role + ')';
    $('#crew-sigil').textContent = c.sigil; $('#crew-name').textContent = c.name; $('#crew-role').textContent = c.role;
    $('#crew-persona').textContent = c.persona; renderTrace();
    $$('.roster button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('aria-label').indexOf('Talk to ' + c.name + ',') === 0); });
    if (window.MarsVoice) MarsVoice.refreshVoices();
    log('Active crew: ' + label(c));
    if (greet) reply(line('greet'), 'greeting'); else say('Active crew ' + c.name + ', ' + c.role);
  }

  /* ---------- Chamber rack ---------- */
  var slots = [
    ['🔴', 'Talk to Mars', function () { setCrew('MARS', true); }],
    ['🟡', 'Talk to Venus', function () { setCrew('VENUS', true); }],
    ['⇄', 'Open Crew Link', function () { reply('Crew Link, where two of us examine a question together, arrives in a later build.'); }],
    ['+', 'Create Mission', function () { setModule(2, true); reply('Say "new mission" and the title, for example: new mission learn to bake bread.'); }],
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

  /* ---------- Onboard skills (work with no Python; data stays in this browser) ---------- */
  var STATE_KEY = 'marsai.state', mem = { notes: [], missions: [], messages: [], next: 1 };
  try { var d0 = JSON.parse(lsGet(STATE_KEY) || 'null'); if (d0 && d0.notes && d0.missions) mem = d0; } catch (e) {}
  if (!mem.messages) mem.messages = [];
  function persist() { lsSet(STATE_KEY, JSON.stringify(mem)); }
  function clean(s) { return s.replace(/\s+/g, ' ').replace(/^[,;:.\s-]+/, '').trim().slice(0, 500); }
  var JOKES = [
    'Why did the astronaut break up with the planet? It needed more space.',
    "I told the ship's AI a joke about gravity. It really fell for it.",
    'Mars has great hotels, but no atmosphere.',
    'Why did the comet get promoted? It was always going places.',
    'A moon walked into a bar. It was only a phase.',
    'The crew held a meeting in orbit. It went around in circles.'
  ];
  function onboard(raw) {
    var m, text = raw.trim().replace(/[.!,;]+$/, '').trim();
    if ((m = text.match(/^(?:complete|finish|done)\s+mission\s+#?(\d+)$/i))) {
      var id = parseInt(m[1], 10), found = mem.missions.filter(function (x) { return x.id === id; })[0];
      if (!found) return { text: 'No mission with that number. Try: my missions.', ev: 'warning' };
      found.done = true; persist(); return { text: 'Mission #' + id + ' complete: ' + found.title + '. Experience logged.', ev: 'celebrate' };
    }
    if ((m = text.match(/^(?:new|create|add)\s+mission\s*[:\-]?\s*(.*)$/i))) {
      if (!m[1].trim()) return { text: 'Name the mission. Try: new mission learn to bake bread.' };
      var mi = { id: mem.next++, title: clean(m[1]), done: false }; mem.missions.push(mi); mem.missions = mem.missions.slice(-500); persist();
      return { text: 'Mission #' + mi.id + ' created: ' + mi.title, ev: 'confirm' };
    }
    if (/^(?:my\s+missions|list\s+missions|show\s+missions)$/i.test(text)) {
      if (!mem.missions.length) return { text: 'No missions yet. Try: new mission <title>.' };
      return { text: 'Missions: ' + mem.missions.slice(-10).map(function (x) { return '#' + x.id + ' [' + (x.done ? 'done' : 'open') + '] ' + x.title; }).join(' | ') };
    }
    if ((m = text.match(/^(?:note|remember)(?:\s*[:\-,]\s*|\s+)(.+)$/i))) {
      var n = { id: mem.next++, text: clean(m[1]) }; mem.notes.push(n); mem.notes = mem.notes.slice(-500); persist();
      return { text: 'Noted (#' + n.id + '): ' + n.text, ev: 'confirm' };
    }
    if (/^(?:notes|my\s+notes|list\s+notes)$/i.test(text)) {
      if (!mem.notes.length) return { text: 'No notes yet. Try: note <text>.' };
      return { text: 'Notes: ' + mem.notes.slice(-10).map(function (x) { return '#' + x.id + ' ' + x.text; }).join(' | ') };
    }
    if (/^(?:what(?:'s| is)?\s+)?(?:the\s+)?(?:current\s+)?(?:time|date|day)(?:\s+(?:is it|now|today|right now))?\??$/i.test(text) || /^what time is it\??$/i.test(text)) {
      return { text: 'It is ' + new Date().toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }) + '.' };
    }
    if (/^(?:system\s+)?status\??$|^how(?:'s| is)\s+the\s+ship\??$/i.test(text)) {
      var bits = ['Onboard core online', navigator.onLine ? 'network up' : 'network down', (navigator.hardwareConcurrency || '?') + ' cores'];
      if (navigator.deviceMemory) bits.push(navigator.deviceMemory + ' GB memory class');
      bits.push('ShipCore ' + (link.online ? 'connected' : 'not connected'));
      bits.push('AI brain ' + (window.MarsBrain && MarsBrain.state() === 'ready' ? 'ready' : 'off'));
      return { text: bits.join(' | ') };
    }
    if (/^(?:tell\s+me\s+)?(?:a\s+)?joke$/i.test(text)) return { text: JOKES[Math.floor(Date.now() / 5000) % JOKES.length] };
    return null;
  }

  /* ---------- Conversation in the crew member's voice ---------- */
  function engineName() {
    if (link.online) return link.llm ? 'ShipCore with a local language model' : 'ShipCore';
    if (window.MarsBrain && MarsBrain.state() === 'ready') return 'the in-browser AI brain';
    return 'the onboard core';
  }
  function smalltalk(cmd) {
    var m;
    if ((m = cmd.match(/^(?:my name is|i am called|i'm called|call me|you can call me)\s+([a-z][a-z' -]{0,30})$/))) {
      captain = m[1].replace(/\b\w/g, function (ch) { return ch.toUpperCase(); }).trim(); lsSet('marsai.captain', captain);
      return 'Pleased to meet you, Captain ' + captain + '. I will remember that on this device.';
    }
    if (/^(?:what(?:'s| is) my name|who am i|do you know my name)$/.test(cmd)) return captain ? 'You are Captain ' + captain + '.' : "You haven't told me your name yet. Say: my name is ...";
    if (/\b(who are you|what are you|what is your name|what's your name|your name|introduce yourself|tell me about yourself)\b/.test(cmd)) return line('intro');
    if (/\bare you (an? )?(ai|robot|real|human|bot|person|alive)\b/.test(cmd)) return "I'm an AI crew personality in the MARSAI game, not a person. Right now my answers come from " + engineName() + '.';
    var hasGreet = /^(hi|hello|hey|yo|howdy|ahoy|greetings|good (morning|afternoon|evening|day)|hey there|hi there|hello there)\b/.test(cmd);
    var hasHow = /\b(how are you|how're you|how are things|how do you do|how's it going|how is it going|how have you been|are you ok|are you okay|you ok|you okay|what's up|whats up|sup)\b/.test(cmd);
    if (hasGreet && hasHow) return line('greet') + ' ' + line('how');
    if (hasHow) return line('how');
    if (hasGreet) return line('greet');
    if (/\b(thanks|thank you|thx|cheers|much appreciated)\b/.test(cmd) || /\b(good (job|work|bot)|well done|nice work|great job|you're (great|awesome|amazing))\b/.test(cmd)) return line('thanks');
    if (/^(bye|goodbye|see you|see ya|later|good night|goodnight|farewell|i'm off|i am off|talk later)\b/.test(cmd)) return line('bye');
    if (/\bi(?:'m| am| feel|'ve been)\b.*\b(sad|tired|stressed|anxious|depressed|down|overwhelmed|lonely|angry|frustrated|upset|burned out|burnt out|exhausted|worried|scared)\b/.test(cmd) || /\b(bad day|rough day|need motivation|motivate me|encourage me)\b/.test(cmd)) return line('cheer');
    if (/\b(what can you do|what do you do|can you help|what are you able to do|your capabilities)\b/.test(cmd)) {
      return 'I can chat as ' + me().name + ', check the weather ("weather in Paris"), look things up ("who is Ada Lovelace"), do math ("what is 15 times 7"), keep notes and missions, and tell the time. For open conversation, say "enable brain" (a small AI that runs in your browser) or run ShipCore with Ollama.';
    }
    return null;
  }
  var FALLBACK_TAIL_UNUSED = ' I can chat, check the weather, look things up on Wikipedia, do math, and keep notes and missions. For open conversation, say "enable brain" (a small AI that runs in your browser, no key).';

  /* ---------- Math (safe parser, no eval) ---------- */
  function evalMath(str) {
    var i = 0, s = str.replace(/\s+/g, '').replace(/[x×]/gi, '*').replace(/÷/g, '/');
    function num() { var m = /^\d*\.?\d+/.exec(s.slice(i)); if (!m) throw 0; i += m[0].length; return parseFloat(m[0]); }
    function prim() { if (s[i] === '(') { i++; var v = add(); if (s[i] !== ')') throw 0; i++; return v; } if (s[i] === '-') { i++; return -prim(); } if (s[i] === '+') { i++; return prim(); } return num(); }
    function pow() { var b = prim(); if (s[i] === '^') { i++; return Math.pow(b, pow()); } return b; }
    function mul() { var v = pow(); while (s[i] === '*' || s[i] === '/') { var op = s[i++], r = pow(); v = op === '*' ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (s[i] === '+' || s[i] === '-') { var op = s[i++], r = mul(); v = op === '+' ? v + r : v - r; } return v; }
    var v = add(); if (i !== s.length || !isFinite(v)) throw 0; return v;
  }
  function mathIntent(cmd) {
    var t = cmd.replace(/^(?:what(?:'s| is)|calculate|compute|how much is|solve)\s+/, '').replace(/\?$/, '')
      .replace(/\bplus\b/g, '+').replace(/\bminus\b/g, '-').replace(/\b(?:times|multiplied by)\b/g, '*').replace(/\b(?:divided by|over)\b/g, '/')
      .replace(/\bto the power of\b/g, '^').replace(/\bsquared\b/g, '^2').replace(/\bcubed\b/g, '^3').replace(/,/g, '');
    if (!/^[\d\s.+\-*/()^x×÷]+$/.test(t) || !/\d/.test(t) || !/[+\-*/^x×÷]/.test(t.replace(/^-/, ''))) return null;
    try { var v = evalMath(t); return (Math.round(v * 1e9) / 1e9).toString(); } catch (e) { return null; }
  }

  /* ---------- Web data: weather, stocks, news, glossary, facts (see webdata.js). No keys. Every request is logged. ---------- */
  var pending = null, glossaryTerms = [];
  function netMsg(e, what) {
    if (e && e.status === 429) return 'The ' + what + ' is rate limiting requests right now. Try again in a little while.';
    if (e && e.status) return 'The ' + what + ' returned an error (' + e.status + '). Try again later.';
    return "I couldn't reach the " + what + ' just now. Check your connection and try again.';
  }
  function webOff() { return 'Web data is off. Turn it on in Subsystems (or say "web on") to allow weather, stocks, news, and facts. No keys, and every request is logged.'; }
  var web = window.MarsWeb ? MarsWeb.create({ imperial: /^en-US/i.test(navigator.language || ''), log: function (m) { log(m); } }) : null;
  function webCall(fn, what) {
    if (!web) return Promise.resolve({ text: 'Web data is not available right now.' });
    if (!webOn) return Promise.resolve({ text: webOff() });
    return fn().catch(function (e) { return { text: netMsg(e, what) }; });
  }
  function loadGlossary() { if (web && webOn && !glossaryTerms.length) web.loadGlossary().then(function (ts) { glossaryTerms = ts.map(function (x) { return x.term.toLowerCase(); }); }, function () {}); }
  function doWeather(a) {
    if (a.here) {
      if (!navigator.geolocation) return Promise.resolve({ text: "This browser can't share your location. Say: weather in <city>." });
      return new Promise(function (res) {
        navigator.geolocation.getCurrentPosition(function (p) {
          webCall(function () { return web.weather({ lat: p.coords.latitude.toFixed(3), lon: p.coords.longitude.toFixed(3), label: 'Your location', ask: a.ask }); }, 'weather service').then(res);
        }, function () { res({ text: 'Location access was not granted. Say: weather in <city>.' }); }, { timeout: 10000 });
      });
    }
    var city = a.city || lsGet('marsai.city');
    if (!city) { pending = 'city'; return Promise.resolve({ text: 'Which city? (Or say "weather here" to use your location.)' }); }
    return webCall(function () { return web.weather({ city: city, ask: a.ask }).then(function (r) { if (r.place) lsSet('marsai.city', r.place); return r; }); }, 'weather service');
  }
  function doSearch(q) { return webCall(function () { return web.wiki(q); }, 'Wikipedia'); }

  /* ---------- Phone messages (WYWO quick-type parser, MPL-2.0, see assets/vendor) ---------- */
  var WYWO = 'https://sukonik.github.io/wywo/';
  function msgLine(o) {
    var b = [];
    b.push('From ' + (o.caller || 'an unknown caller') + (o.company ? ' (' + o.company + ')' : ''));
    if (o.phone) b.push(o.phone); if (o.alt) b.push(o.alt); if (o.forWho) b.push('for ' + o.forWho);
    return b.join(', ');
  }
  function addMessage(text) {
    if (!window.QuickType) { reply('The message parser is not available right now. Use "note ..." instead.'); return; }
    var o = QuickType.parse(text), rec = { id: mem.next++, at: Date.now(), caller: o.caller || '', company: o.company || '', phone: o.phone || '', alt: o.alt || '', forWho: o.forWho || '', reason: o.reason || '', topics: o.topics || '', urgent: !!o.urgent, time: o.time || '', action: o.action || '', extra: o.extra || '' };
    mem.messages.push(rec); mem.messages = mem.messages.slice(-200); persist();
    var s = 'Message #' + rec.id + ' saved. ' + msgLine(rec) + '.' + (rec.topics ? ' About: ' + rec.topics.replace(/\n/g, ', ') + '.' : rec.reason ? ' ' + rec.reason : '') + (rec.urgent ? ' Marked urgent.' : '');
    reply(s, rec.urgent ? 'warning' : 'confirm', [{ title: 'Open WYWO to print or export this note', url: WYWO, sub: 'While You Were Out: turns a call into a clear, printable callback note' }]);
  }
  function listMessages() {
    if (!mem.messages.length) { reply('No messages yet. Say "take a message" and then tell me who called and what they need.'); return; }
    var last = mem.messages.slice(-5).reverse();
    reply('You have ' + mem.messages.length + ' message' + (mem.messages.length === 1 ? '' : 's') + '. Most recent first:', null, last.map(function (r) {
      return { title: (r.urgent ? 'URGENT · ' : '') + msgLine(r), sub: (r.topics ? r.topics.replace(/\n/g, ', ') : r.reason) + ' · ' + new Date(r.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) };
    }).concat([{ title: 'Open WYWO to print or export', url: WYWO }]));
  }

  /* ---------- ShipCore link (optional local Python service, no key) ---------- */
  function updateBadge() {
    var brainReady = window.MarsBrain && MarsBrain.state() === 'ready';
    var t = link.online ? (link.llm ? 'SHIPCORE + LOCAL AI' : 'SHIPCORE') : (brainReady ? 'ONBOARD + AI BRAIN' : 'ONBOARD CORE');
    $('#link-text').textContent = t;
    renderTrace(); updateBoot(); refreshSwitches();
  }
  function setLink(online, info) {
    link.online = online;
    link.llm = !!(online && info && info.providers && info.providers.some(function (p) { return p.available; }));
    updateBadge();
  }
  function checkLink(announce) {
    if (!coreEnabled) { setLink(false); return Promise.resolve(); }
    coreSearching = true; refreshSwitches();
    return timeoutFetch(SHIPCORE + '/health', {}, 1500)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (info) { coreSearching = false; setLink(true, info); if (window.MarsVoice) MarsVoice.refresh(); if (announce) reply('ShipCore connected (v' + info.version + ').'); })
      .catch(function () { coreSearching = false; setLink(false); if (window.MarsVoice) MarsVoice.refresh(); if (announce) reply('ShipCore was not found on this machine. Using the onboard core. See docs/SHIPCORE.md.'); });
  }
  function ask(raw) {
    return timeoutFetch(SHIPCORE + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: raw, crew: crewId })
    }, 95000).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .catch(function () { setLink(false); reply('The ShipCore link was lost. Back to the onboard core.', 'warning'); return null; });
  }
  var SC_EVENT = { 'skill:mission_add': 'confirm', 'skill:note_add': 'confirm', 'skill:mission_done': 'celebrate' };

  /* ---------- Subsystems: switches with indicator lights. Everything is ON by default; the captain can turn any of it off. ---------- */
  var coreEnabled = lsGet('marsai.core') !== '0', coreSearching = false, brainPct = 0, brainNote = null, brainSkipped = '';
  function swSet(key, on, text, busy) {
    var el = $('#sw-' + key); if (!el) return;
    el.setAttribute('aria-checked', !!on); el.setAttribute('data-state', busy ? 'busy' : on ? 'on' : 'off');
    var s = $('#st-' + key); if (s) s.textContent = text;
  }
  function refreshSwitches() {
    var v = window.MarsVoice, bs = window.MarsBrain ? MarsBrain.state() : 'off';
    swSet('voice', v && v.enabled(), !v || !v.canSpeak() ? (v && v.enabled() ? 'NO VOICE' : 'OFF') : (v.enabled() ? 'ON' : 'OFF'));
    swSet('mic', v && v.micEnabled() && v.micPossible(), !v || !v.micPossible() ? 'NO MIC' : (v.micEnabled() ? 'READY' : 'OFF'));
    swSet('web', webOn, webOn ? 'ON' : 'OFF');
    swSet('brain', bs === 'ready' || bs === 'loading', bs === 'ready' ? 'ON ' + (MarsBrain.device() === 'webgpu' ? 'GPU' : 'CPU') : bs === 'loading' ? brainPct + '%' : (brainSkipped || 'OFF'), bs === 'loading');
    swSet('core', coreEnabled && link.online, !coreEnabled ? 'OFF' : link.online ? (link.llm ? 'LOCAL AI' : 'CONNECTED') : (coreSearching ? 'SEARCHING' : 'NOT FOUND'), coreEnabled && coreSearching);
    swSet('sfx', v && v.sfxEnabled(), v && v.sfxEnabled() ? 'ON' : 'OFF');
  }
  function brainUi(state, extra) {
    extra = extra || {};
    if (state === 'loading') {
      brainPct = extra.pct || 0;
      if (!brainNote) brainNote = addMsg('sys', '', 'AI brain downloading...');
      brainNote.textContent = 'AI brain downloading: ' + brainPct + '%';
    } else if (state === 'ready') {
      addMsg('sys', '', 'AI brain ready (' + (extra.device === 'webgpu' ? 'GPU' : 'CPU') + '). Open conversation is richer now.'); brainNote = null;
    } else if (state === 'error') {
      brainNote = null; addMsg('sys', '', 'AI brain could not start: ' + (extra.message || 'unknown error') + '. I still chat, look things up, and run all my skills.');
    } else { brainNote = null; }
    updateBadge();
  }
  if (window.MarsBrain) MarsBrain.onChange(brainUi);
  function brainOn(manual) {
    if (!window.MarsBrain || MarsBrain.state() !== 'off') return;
    lsSet('marsai.brain', '1'); brainSkipped = '';
    addMsg('sys', '', 'Loading the on-device AI (about 400 MB, once, then cached). I can chat and use every skill while it loads.');
    MarsBrain.enable(); refreshSwitches();
  }
  function autoBrain() {      // default ON at power-on, but kind to slow connections and small devices
    if (!window.MarsBrain || MarsBrain.state() !== 'off' || lsGet('marsai.brain') === '0') return;
    var c = navigator.connection || {};
    if (c.saveData || /^(slow-2g|2g|3g)$/.test(c.effectiveType || '')) { brainSkipped = 'SKIPPED'; addMsg('sys', '', 'Skipped the on-device AI download because of a slow or data-saving connection. Turn on "AI brain" in Subsystems when you are ready.'); refreshSwitches(); return; }
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) { brainSkipped = 'SKIPPED'; addMsg('sys', '', 'Skipped the on-device AI because this device has little memory. I still chat and use every skill.'); refreshSwitches(); return; }
    brainOn(false);
  }
  function brainOff() { lsSet('marsai.brain', '0'); brainSkipped = ''; if (window.MarsBrain) MarsBrain.disable(); refreshSwitches(); }
  function coreToggle(on) {
    coreEnabled = !!on; lsSet('marsai.core', on ? '1' : '0');
    if (on) checkLink(true); else { setLink(false); if (window.MarsVoice) MarsVoice.refresh(); }
    refreshSwitches();
  }
  function toggleSwitch(key) {
    var v = window.MarsVoice, el = $('#sw-' + key), on = el.getAttribute('aria-checked') !== 'true';
    if (key === 'voice') { var ok = v.setSpeak(on); if (on && !ok) addMsg('sys', '', 'This device has no speech voices, so I will stay in text.'); }
    else if (key === 'mic') { var mk = v.setMic(on); if (on && !mk) addMsg('sys', '', 'Voice input is not available in this browser. Typing works everywhere.'); }
    else if (key === 'web') webToggle(on);
    else if (key === 'brain') { if (on) brainOn(true); else brainOff(); }
    else if (key === 'core') coreToggle(on);
    else if (key === 'sfx') v.setSfx(on);
    refreshSwitches(); say(el.querySelector('.nm').textContent + (on ? ' on' : ' off'));
  }
  $$('.sw').forEach(function (b) { b.addEventListener('click', function () { toggleSwitch(b.getAttribute('data-sw')); }); });
  function brainReply(raw) {
    var c = me();
    var sys = 'You are ' + c.name + ', the ' + c.role + ' aboard the captain\'s starship in an original game called MARSAI. Personality: ' + c.persona +
      ' Always answer in first person as ' + c.name + ', in that personality, in one to three short sentences. Never say you are an AI model or an assistant, and never lecture. ' +
      'You cannot access the internet or live data such as weather, and you must not claim to run commands.' +
      (captain ? ' The captain\'s name is ' + captain + '.' : '');
    // Two in-character example turns (the crew member's own lines) anchor the voice for a small model.
    var shots = [{ role: 'user', content: 'Hello!' }, { role: 'assistant', content: fill((c.lines.greet || [''])[0]) },
      { role: 'user', content: "I'm feeling stressed." }, { role: 'assistant', content: fill((c.lines.cheer || [''])[0]) }];
    var msgs = [{ role: 'system', content: sys }].concat(shots, history.slice(-6), [{ role: 'user', content: raw }]);
    var node = addMsg('crew', label(c), '...'), started = false;
    return MarsBrain.chat(msgs, function (tok) { if (!started) { node.textContent = ''; started = true; } node.textContent += tok; convo.scrollTop = convo.scrollHeight; })
      .then(function (text) {
        node.textContent = text; history.push({ role: 'user', content: raw }, { role: 'assistant', content: text });
        if (window.MarsVoice) MarsVoice.speak(text);
      }).catch(function () { node.textContent = 'My thoughts got tangled there. Ask me again?'; });
  }
  function webToggle(on) { webOn = on; lsSet('marsai.web', on ? '1' : '0'); refreshSwitches(); }
  webToggle(webOn);

  /* ---------- Command handling ---------- */
  var HELP = 'Just talk to me. For example: "take me to the crew", "talk to Pluto", "I need someone to challenge my plan", "remind me to call mom", "what is on my plate", "take a message: Phil called 555-123-4567 about the invoice", ' +
    '"do I need an umbrella in Paris?", "price of SCHD", "any AI news?", "what is hallucination?", "who is Ada Lovelace?", "tell me a joke", "change the theme to Solar Forge", "turn off the voice". I will ask if I am unsure.';

  /* ---------- Plain-language actions (MarsCopilot understands, this executes) ---------- */
  var pendingAct = null;
  function ack() { return line('ack'); }
  function plainMissions(ms) {
    var open = ms.filter(function (x) { return !x.done; }), done = ms.length - open.length;
    if (!ms.length) return 'You have no missions yet. Say "remind me to ..." and I will log one.';
    if (!open.length) return 'Every mission is done. ' + done + ' completed. Nicely done, ' + (captain || 'Captain') + '.';
    var list = open.slice(-8).map(function (x) { return '#' + x.id + ' ' + x.title; }).join(', ');
    return 'You have ' + open.length + ' open mission' + (open.length === 1 ? '' : 's') + ': ' + list + '.' + (done ? ' ' + done + ' already done.' : '');
  }
  function getMissions() {
    if (!link.online) return Promise.resolve(mem.missions);
    return timeoutFetch(SHIPCORE + '/missions', {}, 1500).then(function (r) { return r.json(); }).then(function (d) { return d.missions || []; }).catch(function () { return mem.missions; });
  }
  function store(cmd, ev) {    // run a mission/note command on ShipCore when linked, else on the onboard core
    if (link.online) return ask(cmd).then(function (d) { if (d) reply(d.reply, ev); });
    var ob = onboard(cmd); reply(ob ? ob.text : 'I could not do that.', ob && ob.ev || ev); return Promise.resolve();
  }
  function openSettings() { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  function setFs(on) { if (!!fsEl() !== !!on) toggleFs(); }
  function switchTo(id, passText) {
    var to = crewObj(id);
    if (to.id === crewId) { reply('You are already talking to ' + to.name + '.'); return; }
    if (passText) reply(passText + ' Passing you to ' + to.name + '.');
    setTimeout(function () { setCrew(to.id, true); }, passText ? 450 : 0);
  }
  function confirmAction(p) {
    if (p.type === 'switch') { switchTo(p.crew, ack()); return Promise.resolve(); }
    if (p.type === 'mission') return store('new mission ' + p.title, 'confirm');
    if (p.type === 'choose') return Promise.resolve();
    return Promise.resolve();
  }
  function runAction(a, raw) {
    var c = me(), i;
    switch (a.intent) {
      case 'yes':
        if (pendingAct) { var p = pendingAct; pendingAct = null; return confirmAction(p); }
        return null;
      case 'no':
        if (pendingAct) { pendingAct = null; reply('No problem. Just say the word.'); return Promise.resolve(); }
        return null;
      case 'navigate':
        i = findModule(a.module); setModule(i, true); reply(ack() + ' Opening ' + modules[i][0] + '. ' + modules[i][1].split('. ')[0] + '.'); return Promise.resolve();
      case 'switch_crew': switchTo(a.crew, ack()); return Promise.resolve();
      case 'random_crew': {
        var others = CREW.filter(function (x) { return x.id !== crewId; }); switchTo(others[Math.floor(Math.random() * others.length)].id, ack()); return Promise.resolve();
      }
      case 'choose_crew':
        pendingAct = { type: 'choose', options: a.options };
        reply('Which ' + a.role + ' do you want: ' + a.options.map(function (id) { return crewObj(id).name; }).join(', ').replace(/, ([^,]*)$/, ' or $1') + '?'); return Promise.resolve();
      case 'list_crew':
        reply('The crew: ' + CREW.map(function (x) { return x.sigil + ' ' + x.name + ' (' + x.role + ')'; }).join(', ') + '. Open the Crew module or just say who you want.'); return Promise.resolve();
      case 'about_crew': {
        var k = crewObj(a.crew);
        reply(k.sigil + ' ' + k.name + ' is our ' + k.role + '. In their words: "' + fill(k.lines.intro[0]) + '" Say "talk to ' + k.name + '" to bring them on.'); return Promise.resolve();
      }
      case 'address':
        setCrew(a.crew, false); addMsg('sys', '', 'Now talking to ' + label(crewObj(a.crew)) + '.'); return handle(a.rest);
      case 'recommend':
        if (!a.crew) { reply('Tell me a little more about what you need, like planning, a tough decision, learning something, or building something, and I will point you to the right crew member.'); return Promise.resolve(); }
        var rc = crewObj(a.crew);
        if (rc.id === crewId) { reply('That is right up my alley. Tell me more.'); return Promise.resolve(); }
        pendingAct = { type: 'switch', crew: rc.id };
        reply('For ' + a.topic + ', I would bring in ' + rc.sigil + ' ' + rc.name + ', our ' + rc.role + '.' + (a.others && a.others.length ? ' ' + a.others.map(function (id) { return crewObj(id).name; }).join(' or ') + ' could also help.' : '') + ' Shall I put ' + rc.name + ' on?'); return Promise.resolve();
      case 'mission_add': return store('new mission ' + a.title, 'confirm');
      case 'mission_soft':
        pendingAct = { type: 'mission', title: a.title }; reply('Want me to log that as a mission: "' + a.title + '"?'); return Promise.resolve();
      case 'mission_list': return link.online ? store('my missions') : (reply(plainMissions(mem.missions)), Promise.resolve());
      case 'mission_done':
        if (a.id) return store('complete mission ' + a.id, 'celebrate');
        return getMissions().then(function (ms) {
          var open = ms.filter(function (x) { return !x.done; });
          reply(open.length ? 'I could not find a mission matching that. Your open ones: ' + open.slice(-6).map(function (x) { return '#' + x.id + ' ' + x.title; }).join(', ') + '. Say "complete mission" and the number.' : 'You have no open missions to complete.', 'warning');
        });
      case 'note_add':
        if (!a.text) { reply('What should I write down?'); return Promise.resolve(); }
        return store('note ' + a.text, 'confirm');
      case 'note_list': return link.online ? store('notes') : (reply(mem.notes.length ? 'Your notes: ' + mem.notes.slice(-8).map(function (x) { return '#' + x.id + ' ' + x.text; }).join(' | ') : 'No notes yet. Say "write this down" and then what to remember.'), Promise.resolve());
      case 'about_me':
        reply((captain ? 'You are Captain ' + captain + '. ' : 'You have not told me your name yet. Say "my name is ...". ') + 'I am holding ' + mem.notes.length + ' note' + (mem.notes.length === 1 ? '' : 's') + ' and ' + mem.missions.filter(function (x) { return !x.done; }).length + ' open mission(s) on this device.'); return Promise.resolve();
      case 'time': reply(onboard('what time is it').text); return Promise.resolve();
      case 'date': reply('Today is ' + new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '.'); return Promise.resolve();
      case 'math':
        try { reply('That comes to ' + (Math.round(evalMath(a.expr) * 1e9) / 1e9) + '.'); } catch (e) { return null; } return Promise.resolve();
      case 'weather': return doWeather(a).then(function (r) { reply(r.text, null, r.cards); });
      case 'fact': return doSearch(a.query).then(function (r) { reply(r.text, null, r.cards); });
      case 'stock':
        if (!a.query) { pending = 'stock'; reply('Which ticker or company? For example SCHD, KO, or Apple.'); return Promise.resolve(); }
        return webCall(function () { return web.stock(a.query); }, 'Payout Lab data').then(function (r) { reply(r.text, null, r.cards); });
      case 'news': return webCall(function () { return web.news(a.topic); }, 'GoldBrief news').then(function (r) { reply(r.text, null, r.cards); });
      case 'glossary': return webCall(function () { return web.glossary(a.term).then(function (r) { return r || web.wiki(a.term); }); }, 'GoldBrief glossary').then(function (r) { reply(r.text, null, r.cards); });
      case 'message_add':
        if (!a.text) { pending = 'message'; reply('Okay, go ahead. Tell me who called, their number, who it is for, and what they need.'); return Promise.resolve(); }
        addMessage(a.text); return Promise.resolve();
      case 'message_list': listMessages(); return Promise.resolve();
      case 'theme': {
        var th = a.id ? applyTheme(a.id, true) : applyTheme((a.random ? THEMES[Math.floor(Math.random() * THEMES.length)] : nextTheme(a.prev ? -1 : 1)).id, true);
        reply(ack() + ' Theme: ' + th.name + '.'); return Promise.resolve();
      }
      case 'list_themes': reply('Eight themes: ' + THEMES.map(function (x) { return x.name; }).join(', ') + '. Say "change the theme to Solar Forge", or open Theme Lab.'); return Promise.resolve();
      case 'open_app': {
        var apps = { clearsky: ['ClearSky Weather', 'https://sukonik.github.io/weather-app/', 'Hourly forecast, wind, tides, air quality, UV, and moon'], payout: ['Payout Lab', 'https://sukonik.github.io/payout-lab/', 'Stress-test the dividend portfolio you already own'],
          goldbrief: ['GoldBrief', 'https://sukonik.github.io/goldbrief/', 'AI news, explained, with sources and labels'], wywo: ['WYWO: While You Were Out', WYWO, 'Turn a phone call into a printable callback note'] };
        var ap = apps[a.app]; reply(ack() + ' Here is ' + ap[0] + '.', null, [{ title: ap[0], url: ap[1], sub: ap[2] }]); return Promise.resolve();
      }
      case 'voice': {
        var ok = window.MarsVoice ? MarsVoice.setSpeak(a.on) : false;
        reply(a.on ? (ok ? ack() + ' I will speak my replies.' : 'I have no voice on this device, so I will stay in text.') : ack() + ' Going quiet.'); return Promise.resolve();
      }
      case 'listen':
        if (window.MarsVoice && MarsVoice.listen()) addMsg('sys', '', 'Listening...'); else reply('I cannot listen on this device. Typing works fine.'); return Promise.resolve();
      case 'fullscreen': setFs(a.on); reply(ack() + (a.on ? ' Going full screen.' : ' Leaving full screen.')); return Promise.resolve();
      case 'clear': convo.textContent = ''; logEl.textContent = ''; return Promise.resolve();
      case 'brain': if (a.on) { brainOn(true); } else { brainOff(); reply('AI brain is off.'); } return Promise.resolve();
      case 'web': webToggle(a.on); reply(a.on ? 'Web lookups are on. Weather and Wikipedia requests are logged.' : 'Web lookups are off.'); return Promise.resolve();
      case 'connect': return checkLink(true);
      case 'settings': openSettings(); reply(ack() + ' Opening systems.'); return Promise.resolve();
      case 'power_off': reply(line('bye')); setTimeout(function () { power(false); }, 1100); return Promise.resolve();
      case 'help': reply(HELP); return Promise.resolve();
    }
    return null;
  }

  function handle(raw) {
    var cmd = raw.toLowerCase().replace(/[.!,;]+$/, '').replace(/\s+/g, ' ').trim();
    if (pending) {
      var kind = pending; pending = null;
      if (/^(never mind|nevermind|cancel|no|skip|forget it)$/.test(cmd)) { reply('No problem.'); return Promise.resolve(); }
      if (kind === 'city') return doWeather({ city: raw.trim() }).then(function (r) { reply(r.text, null, r.cards); });
      if (kind === 'stock') return webCall(function () { return web.stock(raw.trim()); }, 'Payout Lab data').then(function (r) { reply(r.text, null, r.cards); });
      if (kind === 'message') { addMessage(raw); return Promise.resolve(); }
    }
    if (pendingAct && pendingAct.type === 'choose') {          // answering "which guardian?"
      var opt = pendingAct.options.map(crewObj).filter(function (x) { return cmd.indexOf(x.name.toLowerCase()) > -1; })[0];
      if (opt) { pendingAct = null; switchTo(opt.id, ack()); return Promise.resolve(); }
      pendingAct = null;
    }
    if (cmd === 'help' || cmd === '?') { reply(HELP); return Promise.resolve(); }
    if (cmd === 'clear') { convo.textContent = ''; logEl.textContent = ''; return Promise.resolve(); }
    if (cmd === 'power off' || cmd === 'off' || cmd === 'shut down') { power(false); return Promise.resolve(); }
    if (cmd === 'connect') { return checkLink(true); }
    if (cmd === 'fullscreen' || cmd === 'full screen') { toggleFs(); return Promise.resolve(); }
    if (cmd === 'web off') { webToggle(false); reply('Web lookups are off.'); return Promise.resolve(); }
    if (cmd === 'web on') { webToggle(true); reply('Web lookups are on. Weather and Wikipedia requests are logged.'); return Promise.resolve(); }
    if (cmd === 'enable brain' || cmd === 'brain on' || cmd === 'turn on brain') { brainOn(true); return Promise.resolve(); }
    if (cmd === 'disable brain' || cmd === 'brain off') { brainOff(); reply('AI brain is off.'); return Promise.resolve(); }
    var mod = findModule(cmd.replace(/^(?:open|go to|goto|show|show me|take me to|switch to)\s+(?:the\s+)?/, ''));
    if (mod > -1) { setModule(mod, true); return Promise.resolve(); }
    var cm = cmd.match(/^(?:talk to|speak to|speak with|talk with|switch to|put on|let me talk to|i want to talk to|connect me to|get me|bring up|call)\s+(?:crew member\s+)?([a-z]+)$/) || cmd.match(/^([a-z]+)$/);
    if (cm && findCrew(cm[1])) { setCrew(findCrew(cm[1]).id, true); return Promise.resolve(); }
    if (/^(?:who(?:'s| is) on the crew|list (?:the )?crew|crew list|show (?:the )?crew|who can i talk to)$/.test(cmd)) {
      reply('The crew: ' + CREW.map(function (c) { return c.sigil + ' ' + c.name + ' (' + c.role + ')'; }).join(', ') + '.'); return Promise.resolve();
    }
    if (window.MarsCopilot) {
      var needsMissions = /\b(finish|finished|complete|completed|done|mark|cross|check off|tick|wrapped|nailed|did)\b/.test(cmd);
      return (needsMissions ? getMissions() : Promise.resolve(mem.missions)).then(function (ms) {
        var act = MarsCopilot.analyze(raw, { crew: CREW, missions: ms, themes: THEMES, glossary: glossaryTerms });
        var out = act ? runAction(act, raw) : null;
        if (out) return out;
        return rest(raw, cmd);
      });
    }
    return rest(raw, cmd);
  }
  function rest(raw, cmd) {
    var st = smalltalk(cmd); if (st) { reply(st); return Promise.resolve(); }
    if (window.MarsDialog) { var d = MarsDialog.respond(raw, { crew: me(), captain: captain, now: new Date() }); if (d) { reply(d.text); return Promise.resolve(); } }
    var QUESTION = /\?\s*$|^(?:who|what|why|how|when|where|which|is|are|can|does|do|did|will|was|were)\b/i, PERSONAL = /\b(?:you|your|yours|i|my|me|we|us|our|should|would|could)\b/i;
    var go = function () {
      if (window.MarsBrain && MarsBrain.state() === 'ready') return brainReply(raw);
      var q = raw.replace(/\?+\s*$/, '').trim();
      if (webOn && web && QUESTION.test(raw) && !PERSONAL.test(raw) && q.split(/\s+/).length >= 2) {      // a general question: find real answers with links
        return doSearch(q.replace(/^(?:who|what|why|how|when|where|which)\s+(?:is|are|was|were|does|do|did)\s+/i, '')).then(function (r) { reply(r.text, null, r.cards); });
      }
      var text = window.MarsDialog ? MarsDialog.fallback({ crew: me(), captain: captain }) : line('unknown');
      reply(text + (MarsBrain && MarsBrain.state() === 'loading' ? ' My AI brain is still loading, so ask me again in a moment for a fuller answer.' : ''), null,
        webOn ? [{ title: 'Search the web for "' + (q.length > 40 ? q.slice(0, 40) + '...' : q) + '"', url: 'https://duckduckgo.com/?q=' + encodeURIComponent(q), sub: 'DuckDuckGo' }] : null);
      return Promise.resolve();
    };
    if (link.online) return ask(raw).then(function (d2) {
      if (d2 && d2.source !== 'fallback') reply(d2.reply, SC_EVENT[d2.source]); else if (d2) return go();
    });
    var ob = onboard(raw);
    if (ob) { reply(ob.text, ob.ev); return Promise.resolve(); }
    return Promise.resolve(go());
  }
  $('#console-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('#cmd'), raw = input.value.trim();
    if (!raw) return;
    input.value = ''; addMsg('you', 'YOU', raw);
    handle(raw).catch(function () { reply('Something went wrong on my end. Please try again.', 'warning'); });
  });
  $('#clear').addEventListener('click', function () { convo.textContent = ''; logEl.textContent = ''; $('#cmd').focus(); });

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
    fsBtn.textContent = on ? 'EXIT' : 'FULL';
    if (hud.hidden) return;
    say(on ? 'Full screen on' : 'Full screen off');
  }
  fsBtn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', syncFs);
  document.addEventListener('webkitfullscreenchange', syncFs);

  /* ---------- Session clock ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var n = new Date();
    $('#clock-date').textContent = n.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    $('#clock-time').textContent = n.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function startClock() { stopClock(); tick(); timer = setInterval(tick, 15000); }
  function stopClock() { if (timer) { clearInterval(timer); timer = null; } }
  document.addEventListener('visibilitychange', function () {
    if (hud.hidden) return;
    if (document.hidden) stopClock(); else startClock();
  });



  function updateBoot() {
    var l = $('#boot-link'); if (!l) return;
    l.textContent = link.online ? (link.llm ? 'CONNECTED + LOCAL AI' : 'CONNECTED') : 'ONBOARD CORE';
    $('#boot-crew').textContent = CREW.length + '/' + CREW.length;
    var v = $('#voice-state'); $('#boot-voice').textContent = v && v.textContent === 'READY' ? 'READY' : 'TEXT ONLY';
  }
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Settings dialog ---------- */
  var dlg = $('#settings');
  $('#settings-btn').addEventListener('click', function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); });
  $('#settings-close').addEventListener('click', function () { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg && dlg.close) dlg.close(); });

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
      setCrew(crewId, false);
      try { window.history.replaceState(null, '', '#hud'); } catch (e) {}
      $('#hud-title').focus();
      say('HUD powered on.');
      log('Power on.');
      checkLink(false);
      updateBoot();
      if (!convo.children.length) setTimeout(function () { reply(line('greet'), 'greeting'); }, reduced ? 350 : 2300);
      refreshSwitches(); loadGlossary(); setTimeout(autoBrain, reduced ? 400 : 2400);
    } else {
      if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {} }
      stopClock(); closeDrawer(); if (window.MarsVoice) MarsVoice.stop(); if (dlg.open && dlg.close) dlg.close();
      hud.hidden = true;
      site.inert = false;
      document.body.classList.remove('hud-on');
      try { window.history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      (opener && document.contains(opener) ? opener : powerOn).focus();
      say('HUD powered off.');
    }
  }
  powerOn.addEventListener('click', function () { power(true, powerOn); });
  powerOff.addEventListener('click', function () { power(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || hud.hidden || dlg.open) return;
    if (hud.classList.contains('drawer-open')) { closeDrawer(); drawerBtn.focus(); return; }
    power(false);
  });

  /* ---------- Physical controls: knobs, finishes, specular light, tactile ticks (adapted from the GoldenSunDJ controller) ---------- */
  function haptic() { try { if (navigator.vibrate) navigator.vibrate(7); } catch (e) {} }
  function bindSlider(id, outId, o) {      // neon sliders: glowing fill, glossy pill thumb, a tick on every step band
    var el = $(id), out = $(outId); if (!el) return;
    var lastBand = null;
    function paint() { var p = (el.value - el.min) / (el.max - el.min) * 100; el.style.setProperty('--p', p + '%'); out.textContent = o.fmt(+el.value); }
    el.addEventListener('input', function () {
      paint(); o.set(+el.value);
      var band = Math.floor((el.value - el.min) / o.tick); if (lastBand !== null && band !== lastBand) { haptic(); if (window.MarsVoice) MarsVoice.cue('tick'); } lastBand = band;
    });
    el.value = o.get(); paint(); lastBand = Math.floor((el.value - el.min) / o.tick);
    return { sync: function () { el.value = o.get(); paint(); } };
  }
  var speedSlider = bindSlider('#sl-speed', '#kv-speed', { tick: 10, get: function () { return Math.round((window.MarsVoice ? MarsVoice.getRate() : 1) * 100); }, set: function (v) { if (window.MarsVoice) MarsVoice.setRate(v / 100); }, fmt: function (v) { return (v / 100).toFixed(2) + 'x'; } });
  bindSlider('#sl-vol', '#kv-vol', { tick: 10, get: function () { return Math.round((window.MarsVoice ? MarsVoice.getVolume() : 0.8) * 100); }, set: function (v) { if (window.MarsVoice) MarsVoice.setVolume(v / 100); }, fmt: function (v) { return v + ''; } });
  (function () { var r = $('#voice-rate'); if (!r) return; var paint = function () { r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'); }; r.addEventListener('input', function () { paint(); if (speedSlider) speedSlider.sync(); }); paint(); })();
  function applyMaterial(id) {
    if (['carbon', 'titanium', 'matte'].indexOf(id) < 0) id = 'carbon';
    hud.setAttribute('data-material', id); lsSet('marsai.material', id);
    $$('#finishes .key').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-material') === id); });
    return id;
  }
  $$('#finishes .key').forEach(function (b) { b.addEventListener('click', function () { applyMaterial(b.getAttribute('data-material')); }); });
  applyMaterial(lsGet('marsai.material') || 'carbon');
  hud.addEventListener('pointerdown', function (e) {      // a soft click and a short buzz on anything you press
    var b = e.target.closest && e.target.closest('.key, .slot, .sw, .theme, .roster button'); if (!b || b.disabled) return;
    haptic(); if (window.MarsVoice) MarsVoice.cue('tick');
  });
  if (!reduced) {     // the highlight on the metal parts follows your pointer, or the tilt of your phone
    var raf = 0, sx = 0, sy = 0;
    var paint = function () { raf = 0; hud.style.setProperty('--tx', sx.toFixed(3)); hud.style.setProperty('--ty', sy.toFixed(3)); };
    hud.addEventListener('pointermove', function (e) { sx = (e.clientX / innerWidth - 0.5) * 2; sy = (e.clientY / innerHeight - 0.5) * 2; if (!raf) raf = requestAnimationFrame(paint); });
    window.addEventListener('deviceorientation', function (e) { if (e.gamma == null || hud.hidden) return; sx = Math.max(-1, Math.min(1, e.gamma / 30)); sy = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 30)); if (!raf) raf = requestAnimationFrame(paint); });
  }

  /* ---------- Start ---------- */
  applyTheme(lsGet('marsai.theme') || 'ares', false); renderThemes($('#themes-quick')); refreshSwitches();
  fetch('assets/crew.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
    if (d && d.crew && d.crew.length) { CREW = d.crew; if (!findCrew(me().name)) crewId = 'MARS'; setCrew(crewId, false); renderExtra(); }
  }).catch(function () {});
  if (window.MarsVoice) MarsVoice.init({
    base: SHIPCORE,
    isHudOpen: function () { return !hud.hidden; },
    onEngines: function () { refreshSwitches(); },
    getCrew: function () { return crewId; },
    getCrewData: function () { return me(); },
    onTranscript: function (txt) {
      $('#cmd').value = txt;
      var f = $('#console-form');
      if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
  if (location.hash === '#hud') power(true, powerOn);
})();
