/* MARSAI Copilot: plain-language understanding for the HUD.
 * Turns what the captain says ("take me to the crew", "I need someone to challenge my plan",
 * "remind me to call mom", "do I need an umbrella in Paris?") into a structured action.
 * Dependency-free, offline, instant. Tolerates speech-to-text slips (fuzzy names, aliases).
 * Pure functions: the HUD decides what to do with the result. Works in the browser and in Node (tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarsCopilot = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- text utilities ---------- */
  var CONTRACTIONS = [
    [/\bwhat's\b/g, 'what is'], [/\bwhats\b/g, 'what is'], [/\bwho's\b/g, 'who is'], [/\bwhere's\b/g, 'where is'], [/\bhow's\b/g, 'how is'],
    [/\bthat's\b/g, 'that is'], [/\bit's\b/g, 'it is'], [/\bi'm\b/g, 'i am'], [/\bi've\b/g, 'i have'], [/\bi'll\b/g, 'i will'], [/\bi'd\b/g, 'i would'],
    [/\bcan't\b/g, 'can not'], [/\bdon't\b/g, 'do not'], [/\bwon't\b/g, 'will not'], [/\blet's\b/g, 'let us'], [/\bgonna\b/g, 'going to'],
    [/\bwanna\b/g, 'want to'], [/\bgotta\b/g, 'got to'], [/\blemme\b/g, 'let me'], [/\bgimme\b/g, 'give me']
  ];
  function norm(s) {
    s = (s || '').toLowerCase().normalize ? (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '') : (s || '').toLowerCase();
    s = s.replace(/[‘’]/g, "'");
    CONTRACTIONS.forEach(function (c) { s = s.replace(c[0], c[1]); });
    return s.replace(/[^a-z0-9%.+*/^()#:\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function words(s) { return norm(s).replace(/[^a-z0-9%\s'-]/g, ' ').split(' ').filter(Boolean); }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    var d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }
  function stem(w) { return w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, '') : w; }
  function sameWord(a, b) {   // tolerant stem match: organized ~ organization, planning ~ plan
    if (a === b) return true;
    var lo = Math.min(a.length, b.length); if (lo < 4) return false;
    var k = Math.min(5, lo), i = 0; while (i < k && a[i] === b[i]) i++;
    return i >= k;
  }
  function cap(s) { return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }

  var NUMS = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  function numberWords(s) {   // "twenty five times three" -> "25 times 3"
    var t = s.split(' '), out = [], i = 0;
    while (i < t.length) {
      var w = t[i], n = NUMS[w];
      if (n === undefined) { out.push(w); i++; continue; }
      var v = n; i++;
      if (n >= 20 && NUMS[t[i]] !== undefined && NUMS[t[i]] < 10) { v += NUMS[t[i]]; i++; }
      if (t[i] === 'hundred') { v *= 100; i++; if (t[i] === 'and') i++; if (NUMS[t[i]] !== undefined) { v += NUMS[t[i]]; i++; if (NUMS[t[i - 1]] >= 20 && NUMS[t[i]] !== undefined && NUMS[t[i]] < 10) { v += NUMS[t[i]]; i++; } } }
      if (t[i] === 'thousand') { v *= 1000; i++; }
      out.push(String(v));
    }
    return out.join(' ');
  }

  /* ---------- modules, roles, aliases ---------- */
  var MODULES = [
    ['Bridge', ['bridge', 'home', 'main', 'overview', 'dashboard', 'start', 'front', 'command']],
    ['Crew', ['crew', 'team', 'roster', 'companions', 'characters', 'everyone', 'personalities', 'members', 'crewmates']],
    ['Missions', ['missions', 'mission', 'goals', 'quests', 'tasks', 'objectives', 'todos', 'todo']],
    ['ShipCore', ['shipcore', 'ship core', 'engine room', 'engine', 'architecture']],
    ['Theme Lab', ['themes', 'theme', 'theme lab', 'colors', 'colours', 'palette', 'palettes', 'appearance', 'skin']],
    ['Roadmap', ['roadmap', 'road map', 'timeline', 'future plans', 'release plan']]
  ];
  var ROLES = { mediator: ['MARS'], guardian: ['VENUS', 'OBERON', 'RHEA'], rival: ['PLUTO'], prodigy: ['MERCURY'], scholar: ['ATLAS'], optimist: ['SIRIUS'],
    explorer: ['NEPTUNE'], veteran: ['SATURN'], commander: ['JUPITER', 'POLARIS'], companion: ['POLLUX'], maverick: ['ERIS'], rebel: ['LUNA'], warrior: ['BELLATRIX'],
    officer: ['VESTA'], diplomat: ['EUROPA'], engineer: ['VEGA'], ace: ['IO'], pilot: ['IO'] };
  // Common speech-to-text slips, applied only when the sentence is clearly about choosing a crew member.
  var ALIASES = { venice: 'venus', phoenix: 'venus', plato: 'pluto', serious: 'sirius', sirias: 'sirius', aeris: 'eris', eros: 'eris', pollocks: 'pollux', 'pollucks': 'pollux',
    vester: 'vesta', vegas: 'vega', ria: 'rhea', rear: 'rhea', lunar: 'luna', marz: 'mars', marks: 'mars', mercury: 'mercury', jew: 'jupiter', ayo: 'io', 'eye-oh': 'io' };

  /* ---------- crew helpers ---------- */
  function crewByName(ctx, w, loose) {
    var crew = ctx.crew || [];
    for (var i = 0; i < crew.length; i++) if (crew[i].name.toLowerCase() === w) return crew[i];
    if (loose) {
      var a = ALIASES[w];
      if (a) for (i = 0; i < crew.length; i++) if (crew[i].name.toLowerCase() === a) return crew[i];
      if (w.length >= 5) for (i = 0; i < crew.length; i++) { var n = crew[i].name.toLowerCase(); if (n.length >= 5 && lev(w, n) <= 1) return crew[i]; }
    }
    return null;
  }
  function crewInText(ctx, ws, loose) {
    for (var i = 0; i < ws.length; i++) { var c = crewByName(ctx, ws[i], loose); if (c) return c; }
    return null;
  }
  function byId(ctx, id) { var c = ctx.crew || []; for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i]; return null; }

  function recommend(ctx, ws) {
    var best = null, ranked = [];
    (ctx.crew || []).forEach(function (c) {
      var score = 0, hit = null;
      (c.topics || []).forEach(function (tp) {
        var tw = tp.split(' '), m = 0;
        tw.forEach(function (t) { if (t.length > 2 && ws.some(function (w) { return sameWord(w, t); })) m++; });
        if (m) { var s = m / tw.length * (m > 1 ? 1.5 : 1); if (s > score) { score = s; hit = tp; } }
      });
      if (score) ranked.push({ crew: c, score: score, topic: hit });
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    best = ranked[0] || null;
    return best ? { crew: best.crew, topic: best.topic, others: ranked.slice(1, 3).map(function (r) { return r.crew; }) } : null;
  }

  /* ---------- the engine ---------- */
  function analyze(text, ctx) {
    ctx = ctx || {};
    var raw = (text || '').trim(), n = norm(raw).replace(/[.!?]+$/g, '').trim(), ws = words(n), m;
    if (!n) return null;

    // yes / no (answers to a question the HUD just asked)
    if (/^(?:yes|yeah|yep|yup|sure|ok|okay|please do|do it|go ahead|sounds good|absolutely|of course|please|y)$/.test(n)) return { intent: 'yes' };
    if (/^(?:no|nope|nah|never mind|nevermind|cancel|not now|skip|don't|do not|n)$/.test(n)) return { intent: 'no' };

    // addressing a crew member: "Venus, what do you think?" / "hey Pluto, ..." / "... , Venus"
    m = raw.match(/^(?:hey |hi |hello |ok |okay |yo |dear )?([A-Za-z]+)\s*[,:]\s*(.+)$/i);
    if (m) { var ac = crewByName(ctx, m[1].toLowerCase(), false); if (ac) return { intent: 'address', crew: ac.id, rest: m[2].trim() }; }
    m = raw.match(/^(.+?),\s*([A-Za-z]+)\s*[?!.]*$/);
    if (m) { var tc = crewByName(ctx, m[2].toLowerCase(), false); if (tc && /\b(?:what|how|why|can|could|do|does|should|would|will|is|are|tell|give|help)\b/i.test(m[1])) return { intent: 'address', crew: tc.id, rest: m[1].trim() }; }

    /* ----- system controls ----- */
    if (/\b(?:turn off|disable|stop|switch off|mute|silence)\s+(?:the\s+)?(?:voice|speech|speaking|talking|audio|sound)\b|\b(?:be quiet|stop talking|stop speaking|shut up|quiet down|voice off)\b|^mute$|^silence$/.test(n)) return { intent: 'voice', on: false };
    if (/\b(?:turn on|enable|start|switch on|use)\s+(?:the\s+)?(?:voice|speech|speaking|talking|audio)\b|\b(?:speak|talk)\s+(?:to me\s+)?(?:out loud|aloud)\b|\bread (?:it|that|replies|responses|everything) (?:out|aloud|to me)\b|^(?:talk|speak) to me$|\bi want to hear (?:you|your voice)\b|\bsay it out loud\b|\bvoice on\b|\bunmute\b/.test(n)) return { intent: 'voice', on: true };
    if (/\b(?:exit|leave|stop|close|get out of|turn off)\s+full ?screen\b|\bwindowed( mode)?\b/.test(n)) return { intent: 'fullscreen', on: false };
    if (/\b(?:go |make it |enter |switch to |turn on |toggle )?full ?screen\b/.test(n)) return { intent: 'fullscreen', on: true };
    if (/\b(?:start listening|listen to me|use (?:the )?(?:mic|microphone)|turn on (?:the )?(?:mic|microphone)|voice input|dictate|can you hear me|let me (?:talk|speak) to you)\b|^listen$/.test(n) || /^i (?:will|am going to) (?:talk|speak)\b/.test(n)) return { intent: 'listen' };
    if (/\b(?:clear|wipe|reset|erase|clean)\s+(?:the\s+|my\s+)?(?:chat|screen|conversation|history|messages|log)\b/.test(n)) return { intent: 'clear' };
    if (/\b(?:disable|turn off|stop|shut off)\s+(?:the\s+)?(?:ai\s+)?brain\b|\bbrain off\b/.test(n)) return { intent: 'brain', on: false };
    if (/\b(?:enable|turn on|start|activate|load|download|use|switch on)\s+(?:the\s+)?(?:ai\s+)?brain\b|\bbrain on\b|\bmake you smarter\b/.test(n)) return { intent: 'brain', on: true };
    if (/\b(?:disable|turn off|stop|block)\s+(?:the\s+)?(?:web|internet|online|lookups?)\b|\bweb off\b/.test(n)) return { intent: 'web', on: false };
    if (/\b(?:enable|turn on|allow|start)\s+(?:the\s+)?(?:web|internet|online|lookups?)\b|\bweb on\b/.test(n)) return { intent: 'web', on: true };
    if (/\b(?:connect|link|reconnect)\s+(?:to\s+)?(?:the\s+)?(?:shipcore|ship core|local engine|server)\b|^connect$/.test(n)) return { intent: 'connect' };
    if (/\b(?:open|show|bring up|go to|take me to|let me see)\s+(?:the\s+)?(?:settings|systems|options|preferences|controls)\b|^(?:settings|options|preferences)$/.test(n)) return { intent: 'settings' };
    var themes = ctx.themes || [], themeCue = /\b(?:theme|themes|colou?rs?|palette|look|skin|scheme)\b/.test(n);
    if (themes.length) {
      if (/\b(?:previous|last|back to the previous)\s+(?:theme|colou?r|look|palette)\b/.test(n)) return { intent: 'theme', prev: true };
      if (/\b(?:random|surprise me with(?: a)?)\s+(?:theme|colou?r|look|palette)\b/.test(n)) return { intent: 'theme', random: true };
      if (/\b(?:next|another|different|new|other)\s+(?:theme|colou?r|look|palette)\b|\bchange (?:the )?(?:theme|colou?rs?)$|\bswitch (?:the )?theme$/.test(n)) return { intent: 'theme', next: true };
      if (/\b(?:what|which|list)\b.*\b(?:themes?|palettes?)\b|\bhow many themes\b/.test(n)) return { intent: 'list_themes' };
      var tm = null;
      themes.forEach(function (th) { var nm = th.name.toLowerCase(); if (n.indexOf(nm) > -1) tm = th; });
      if (!tm && themeCue) themes.forEach(function (th) { var first = th.name.toLowerCase().split(' ')[0]; if (!tm && (ws.indexOf(th.id) > -1 || ws.indexOf(first) > -1)) tm = th; });
      if (tm && (/\b(?:change|switch|set|use|apply|make|try|go|put|turn)\b/.test(n) || ws.length <= 3 || themeCue)) return { intent: 'theme', id: tm.id };
    }
    m = n.match(/\b(?:open|launch|go to|take me to|show me|visit|pull up)\s+(?:the\s+)?(clearsky|clear sky|weather app|weather site|payout lab|payoutlab|dividend app|dividend site|stocks? app|goldbrief|gold brief|ai news site|news site|wywo|while you were out|message app|notes app)\b/);
    if (m) { var k = m[1]; return { intent: 'open_app', app: /clear|weather/.test(k) ? 'clearsky' : /payout|dividend|stock/.test(k) ? 'payout' : /gold|news/.test(k) ? 'goldbrief' : 'wywo' }; }
    if (/^(?:power|shut|turn)\s+(?:it\s+)?(?:down|off)$|^(?:shutdown|powerdown|close (?:the )?(?:hud|screen)|go to sleep|that is all|i am done(?: for now| for today)?|end (?:the )?session|exit)$/.test(n)) return { intent: 'power_off' };
    if (/^(?:help(?: me)?|what can you do|what can i (?:say|ask|do)|how does this work|how do i use this|commands?|what are (?:the|your) commands|show (?:me )?(?:the )?commands|what are you able to do)$/.test(n) || /\bwhat can you do\b/.test(n)) return { intent: 'help' };

    /* ----- missions and notes ----- */
    m = n.match(/^(?:i (?:just |have )?(?:finished|completed|did|wrapped up|knocked out|nailed)|mark|check off|cross off|tick off|complete|finish|done with|we are done with|i am done with)\s+(.+?)(?:\s+(?:as\s+)?(?:done|complete|completed|finished))?$/);
    if (m && !/^(?:talking|the day|for)\b/.test(m[1])) {
      var title = m[1].replace(/^(?:the |my |that |this )?(?:mission|goal|task)?\s*/, '').replace(/^#/, '').trim(), mid = title.match(/^(?:number\s+)?#?(\d+)$/);
      var open = (ctx.missions || []).filter(function (x) { return !x.done; }), found = null;
      if (mid) found = open.filter(function (x) { return x.id === parseInt(mid[1], 10); })[0] || null;
      else if (title) {
        var tw = words(title).map(stem), bestS = 0;
        open.forEach(function (x) { var xw = words(x.title).map(stem), hit = tw.filter(function (w) { return xw.indexOf(w) > -1; }).length, s = hit / Math.max(tw.length, 1); if (hit && s > bestS) { bestS = s; found = x; } });
        if (bestS < 0.5) found = null;
      }
      if (found || mid || /\b(?:mission|goal|task)\b/.test(n) || open.length) return { intent: 'mission_done', id: found ? found.id : null, title: title };
    }
    m = n.match(/^(?:remind me to|add (?:a )?(?:new )?(?:mission|goal|task|to do|todo|reminder)(?: to| for| called| named)?|new (?:mission|goal|task)|create (?:a )?(?:new )?(?:mission|goal|task)|make (?:it |that )?a (?:mission|goal)|log (?:a )?(?:mission|goal)|set (?:a )?goal(?: to)?|my goal is(?: to)?|put .{0,25}on my list)\s*[:,-]?\s*(.*)$/);
    if (m) { var t0 = raw.replace(/^[^]*?(?:remind me to|mission|goal|task|reminder|to do|todo|goal is(?: to)?|goal to|list)\s*[:,-]?\s*/i, '').trim() || m[1]; return { intent: 'mission_add', title: t0.replace(/^to\s+/i, '') }; }
    if (/\b(?:what is (?:on )?my (?:plate|list|agenda)|what (?:do i|have i got|should i) (?:have |need |got )?to do|what is (?:left|pending|open|next)|my (?:missions|goals|tasks|todos|objectives)|(?:show|list|read|tell)(?: me)?(?: my| all| the)? (?:missions|goals|tasks|todos)|open missions|what missions)\b/.test(n.replace(/to-do/g, 'todo'))) return { intent: 'mission_list' };
    if (/\b(?:take (?:a |this )?(?:phone )?message|log (?:a )?(?:phone )?call|while you were out|wywo|new call note|phone message)\b/.test(n) || /^(?:message|call|note) (?:for|from) [A-Za-z]/i.test(raw) || (/\b(?:called|phoned)\b/.test(n) && /\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/.test(raw))) {
      var body = raw.replace(/^[\s\S]*?(?:take (?:a |this )?(?:phone )?message|log (?:a )?(?:phone )?call|while you were out|new call note|phone message)\s*[:,-]?\s*/i, '');
      return { intent: 'message_add', text: body === raw && !/^(?:message|call|note) (?:for|from)|called|phoned/i.test(raw) ? '' : body.trim() };
    }
    if (/\b(?:my messages|call notes|(?:show|read|list)(?: me)?(?: my| the| all)? (?:phone )?messages|who called|list (?:my )?(?:messages|calls)|any messages|any calls)\b/.test(n)) return { intent: 'message_list' };
    m = raw.match(/^(?:please\s+)?(?:write (?:this |that |it )?down|jot (?:this |that |it )?down|(?:make|take) a note|note (?:this|that|to self)|note to self|remember (?:that|this)|don'?t let me forget|keep in mind|save this)\s*[:,-]?\s*(.*)$/i);
    if (m) return { intent: 'note_add', text: m[1].trim() };
    if (/\b(?:what did i (?:note|write|jot|save)|(?:show|read|list|tell)(?: me)?(?: back)?(?: my| the)? notes|my notes|what (?:do you|have you) (?:remember|noted|saved)|read (?:it|them) back)\b/.test(n)) return { intent: 'note_list' };
    if (/\bwhat do you know about me\b/.test(n)) return { intent: 'about_me' };

    /* ----- crew: who is who, who to talk to ----- */
    var loose = /\b(?:talk|speak|chat|switch|change|swap|put|bring|get|call|ask|hear|connect|give|want|need|let|with|to)\b/.test(n);
    var cn = crewInText(ctx, ws, loose);
    if (cn && /\b(?:who is|who are|what is|tell me about|about|describe|introduce)\b/.test(n) && !/\b(?:talk|speak|chat|switch|put|bring|get)\b/.test(n)) return { intent: 'about_crew', crew: cn.id };
    if (cn && loose) return { intent: 'switch_crew', crew: cn.id };
    if (cn && ws.length === 1) return { intent: 'switch_crew', crew: cn.id };
    if (/\b(?:someone else|another crew member|different crew member|somebody else|random crew|surprise me|pick (?:one|someone) for me|anyone)\b/.test(n) && /\b(?:talk|speak|switch|chat|hear|try|give|pick|surprise)\b/.test(n)) return { intent: 'random_crew' };
    for (var r in ROLES) if (ws.indexOf(r) > -1 && /\b(?:talk|speak|chat|switch|put|bring|get|call|ask|hear|connect|give|want|need|let|with|to)\b/.test(n)) return ROLES[r].length === 1 ? { intent: 'switch_crew', crew: ROLES[r][0] } : { intent: 'choose_crew', options: ROLES[r], role: r };
    if (/\b(?:who (?:can|could|should|would|is good|is best|knows)|which (?:crew|one|person|member)|who do i (?:talk|ask)|recommend (?:a |some)?(?:crew|someone|somebody|person)|someone (?:who|to)|somebody (?:who|to)|anyone (?:who|to)|i need (?:some )?(?:help|advice) (?:with|on|about)|help me (?:with|on|about|think)|advice (?:on|about|for)|can you help me (?:with|on|about))\b/.test(n)) {
      var rec = recommend(ctx, ws);
      return rec ? { intent: 'recommend', crew: rec.crew.id, topic: rec.topic, others: rec.others.map(function (c) { return c.id; }) } : { intent: 'recommend', crew: null };
    }
    if (/\b(?:list|show|who is on|who are|name)\b.*\b(?:crew|team|everyone|companions|crewmates)\b/.test(n) || /^who is on (?:the )?(?:crew|team)$/.test(n) || /\bwho can i talk to\b/.test(n)) return { intent: 'list_crew' };

    /* ----- navigation ----- */
    var navVerb = /\b(?:go|goto|take|bring|open|show|switch|jump|pull|view|see|check|display|head|navigate|launch|load|visit|look|where|let me see)\b/.test(n);
    for (var i = 0; i < MODULES.length; i++) {
      var found2 = MODULES[i][1].some(function (kw) { return kw.indexOf(' ') > -1 ? n.indexOf(kw) > -1 : ws.some(function (w) { return w === kw || (kw.length >= 6 && lev(w, kw) <= 1); }); });
      if (found2 && (navVerb || ws.length <= 2) && !/\bmy\b/.test(n.replace(/^(?:take|bring) me\b/, ''))) return { intent: 'navigate', module: MODULES[i][0] };
    }

    /* ----- web: weather, facts ----- */
    var wx = /\b(?:weather|forecast|temperature)\b/.test(n) || (/\b(?:rain|raining|rainy|snow|snowing|umbrella|jacket|coat|sunny|windy|humid|hot|cold|warm|chilly|freezing|sweater)\b/.test(n) && /\b(?:is it|will it|do i need|should i|how|going to|outside|bring|wear|take)\b/.test(n));
    if (wx) {
      var cm = n.match(/\b(?:in|for|at|near|around)\s+([a-z][a-z .'-]{1,40}?)(?:\s+(?:today|tomorrow|tonight|right now|now|this (?:week|weekend|morning|afternoon|evening)|like|please))?\s*$/);
      var city = cm ? cm[1].replace(/\b(?:the|my)\b\s*$/, '').trim() : null;
      if (city && /^(?:here|outside|my area|my location|me|this area)$/.test(city)) return { intent: 'weather', here: true };
      if (/\b(?:here|near me|my location|where i am)\b/.test(n)) return { intent: 'weather', here: true };
      return { intent: 'weather', city: city ? cap(city) : null, ask: /\bumbrella\b/.test(n) ? 'umbrella' : null };
    }
    var fin = /\b(?:stock|stocks|shares?|ticker|dividends?|yield|etfs?|payout|equity)\b/.test(n), tick = (raw.match(/\b[A-Z]{2,5}(?:\.[A-Z])?\b/g) || []).filter(function (x) { return !/^(?:AI|US|UK|PM|AM|OK|TV|ID|HUD|CPU|GPU|USA|ETF|THE|AND|FOR|NOT|YES|WHAT|WHO|HOW)$/.test(x); });
    if (fin || (tick.length && /\b(?:price of|quote for|price|what does .{1,12} pay|how (?:is|are) .{1,12} doing|pays?)\b/.test(n))) {
      var sq = tick[0] || null;
      if (!sq) { var sm = n.match(/\b(?:price of|quote for|stock (?:price )?(?:of|for)|dividend(?: yield)? (?:of|for|on)|yield (?:of|for|on)|about|on|for)\s+(.+?)(?:\s+(?:stock|shares?|pay|doing|dividend|yield|etf))?$/) || n.match(/^how (?:is|are) (.+?) (?:stock|shares?|doing)/) || n.match(/^(.+?)\s+(?:stock|shares?|dividend|yield|etf)\b/); sq = sm ? sm[1].replace(/^(?:the|a|an|my)\s+/, '').trim() : null; }
      return { intent: 'stock', query: sq && !/^(?:stocks?|shares?|dividends?|yield|etfs?|market)$/.test(sq) ? sq : null };
    }
    if (/\b(?:(?:any|the|latest|today's|todays|recent|top)\s+(?:ai\s+)?news|ai news|headlines?|news (?:about|on|for)|what is (?:the )?news|tell me the news|catch me up on)\b/.test(n)) {
      var nm2 = n.match(/\bnews (?:about|on|for)\s+(.+)$/) || n.match(/\bheadlines? (?:about|on|for)\s+(.+)$/);
      return { intent: 'news', topic: nm2 ? nm2[1].trim() : '' };
    }
    if (/\b(?:what(?:'s| is)? (?:the )?time|what time|time is it|current time|got the time|tell me the time)\b/.test(n) || /^time$/.test(n)) return { intent: 'time' };
    if (/\b(?:what is (?:the )?date|today's date|what day|which day|day is it|what is today|what is the day)\b/.test(n) || /^(?:date|today)$/.test(n)) return { intent: 'date' };

    // math: digits or number words, operators or words, percent-of
    var mt = numberWords(n.replace(/^(?:what is|calculate|compute|how much is|solve|work out|figure out)\s+/, ''));
    var pm = mt.match(/^(\d+(?:\.\d+)?)\s*(?:%|percent)\s*of\s*(\d+(?:\.\d+)?)$/);
    if (pm) return { intent: 'math', expr: pm[1] + '*' + pm[2] + '/100' };
    mt = mt.replace(/\bplus\b|\band\b/g, '+').replace(/\bminus\b|\btake away\b/g, '-').replace(/\btimes\b|\bmultiplied by\b/g, '*').replace(/\bdivided by\b|\bover\b/g, '/').replace(/\bto the power of\b/g, '^').replace(/\bsquared\b/g, '^2').replace(/\bcubed\b/g, '^3').replace(/,/g, '');
    if (/^[\d\s.+\-*/()^x%]+$/.test(mt) && /\d/.test(mt) && /[+\-*/^x]/.test(mt.replace(/^-/, ''))) return { intent: 'math', expr: mt.replace(/x/g, '*').replace(/%/g, '/100') };

    var fm = n.match(/^(?:who|what) (?:is|are|was|were)(?: a| an| the)? (.+)$/) || n.match(/^(?:tell me|can you tell me)(?: something| more)? about\s+(.+)$/) ||
      n.match(/^(?:explain|define|look up|lookup|search for|search|what do you know about|describe)\s+(.+)$/) || n.match(/^(?:what does|what is the meaning of|meaning of)\s+(.+?)(?: mean)?$/) ||
      n.match(/^(?:how (?:tall|old|big|far|long|heavy|deep|wide|hot|many people live in)) (?:is|are|was)(?: the)? (.+)$/) || n.match(/^(?:when (?:was|did)|where is|where are|who (?:invented|discovered|wrote|founded|created|painted|built|directed)|what is the capital of|capital of)\s+(.+)$/);
    if (fm) {
      var q = fm[1].replace(/\?$/, '').trim();
      if (q && !/^(?:you|your|my|me|up|going on|the (?:time|date|day|weather)|this|that|it|here|new|there)\b/.test(q) && !/\b(?:poem|story|song|haiku|essay|limerick|write|joke|riddle|rap|speech)\b/.test(q)) {
        var qc = crewByName(ctx, q.toLowerCase(), false);
        if (qc) return { intent: 'about_crew', crew: qc.id };
        if (ctx.glossary && ctx.glossary.indexOf(q.toLowerCase()) > -1) return { intent: 'glossary', term: q };
        return { intent: 'fact', query: q };
      }
    }

    /* ----- softer phrasing ----- */
    m = n.match(/^(?:i (?:need|have|got|must|should|want|plan|would like) to|i have got to|do not let me forget to|i am (?:going|planning) to)\s+(.+)$/);
    if (m && !/^(?:talk|speak|hear|ask|see|know|understand|learn about|relax|think|feel|be)\b/.test(m[1])) return { intent: 'mission_soft', title: raw.replace(/^(?:i['’]?\s*(?:need|have|got|must|should|want|plan|would like)|i['’]?ve got|i['’]?m (?:going|planning)|don['’]?t let me forget)\s*(?:to)?\s*/i, '').trim() || m[1] };

    return null;
  }

  return { analyze: analyze, norm: norm, words: words, lev: lev, MODULES: MODULES, ROLES: ROLES };
});
