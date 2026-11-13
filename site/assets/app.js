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
  function addMsg(kind, who, text) {
    var d = document.createElement('div'); d.className = 'msg ' + kind;
    if (who) { var w = document.createElement('span'); w.className = 'who'; w.textContent = who; d.appendChild(w); }
    var t = document.createElement('span'); t.className = 'txt'; t.textContent = text; d.appendChild(t);
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
  function reply(text, ev) {
    addMsg('crew', label(), text);
    if (!window.MarsVoice) return;
    if (ev && MarsVoice.hasPhrase(ev)) MarsVoice.event(ev, text); else MarsVoice.speak(text);
  }

  /* ---------- HUD modules ---------- */
  var modules = [
    ['Bridge', 'Command overview. Talk to your crew below, or ask for the weather, facts, math, notes, and missions.'],
    ['Crew', 'Twenty celestial personalities, each with their own role, sigil, and voice. Pick one to talk to.'],
    ['Missions', 'Turn goals into missions and track progress as experience. Try: new mission learn to bake.'],
    ['ShipCore', 'One system, many voices. Personality, voice, provider, and skills stay separate.'],
    ['Theme Lab', 'Eight low-glare palettes share one geometry. Theme switching arrives in a later build.'],
    ['Roadmap', 'Prototype phases from the first browser build toward portable .starship exports.']
  ];
  var navlist = $('#navlist');
  modules.forEach(function (m, i) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.textContent = m[0].toUpperCase();
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
  var GROUPS = [['foundational', 'FOUNDATIONAL COMPANIONS'], ['male', 'MALE CONSTELLATION'], ['female', 'FEMALE CONSTELLATION']];
  function renderExtra() {
    var box = $('#module-extra'); box.textContent = '';
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
  var STATE_KEY = 'marsai.state', mem = { notes: [], missions: [], next: 1 };
  try { var d0 = JSON.parse(lsGet(STATE_KEY) || 'null'); if (d0 && d0.notes && d0.missions) mem = d0; } catch (e) {}
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
  var FALLBACK_TAIL = ' I can chat, check the weather, look things up on Wikipedia, do math, and keep notes and missions. For open conversation, say "enable brain" (a small AI that runs in your browser, no key).';

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

  /* ---------- Web lookups: weather (Open-Meteo) and facts (Wikipedia). No key. Every request is logged. ---------- */
  var WMO = { 0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 48: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
    56: 'freezing drizzle', 57: 'freezing drizzle', 61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow',
    77: 'snow grains', 80: 'rain showers', 81: 'rain showers', 82: 'violent rain showers', 85: 'snow showers', 86: 'heavy snow showers', 95: 'a thunderstorm', 96: 'a thunderstorm with hail', 99: 'a thunderstorm with hail' };
  var pending = null;
  function okJson(r) { if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; } return r.json(); }
  function netMsg(e, what) {
    if (e && e.status === 429) return 'The ' + what + ' is rate limiting requests right now. Try again in a little while.';
    if (e && e.status) return 'The ' + what + ' returned an error (' + e.status + '). Try again later.';
    return "I couldn't reach the " + what + ' just now. Check your connection and try again.';
  }
  function weatherIntent(cmd) { return /\b(weather|forecast|temperature|how (hot|cold|warm) is it|is it (raining|snowing|sunny|cold|hot|warm|windy))\b/.test(cmd); }
  function extractCity(cmd) {
    var m = cmd.match(/\b(?:in|for|at|near)\s+(?!the\b|my\b)([a-z][a-z .,'-]{1,50}?)(?:\s+(?:today|tomorrow|tonight|now|right now|please|like))?\s*\??$/);
    return m ? m[1].replace(/[.,]+$/, '').trim() : null;
  }
  function webOff() { return 'Web lookups are off. Say "web on" to allow weather and Wikipedia (no key, every request is logged).'; }
  function weatherAt(name, lat, lon) {
    var imp = /^en-US/i.test(navigator.language || '');
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto' +
      (imp ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '');
    log('Web: api.open-meteo.com (weather, no key)');
    return timeoutFetch(url, {}, 9000).then(okJson).then(function (d) {
      var c = d.current, dd = d.daily, u = imp ? '°F' : '°C', w = imp ? 'mph' : 'km/h';
      var out = name + ': ' + Math.round(c.temperature_2m) + u + ' now, ' + (WMO[c.weather_code] || 'unsettled') + ', feels like ' + Math.round(c.apparent_temperature) + u +
        ', wind ' + Math.round(c.wind_speed_10m) + ' ' + w + ', humidity ' + c.relative_humidity_2m + '%.';
      if (dd && dd.temperature_2m_max) out += ' Today: high ' + Math.round(dd.temperature_2m_max[0]) + u + ', low ' + Math.round(dd.temperature_2m_min[0]) + u +
        (dd.precipitation_probability_max && dd.precipitation_probability_max[0] != null ? ', ' + dd.precipitation_probability_max[0] + '% chance of precipitation' : '') + '.';
      return out;
    });
  }
  function weather(cmd) {
    if (!webOn) return Promise.resolve(webOff());
    var here = /\b(here|my location|where i am|near me)\b/.test(cmd), city = here ? null : extractCity(cmd) || (/\b(in|for|at|near)\b/.test(cmd) ? null : (lsGet('marsai.city') || null));
    if (here) {
      if (!navigator.geolocation) return Promise.resolve("This browser can't share your location. Say: weather in <city>.");
      return new Promise(function (res) {
        navigator.geolocation.getCurrentPosition(function (p) {
          weatherAt('Your location', p.coords.latitude.toFixed(3), p.coords.longitude.toFixed(3)).then(res, function (e) { res(netMsg(e, 'weather service')); });
        }, function () { res('Location access was not granted. Say: weather in <city>.'); }, { timeout: 10000 });
      });
    }
    if (!city) { pending = 'city'; return Promise.resolve('Which city? (Or say "weather here" to use your location.)'); }
    log('Web: geocoding-api.open-meteo.com (place lookup, no key)');
    return timeoutFetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=1&language=en&format=json', {}, 9000)
      .then(okJson)
      .then(function (g) {
        if (!g.results || !g.results.length) return "I couldn't find a place called " + city + '. Try another spelling.';
        var p = g.results[0]; lsSet('marsai.city', p.name);
        return weatherAt(p.name + (p.country ? ', ' + p.country : ''), p.latitude, p.longitude);
      })
      .catch(function (e) { return netMsg(e, 'weather service'); });
  }
  function wikiIntent(cmd) {
    var m = cmd.match(/^(?:who|what) (?:is|are|was|were)(?: a| an| the)? (.+)$/) || cmd.match(/^(?:tell me about|tell me something about|explain|define|look up|lookup|search for|what do you know about)\s+(.+)$/);
    if (!m) return null;
    var q = m[1].replace(/\?$/, '').trim();
    if (!q || /^(you|your|my|up|going on|the (time|date|day|weather)|this|that|it|here|new)\b/.test(q)) return null;
    if (/\b(poem|story|song|haiku|essay|limerick|write|joke|riddle|rap|speech)\b/.test(q)) return null;   // creative requests belong to conversation, not lookup
    return q;
  }
  function wiki(q) {
    if (!webOn) return Promise.resolve(webOff());
    log('Web: en.wikipedia.org (facts, no key)');
    var url = 'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(q) +
      '&gsrlimit=1&prop=extracts&exintro=1&explaintext=1&exsentences=2&redirects=1&format=json&origin=*';
    return timeoutFetch(url, {}, 9000).then(okJson).then(function (d) {
      var pages = d.query && d.query.pages, p = pages && pages[Object.keys(pages)[0]];
      if (!p || !p.extract) return "I couldn't find a good match for " + q + ' on Wikipedia.';
      var ex = p.extract.replace(/\s+/g, ' ').trim(); if (ex.length > 420) ex = ex.slice(0, 417).replace(/\s+\S*$/, '') + '...';
      return ex + ' (Wikipedia: ' + p.title + ')';
    }).catch(function (e) { return netMsg(e, 'Wikipedia'); });
  }

  /* ---------- ShipCore link (optional local Python service, no key) ---------- */
  function updateBadge() {
    var brainReady = window.MarsBrain && MarsBrain.state() === 'ready';
    var t = link.online ? (link.llm ? 'SHIPCORE + LOCAL AI' : 'SHIPCORE') : (brainReady ? 'ONBOARD + AI BRAIN' : 'ONBOARD CORE');
    $('#link-text').textContent = t; $('#link-text2').textContent = t;
    $('#node-net').textContent = link.online ? 'CONNECTED' : 'OFFLINE';
    $('#node-core').textContent = link.online ? 'HANDED OFF' : 'ONLINE';
    renderTrace(); updateBoot();
  }
  function setLink(online, info) {
    link.online = online;
    link.llm = !!(online && info && info.providers && info.providers.some(function (p) { return p.available; }));
    updateBadge();
  }
  function checkLink(announce) {
    return timeoutFetch(SHIPCORE + '/health', {}, 1500)
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (info) { setLink(true, info); if (window.MarsVoice) MarsVoice.refresh(); if (announce) reply('ShipCore connected (v' + info.version + ').'); })
      .catch(function () { setLink(false); if (window.MarsVoice) MarsVoice.refresh(); if (announce) reply('ShipCore was not found on this machine. Using the onboard core. See docs/SHIPCORE.md.'); });
  }
  function ask(raw) {
    return timeoutFetch(SHIPCORE + '/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: raw, crew: crewId })
    }, 95000).then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .catch(function () { setLink(false); reply('The ShipCore link was lost. Back to the onboard core.', 'warning'); return null; });
  }
  var SC_EVENT = { 'skill:mission_add': 'confirm', 'skill:note_add': 'confirm', 'skill:mission_done': 'celebrate' };

  /* ---------- In-browser AI brain (optional, opt-in) ---------- */
  var brainBtn = $('#brain-btn'), brainNote = null;
  function brainUi(state, extra) {
    extra = extra || {};
    if (state === 'loading') {
      brainBtn.textContent = 'AI BRAIN: ' + (extra.pct != null ? extra.pct + '%' : 'LOADING');
      if (!brainNote) brainNote = addMsg('sys', '', 'AI brain downloading...');
      if (extra.pct != null) brainNote.textContent = 'AI brain downloading: ' + extra.pct + '% ' + (extra.file ? '(' + extra.file.split('/').pop() + ')' : '');
    } else if (state === 'ready') {
      brainBtn.textContent = 'AI BRAIN: ON'; brainBtn.setAttribute('aria-pressed', 'true');
      addMsg('sys', '', 'AI brain ready (' + (extra.device === 'webgpu' ? 'GPU' : 'CPU') + '). Open conversation is on.'); brainNote = null;
    } else if (state === 'error') {
      brainBtn.textContent = 'AI BRAIN: OFF'; brainBtn.setAttribute('aria-pressed', 'false'); brainNote = null;
      addMsg('sys', '', 'AI brain could not start: ' + (extra.message || 'unknown error') + '. Typing and the built-in skills still work.');
    } else { brainBtn.textContent = 'AI BRAIN: OFF'; brainBtn.setAttribute('aria-pressed', 'false'); brainNote = null; }
    updateBadge();
  }
  if (window.MarsBrain) MarsBrain.onChange(brainUi);
  function brainOn(ask_) {
    if (!window.MarsBrain || MarsBrain.state() !== 'off') return;
    if (ask_ && !window.confirm('Enable the AI brain?\n\nThis downloads a small open AI model (about 400 MB, Apache-2.0) once from huggingface.co, caches it in your browser, and runs it on this device. No key, and your messages stay on this device. The model library loads from cdn.jsdelivr.net.')) return;
    lsSet('marsai.brain', '1'); MarsBrain.enable();
  }
  function brainOff() { lsSet('marsai.brain', '0'); if (window.MarsBrain) MarsBrain.disable(); }
  brainBtn.addEventListener('click', function () { if (MarsBrain.state() === 'ready' || MarsBrain.state() === 'loading') brainOff(); else brainOn(true); });
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
  function webToggle(on) { webOn = on; lsSet('marsai.web', on ? '1' : '0'); $('#web-btn').setAttribute('aria-pressed', on); $('#web-btn').textContent = 'WEB LOOKUPS: ' + (on ? 'ON' : 'OFF'); }
  $('#web-btn').addEventListener('click', function () { webToggle(!webOn); });
  webToggle(webOn);

  /* ---------- Command handling ---------- */
  var HELP = 'Talk to me like a crew member: "hello! how are you?", "weather in Paris", "who is Ada Lovelace", "what is 15 times 7". Also: notes, new mission <title>, my missions, complete mission N, joke, time, status. ' +
    'Switch crew: "talk to Pluto" or open the Crew module. Others: bridge, crew, missions, theme lab, roadmap, enable brain, web off, connect, fullscreen, clear, power off.';
  function handle(raw) {
    var cmd = raw.toLowerCase().replace(/[.!,;]+$/, '').replace(/\s+/g, ' ').trim();
    if (pending === 'city') {
      pending = null;
      if (!/^(never mind|nevermind|cancel|no|skip)$/.test(cmd)) return weather('weather in ' + cmd).then(function (t) { reply(t); });
      reply('No problem.'); return Promise.resolve();
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
    var st = smalltalk(cmd); if (st) { reply(st); return Promise.resolve(); }
    var ma = mathIntent(cmd); if (ma !== null) { reply('That comes to ' + ma + '.'); return Promise.resolve(); }
    if (weatherIntent(cmd)) return weather(cmd).then(function (t) { reply(t); });
    var wq = wikiIntent(cmd); if (wq) return wiki(wq).then(function (t) { reply(t); });
    var go = function () {
      if (window.MarsBrain && MarsBrain.state() === 'ready') return brainReply(raw);
      reply(line('unknown') + (MarsBrain && MarsBrain.state() === 'loading' ? ' My AI brain is still loading, so try again in a moment.' : FALLBACK_TAIL));
    };
    if (link.online) return ask(raw).then(function (d) {
      if (d && d.source !== 'fallback') reply(d.reply, SC_EVENT[d.source]); else if (d) go();
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
    var s = Math.floor((Date.now() - startedAt) / 1000);
    $('#chrono').textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
    var n = new Date(), doy = Math.floor((n - new Date(n.getFullYear(), 0, 0)) / 86400000);
    $('#stardate').textContent = ('00' + doy).slice(-3);
  }
  function startClock() { stopClock(); tick(); timer = setInterval(tick, 1000); }
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
  $('#connect-btn').addEventListener('click', function () { checkLink(true); });

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
      if (lsGet('marsai.brain') === '1' && window.MarsBrain && MarsBrain.state() === 'off') MarsBrain.enable();
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

  /* ---------- Start ---------- */
  fetch('assets/crew.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
    if (d && d.crew && d.crew.length) { CREW = d.crew; if (!findCrew(me().name)) crewId = 'MARS'; setCrew(crewId, false); renderExtra(); }
  }).catch(function () {});
  if (window.MarsVoice) MarsVoice.init({
    base: SHIPCORE,
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
