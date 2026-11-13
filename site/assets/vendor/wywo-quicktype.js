/*
 * ⚡ Quick type — sorts plain words into note fields. NOTHING is thrown away: whatever can't be
 * categorised lands in `reason` (if empty) or `extra` (Additional notes).
 * Pure function (no DOM) so it can be unit-tested:  QuickType.parse("Phil Gordon 516-787-9090 …")
 */
(function (root) {
  'use strict';
  var TEAM = 'Check with team';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function first(name) { var w = String(name || '').trim().split(/\s+/); if (/^(?:dr|mr|mrs|ms|mx|prof|judge|mayor|rev|sgt|capt)\.?$/i.test(w[0]) && w[1]) return w[0] + ' ' + w[1]; return w[0] || 'the caller'; }
  // Sorts plain words into fields. NOTHING is thrown away: whatever can't be
  // categorised lands in `reason` (if empty) or `extra` (Additional notes).
  function parseQuick(t) {
    var o = {}, refs = [], rest = '\n' + String(t).replace(/\r/g, '').replace(/\s+(?:--+|[—–])\s+/g, '. ') + '\n', cats = 0;
    function take(re, fn) { var m = rest.match(re); if (m) { fn(m); rest = rest.replace(m[0], ' '); cats++; } return !!m; }
    var CAP = "[A-Z][\\w’'.-]*";
    var cap2 = function (re) { return new RegExp(re.replace(/CAP/g, CAP)); };

    // 1. explicit "label: value" lines
    [['caller', /^[ \t]*(?:caller|name)[ \t]*:[ \t]*(.+)$/im], ['company', /^[ \t]*(?:company|org|organization)[ \t]*:[ \t]*(.+)$/im],
     ['phone', /^[ \t]*(?:phone|tel|telephone)[ \t]*:[ \t]*(.+)$/im], ['alt', /^[ \t]*(?:cell|fax|email|e-mail)[ \t]*:[ \t]*(.+)$/im],
     ['forWho', /^[ \t]*for[ \t]*:[ \t]*(.+)$/im], ['reason', /^[ \t]*(?:reason|why)[ \t]*:[ \t]*(.+)$/im],
     ['action', /^[ \t]*(?:action|request)[ \t]*:[ \t]*(.+)$/im], ['extra', /^[ \t]*notes?[ \t]*:[ \t]*(.+)$/im],
     ['topics', /^[ \t]*(?:topics?|re|regarding|about)[ \t]*:[ \t]*(.+)$/im]]
      .forEach(function (kv) { take(kv[1], function (m) { o[kv[0]] = m[1].trim(); }); });

    // 2. links -> references
    var urls = rest.match(/(?:https?:\/\/|www\.)[^\s,;)]+/gi) || [];
    urls.forEach(function (u) { u = u.replace(/[.,;:!?]+$/, ''); rest = rest.replace(u, ' '); cats++;
      refs.push({ title: u.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0], detail: '', url: /^www\./i.test(u) ? 'https://' + u : u }); });

    // 3. email, bare domains, phones, time, urgent
    take(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/, function (m) { o.alt = o.alt ? o.alt + ' · ' + m[0] : m[0]; });
    (rest.match(/\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|gov|us|biz|info|edu)\b/gi) || []).forEach(function (d) {
      rest = rest.replace(d, ' '); cats++; if (!refs.some(function (r) { return r.url === 'https://' + d; })) refs.push({ title: d, detail: '', url: 'https://' + d }); });
    rest = rest.replace(/\b(?:web\s*site|site|domain)(?:\s+name)?\s*[:=]?\s*(?=[.,;]|\s*$)/gi, ' ');
    var phones = rest.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d+)?/g) || [];
    phones.forEach(function (p, i) { rest = rest.replace(p, ' | '); cats++; var c = p.trim().replace(/^\+?1[\s.-]/, '').replace(/^\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})(.*)$/, function (m, a, b, d, tail) { return a + '-' + b + '-' + d + tail; });
      if (i === 0 && !o.phone) o.phone = c; else o.alt = o.alt ? o.alt + ' · ' + c : c; });
    (function () {
      var m = rest.match(/\b(?:(after|before|until|by|around|from|between)\s+)?(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?\b/i);
      if (m && !m[1]) { var h = +m[2] % 12 + (/p/i.test(m[4]) ? 12 : 0); o.time = pad(h) + ':' + (m[3] || '00'); rest = rest.replace(m[0], ' '); cats++; }
    })();
    take(/\b(?:very\s+)?(?:urgent(?:ly)?|asap|emergency)\b[!.]*/i, function () { o.urgent = true; });

    // 4. transfer + topics + callback wording
    if (!o.caller) take(/^\s*([A-Za-z][\w’'.-]*(?:\s+[A-Za-z][\w’'.-]*)?)\s+(?:called|phoned|rang|is\s+calling)\b/, function (m) { o.caller = m[1].replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); });
    var again = take(/\bwill\s+call\s+(?:you\s+)?again\b/i, function () {});

    var routedTo = '', routedCb = false;
    take(/\b(?:wants?|needs?|would\s+like|asked)\s+((?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)?\s*[A-Z][\w’'-]+(?:\s+[A-Z][\w’'-]+)?)\s+to\s+(?:call|phone|ring|contact|get\s+back)(?:\s+(?:him|her|them|back))*(?:\s+back)?\b/, function (m) { routedTo = m[1].trim(); routedCb = true; });
    var cb = routedCb;
    cb = take(/\b(?:(?:wants?|asked?|would\s+like|needs?)\s+(?:someone|somebody|you|us)\s+to\s+)?(?:please\s+)?(?:call|ring|phone)\s+(?:him|her|them|me|back)(?:\s+back)?\b|\b(?:(?:wants?|needs?|would\s+like|asked?\s+for)\s+(?:a\s+|an\s+|the\s+)?)?call\s?-?back\b|\breturn\s+(?:the\s+|his\s+|her\s+|their\s+)?call\b/i, function () {}) || cb;
    var tr = '';
    take(/\b(?:was\s+|were\s+)?transferred\s+(?:by|from)\s+(?:the\s+)?([^,.;\n]+)/i, function (m) { tr = m[1].trim(); });
    if (!o.topics && !take(/(?:\bre\s*:|\bregarding\b|\bconcerning\b|\bquestions?\s+(?:on|about|regarding|concerning)\b|\bwants?\s+to\s+know\s+about\b)\s*([^\n]+?)(?=\.(?:\s|$)|\n|$)/i, function (m) { o.topics = m[1]; }))
      take(/\b(?:asking|calling|call(?:ed)?|phoned|wondering)?\s*\babout\s+([^,.;\n]+)/i, function (m) { o.topics = m[1]; });
    if (o.topics) o.topics = o.topics.split(/\s*(?:,|;|\band\b|\+|&|\n)\s*/i).map(function (x) { return x.trim().replace(/\.$/, ''); })
      .filter(Boolean).map(function (x) { return x.charAt(0).toUpperCase() + x.slice(1); }).join('\n');
    var spoke = '';
    take(/\b(?:wants?|would\s+like|asked?)\s+to\s+(?:speak|talk)\s+(?:to|with)\s+(?:the\s+)?([^,.;\n|]+)/i, function (m) { spoke = m[1].trim().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); });
    rest = rest.replace(/\b(?:(?:and|or)\s+)?(?:(?:her|his|their|my)\s+)?(?:(?:web\s*site|site|domain)(?:\s+name)?|e-?mail(?:\s+address)?)\s*(?:is|:|=)\s*/gi, ' ')
      .replace(/\b(?:(?:and|or)\s+)?(?:(?:her|his|their|my)\s+)?(?:cell(?:\s*phone)?|mobile|fax|direct(?:\s+line)?|office|home|work)(?:\s+(?:number|phone|line))?\s*(?:is|at|:)?\s*(?=[|,.;]|\s*$)/gi, ' ')
      .replace(/\b(?:and\s+)?(?:is\s+)?also\s+(?:reachable|available)\s*(?:at|on)?\s*/gi, ' ');
    var prefs = [];
    for (var pm; (pm = rest.match(/\b(?:prefers?|best\s+(?:time|way)|can\s+be\s+reached)\b[^.\n]*/i));) { prefs.push(pm[0].trim().replace(/^./, function (c) { return c.toUpperCase(); }).replace(/\s+/g, ' ')); rest = rest.replace(pm[0], ' '); cats++; }
    rest = rest.replace(/\b(?:also\s+)?(?:reachable|available)\s*(?:at|on)?\s*(?=[.|,]|\s*$)/gi, ' ');

    // 5. people & places
    if (!o.forWho) take(/\b(?:check\s+with\s+(?:the\s+)?team|for\s+(?:the\s+|any\s*one|whoever)[^,.;\n]*team|for\s+anyone)\b/i, function () { o.forWho = TEAM; });
    if (!o.forWho) take(cap2('\\b(?:[Mm]essage|[Nn]ote|[Cc]all)\\s+for\\s+(CAP(?:\\s+CAP)?)'), function (m) { o.forWho = m[1]; });
    if (!o.forWho) take(cap2('\\b(?:asking\\s+for|looking\\s+for|trying\\s+to\\s+reach|wants?\\s+to\\s+reach|needs?|tell|let)\\s+((?:Mr\\.?|Mrs\\.?|Ms\\.?|Dr\\.?)?\\s*CAP(?:\\s+CAP)?)(?=\\s*(?:,|\\.|\\bto\\b|\\bthat\\b|\\bknow\\b|$))'), function (m) { o.forWho = m[1].trim(); });
    if (!o.caller) take(cap2('^[\\s,:;.|\\-–—]*(?:(?:call|message|note)\\s+(?:from\\s+)?|(?:got\\s+a\\s+call\\s+from\\s+))?(CAP(?:\\s+CAP){0,2}?)(?=\\s*(?:,|\\||\\bfrom\\b|\\bwith\\b|\\bat\\b|\\bof\\b|\\bcalled\\b|\\bwas\\b|\\bwith\\b|[.\\n]|$))'), function (m) { o.caller = m[1]; });
    if (!o.company) take(cap2('\\b(?:from|with|of|at|calling\\s+for)\\s+(CAP(?:\\s+(?:CAP|&|and\\s+CAP))*)'), function (m) { o.company = m[1].replace(/\s+(?:and|&)$/, ''); });

    if (!o.company && o.caller) take(cap2('^[\\s,|\\-–—(]+(CAP(?:\\s+(?:CAP|&))*)\\s*(?=[,.;)\\n]|\\s+(?:or|and|called|\\d))'), function (m) { o.company = m[1].trim(); });

    if (spoke && !o.forWho) o.forWho = spoke;
    if (routedTo && !o.forWho) o.forWho = routedTo;
    if (prefs.length) o.extra = ((o.extra ? o.extra + '\n' : '') + prefs.join('. ').replace(/\.?$/, '.'));

    // "Sam at the city clerk wants …" → organisation = City Clerk
    if (!o.company && o.caller) take(/\b(?:at|from|with)\s+the\s+([a-z][a-z&' -]{2,34}?)(?=\s+(?:wants?|called|calls?|asked|asks|is|says?|needs?|would|has|had|about|regarding|concerning|re)\b|[,.;|\n]|\s*$)/i, function (m) { o.company = m[1].trim().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); });

    // 6. compose the sentences we can
    var who = o.caller ? first(o.caller) : 'Caller';
    if (spoke && !o.reason) o.reason = who + ' wants to speak with ' + spoke + '.';
    if (tr && !o.reason) o.reason = who + ' was transferred by the ' + tr.replace(/^the\s+/i, '') + '.';
    else if (tr) o.extra = ((o.extra ? o.extra + '\n' : '') + 'Transferred by the ' + tr.replace(/^the\s+/i, '') + '.');
    if (again) o.methods = ['Telephoned', 'Will call again'];
    else if (cb || o.caller || o.phone) o.methods = ['Telephoned', 'Please call'];
    if (!o.action && (cb || o.caller)) o.action = 'Please return ' + who + (/s$/i.test(who) ? '’' : '’s') + ' call' + (o.topics ? ' regarding the above matters.' : '.');

    // 7. leftovers: never lose anything
    rest = rest.replace(/\b(?:or|and)?\s*(?:(?:her|his|their|my)\s+)?(?:cell|fax|e-?mail|mobile|phone|number|website|site|see|at|is|called|phoned|calling)\s*(?:is|:)?\s*(?=[,.;]|\s*$)/gi, ' ');
    var left = rest.replace(/[ \t]+/g, ' ').split('\n').map(function (l) { return l.replace(/^[\s,;:.|\-–—]+|[\s,;:|\-–—]+$/g, '').trim(); })
      .filter(function (l) { return l.length > 1 && !/^(?:and|the|a|to|re|for|from|with|at|of|by)$/i.test(l); }).join('\n');
    left = left.replace(/(?:\s*[,;.|]\s*){2,}/g, ', ').replace(/\s+,/g, ',').replace(/\s*\|\s*/g, ' ').replace(/^[\s,;:.]+|[\s,;:.]+$/g, '');
    if (left) { if (!o.reason) o.reason = left; else o.extra = (o.extra ? o.extra + '\n' : '') + left; }
    if (refs.length) o.refs = refs;
    o.__cats = cats;
    return o;
  }

  root.QuickType = { parse: parseQuick, TEAM: TEAM };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.QuickType;
})(typeof window !== 'undefined' ? window : globalThis);
