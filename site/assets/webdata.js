/* MARSAI web data: live, no-key sources, mostly the captain's own open projects.
 *   Weather : Open-Meteo forecast + air quality (same sources as ClearSky, github.com/Sukonik/weather-app)
 *   Stocks  : Payout Lab daily data file (github.com/Sukonik/payout-lab), Yahoo Finance via Payout Lab
 *   News    : GoldBrief AI news (github.com/Sukonik/goldbrief): curated items, labeled sources
 *   Glossary: GoldBrief plain-language AI glossary
 * Every function is independent and degrades gracefully ("Data unavailable" never becomes a fake zero).
 * Works in the browser and in Node (tests inject fetch). Every network call is reported to opts.log. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarsWeb = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var URLS = {
    geo: 'https://geocoding-api.open-meteo.com/v1/search', forecast: 'https://api.open-meteo.com/v1/forecast', air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    payout: 'https://sukonik.github.io/payout-lab/data.json', news: 'https://sukonik.github.io/goldbrief/data/news.json', daily: 'https://sukonik.github.io/goldbrief/data/daily.json',
    glossary: 'https://sukonik.github.io/goldbrief/data/glossary.json',
    wiki: 'https://en.wikipedia.org/w/api.php'
  };
  var SITES = { clearsky: 'https://sukonik.github.io/weather-app/', payout: 'https://sukonik.github.io/payout-lab/', goldbrief: 'https://sukonik.github.io/goldbrief/',
    news: 'https://sukonik.github.io/goldbrief/news.html', glossary: 'https://sukonik.github.io/goldbrief/glossary.html', wywo: 'https://sukonik.github.io/wywo/' };
  var WMO = { 0: 'clear sky', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 48: 'foggy', 51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle', 56: 'freezing drizzle', 57: 'freezing drizzle',
    61: 'light rain', 63: 'rain', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain', 71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains', 80: 'rain showers', 81: 'rain showers',
    82: 'violent rain showers', 85: 'snow showers', 86: 'heavy snow showers', 95: 'a thunderstorm', 96: 'a thunderstorm with hail', 99: 'a thunderstorm with hail' };

  function has(v) { return v !== null && v !== undefined && !(typeof v === 'number' && isNaN(v)); }
  function aqiLabel(a) { return a <= 50 ? 'good' : a <= 100 ? 'moderate' : a <= 150 ? 'unhealthy for sensitive groups' : a <= 200 ? 'unhealthy' : a <= 300 ? 'very unhealthy' : 'hazardous'; }
  function uvLabel(u) { return u < 3 ? 'low' : u < 6 ? 'moderate' : u < 8 ? 'high' : u < 11 ? 'very high' : 'extreme'; }
  function hhmm(iso) { var m = /T(\d{2}):(\d{2})/.exec(iso || ''); return m ? (+m[1] % 12 || 12) + ':' + m[2] + ' ' + (+m[1] >= 12 ? 'PM' : 'AM') : null; }
  function schedWords(s) { return s === 'M' ? 'monthly' : /^Q/.test(s || '') ? 'quarterly' : s === 'S' ? 'twice a year' : s === 'A' ? 'once a year' : null; }
  function monthDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return null; return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1]; }
  function money(n) { return '$' + (n >= 1000 ? Math.round(n).toLocaleString('en-US') : (Math.round((n + 1e-9) * 100) / 100).toFixed(2)); }
  function host(u) { try { return new URL(u).hostname; } catch (e) { return u; } }

  function create(opts) {
    opts = opts || {};
    var doFetch = opts.fetch || function (u, o) { return fetch(u, o); };
    var log = opts.log || function () {};
    var imperial = !!opts.imperial, cache = {};

    function getJson(url, ms) {
      log('Web: ' + host(url));
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, ms || 9000) : null;
      return doFetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
        if (timer) clearTimeout(timer);
        if (!r.ok) { var e = new Error('http ' + r.status); e.status = r.status; throw e; }
        return r.json();
      }, function (e) { if (timer) clearTimeout(timer); throw e; });
    }
    function cached(key, url, ttl) {
      var c = cache[key]; if (c && Date.now() - c.at < (ttl || 600000)) return Promise.resolve(c.v);
      return getJson(url, 15000).then(function (v) { cache[key] = { at: Date.now(), v: v }; return v; });
    }
    function soft(p) { return p.then(function (v) { return v; }, function () { return null; }); }

    /* ---------- weather ---------- */
    function geocode(city) {
      return getJson(URLS.geo + '?name=' + encodeURIComponent(city) + '&count=1&language=en&format=json').then(function (g) { return g.results && g.results[0] ? g.results[0] : null; });
    }
    function forecastAt(label, lat, lon, ask) {
      var f = URLS.forecast + '?latitude=' + lat + '&longitude=' + lon +
        '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m' +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&forecast_days=1&timezone=auto' + (imperial ? '&temperature_unit=fahrenheit&wind_speed_unit=mph' : '');
      var a = URLS.air + '?latitude=' + lat + '&longitude=' + lon + '&current=us_aqi&timezone=auto';
      return Promise.all([getJson(f), soft(getJson(a))]).then(function (r) {
        var d = r[0], air = r[1], c = d.current || {}, dd = d.daily || {}, u = imperial ? '°F' : '°C', w = imperial ? 'mph' : 'km/h', out = [];
        if (has(c.temperature_2m)) out.push(Math.round(c.temperature_2m) + u + ' now' + (has(c.weather_code) && WMO[c.weather_code] ? ', ' + WMO[c.weather_code] : ''));
        else if (has(c.weather_code) && WMO[c.weather_code]) out.push(WMO[c.weather_code]);
        if (has(c.apparent_temperature)) out.push('feels like ' + Math.round(c.apparent_temperature) + u);
        if (has(c.wind_speed_10m)) out.push('wind ' + Math.round(c.wind_speed_10m) + ' ' + w + (has(c.wind_gusts_10m) && c.wind_gusts_10m > c.wind_speed_10m + 8 ? ' (gusts ' + Math.round(c.wind_gusts_10m) + ')' : ''));
        if (has(c.relative_humidity_2m)) out.push('humidity ' + c.relative_humidity_2m + '%');
        var text = label + ': ' + (out.length ? out.join(', ') : 'current conditions unavailable') + '.';
        var day = [];
        if (dd.temperature_2m_max && has(dd.temperature_2m_max[0])) day.push('high ' + Math.round(dd.temperature_2m_max[0]) + u);
        if (dd.temperature_2m_min && has(dd.temperature_2m_min[0])) day.push('low ' + Math.round(dd.temperature_2m_min[0]) + u);
        var pp = dd.precipitation_probability_max && dd.precipitation_probability_max[0];
        if (has(pp)) day.push(pp + '% chance of precipitation');
        if (day.length) text += ' Today: ' + day.join(', ') + '.';
        var uv = dd.uv_index_max && dd.uv_index_max[0];
        if (has(uv)) text += ' UV peaks at ' + Math.round(uv) + ' (' + uvLabel(uv) + ').';
        var us = air && air.current && air.current.us_aqi;
        if (has(us)) text += ' Air quality ' + Math.round(us) + ' (' + aqiLabel(us) + ').';
        var sr = hhmm(dd.sunrise && dd.sunrise[0]), ss = hhmm(dd.sunset && dd.sunset[0]);
        if (sr && ss) text += ' Sunrise ' + sr + ', sunset ' + ss + '.';
        if (ask === 'umbrella' && has(pp)) text = (pp >= 50 ? 'Yes, take an umbrella. ' : pp >= 25 ? 'Maybe a small one. ' : 'Probably not. ') + text;
        return { text: text, cards: [{ title: 'Open ClearSky for hourly, wind, tides and air quality', url: SITES.clearsky, sub: 'Weather data by Open-Meteo.com' }] };
      });
    }
    function weather(o) {
      o = o || {};
      if (has(o.lat) && has(o.lon)) return forecastAt(o.label || 'Your location', o.lat, o.lon, o.ask);
      return geocode(o.city).then(function (p) {
        if (!p) return { text: "I couldn't find a place called " + o.city + '. Try another spelling, or add the country.', cards: [] };
        return forecastAt(p.name + (p.country ? ', ' + p.country : ''), p.latitude, p.longitude, o.ask).then(function (r) { r.place = p.name; return r; });
      });
    }

    /* ---------- stocks (Payout Lab daily file) ---------- */
    var NOISE = /\b(stock|stocks|share|shares|price|prices|quote|of|for|the|a|an|inc|corp|corporation|company|co|ltd|plc|etf|fund|dividend|dividends|yield|pay|pays|payout|doing|how|is|what|does|much|ticker|symbol)\b/g;
    function loadPayout() { return cached('payout', URLS.payout, 1800000); }
    function resolveTicker(data, q) {
      var T = data.tickers || {}, raw = String(q || '').trim(), up = raw.toUpperCase();
      if (/^[A-Za-z.\-]{1,6}$/.test(raw) && T[up]) return up;
      var toks = raw.toLowerCase().replace(NOISE, ' ').replace(/[^a-z0-9& ]/g, ' ').split(/\s+/).filter(Boolean);
      if (!toks.length) return null;
      var best = null, bl = 1e9;
      Object.keys(T).forEach(function (k) {
        var n = (T[k].n || '').toLowerCase().replace(/[^a-z0-9& ]/g, ' ');
        if (toks.every(function (t) { return n.split(/\s+/).indexOf(t) > -1 || n.indexOf(t) === 0 || (t.length > 3 && n.indexOf(t) > -1); }) && n.length < bl) { best = k; bl = n.length; }
      });
      return best;
    }
    function stock(q) {
      return loadPayout().then(function (data) {
        var k = resolveTicker(data, q), card = { title: 'Open Payout Lab to stress-test a dividend portfolio', url: SITES.payout, sub: 'Free, no signup. Your portfolio stays on your device.' };
        if (!k) return { text: "I couldn't find \"" + q + "\" in the Payout Lab data (about " + Object.keys(data.tickers || {}).length + ' stocks and ETFs). Try the ticker symbol, like SCHD or KO.', cards: [card] };
        var t = data.tickers[k], out = k + ' (' + (t.n || 'name unavailable') + ')';
        out += has(t.p) ? ': ' + money(t.p) + '.' : ': price unavailable.';
        if (has(t.d) && t.d > 0) {
          out += ' Pays about ' + money(t.d) + ' a year' + (has(t.p) && t.p > 0 ? ' (' + (t.d / t.p * 100).toFixed(1) + '% yield)' : '') + (schedWords(t.s) ? ', ' + schedWords(t.s) : '') + '.';
          if (t.last) out += ' Last ex-dividend date ' + monthDay(t.last) + (has(t.per) ? ', last payment ' + money(t.per) : '') + '. Cash usually arrives a few weeks after the ex-date.';
          if (has(t.g5)) out += ' Dividend growth about ' + (t.g5 * 100).toFixed(1) + '% a year over 5 years.';
        } else if (has(t.d)) out += ' No dividend in the last 12 months.';
        var upd = monthDay(t.u || data.updated);
        out += ' Price from ' + (t.src || data.source || 'the provider') + ' via Payout Lab' + (upd ? ', updated ' + upd : '') + '. Educational data, not investment advice.';
        return { text: out, cards: [card], ticker: k };
      });
    }

    /* ---------- news (GoldBrief) ---------- */
    function newsMatch(it, toks) { var h = ((it.title || '') + ' ' + (it.company || '') + ' ' + (it.summary || '') + ' ' + (it.source || '')).toLowerCase(); return toks.every(function (t) { return h.indexOf(t) > -1; }); }
    function news(topic, n) {
      n = n || 4;
      var toks = String(topic || '').toLowerCase().replace(/\b(news|headlines?|about|on|for|the|latest|in|ai|artificial intelligence|any|what|is|happening|new|today|tell|me|story|stories|updates?)\b/g, ' ').split(/\s+/).filter(Boolean);
      return Promise.all([cached('news', URLS.news, 900000), soft(cached('daily', URLS.daily, 900000))]).then(function (r) {
        var items = (r[0].news || []).slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
        var pick = toks.length ? items.filter(function (it) { return newsMatch(it, toks); }) : items, label = 'curated', where = 'GoldBrief';
        var cards = pick.slice(0, n).map(function (it) { return { title: it.title, url: it.url, sub: [it.source, it.date, it.type === 'company' ? 'Company announcement' : (it.type || 'Curated')].filter(Boolean).join(' · ') }; });
        if (!cards.length && r[1] && r[1].stories) {
          label = 'automated and unreviewed'; var st = r[1].stories.filter(function (s) { return !toks.length || newsMatch(s, toks); }).slice(0, n);
          cards = st.map(function (s) { return { title: s.title, url: s.url, sub: [s.source, s.date, 'Automated / unreviewed'].filter(Boolean).join(' · ') }; });
        }
        var upd = r[0].updated;
        var text = cards.length ? (toks.length ? 'Here is what GoldBrief has on ' + toks.join(' ') + ' (' + label + ')' : 'Latest AI news from GoldBrief (' + label + (upd ? ', updated ' + upd : '') + ')') + ':' : 'I could not find a GoldBrief story about ' + toks.join(' ') + '.';
        cards.push({ title: 'More on GoldBrief: AI news, explained', url: SITES.news, sub: 'Every item carries its source, date, and a label. Not a live feed.' });
        return { text: text, cards: cards };
      });
    }

    /* ---------- glossary (GoldBrief) ---------- */
    function loadGlossary() { return cached('glossary', URLS.glossary, 86400000).then(function (g) { return g.terms || []; }); }
    function glossary(term) {
      return loadGlossary().then(function (terms) {
        var q = String(term || '').trim().toLowerCase(), hit = terms.filter(function (t) { return t.term.toLowerCase() === q; })[0] || terms.filter(function (t) { return t.term.toLowerCase().indexOf(q) === 0; })[0];
        if (!hit) return null;
        return { text: hit.term + ': ' + hit.definition, cards: [{ title: 'GoldBrief AI glossary', url: SITES.glossary, sub: 'Plain-language AI terms' }] };
      });
    }

    /* ---------- Wikipedia facts with links ---------- */
    function wiki(q) {
      var url = URLS.wiki + '?action=query&generator=search&gsrsearch=' + encodeURIComponent(q) + '&gsrlimit=3&prop=extracts%7Cinfo&inprop=url&exintro=1&explaintext=1&exsentences=2&redirects=1&format=json&origin=*';
      return getJson(url).then(function (d) {
        var pages = d.query && d.query.pages ? Object.keys(d.query.pages).map(function (k) { return d.query.pages[k]; }) : [];
        pages.sort(function (a, b) { return (a.index || 9) - (b.index || 9); });
        var p = pages[0];
        if (!p || !p.extract) return { text: "I couldn't find a good match for " + q + ' on Wikipedia.', cards: [{ title: 'Search the web for ' + q, url: 'https://duckduckgo.com/?q=' + encodeURIComponent(q), sub: 'DuckDuckGo' }] };
        var ex = p.extract.replace(/\s+/g, ' ').trim(); if (ex.length > 420) ex = ex.slice(0, 417).replace(/\s+\S*$/, '') + '...';
        var cards = pages.slice(0, 3).map(function (x) { return { title: x.title + ' (Wikipedia)', url: x.fullurl || ('https://en.wikipedia.org/?curid=' + x.pageid), sub: x === p ? 'Best match' : 'Related' }; });
        cards.push({ title: 'Search the web for ' + q, url: 'https://duckduckgo.com/?q=' + encodeURIComponent(q), sub: 'DuckDuckGo' });
        return { text: ex, cards: cards };
      });
    }

    return { weather: weather, stock: stock, news: news, glossary: glossary, loadGlossary: loadGlossary, wiki: wiki, geocode: geocode };
  }

  return { create: create, URLS: URLS, SITES: SITES, aqiLabel: aqiLabel, uvLabel: uvLabel, schedWords: schedWords, monthDay: monthDay, WMO: WMO };
});
