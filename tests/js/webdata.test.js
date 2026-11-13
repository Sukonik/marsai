'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const MarsWeb = require('../../site/assets/webdata.js');
const fx = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', n), 'utf8'));
const U = MarsWeb.URLS;

function mockFetch(overrides) {
  const calls = [];
  const f = async (url) => {
    calls.push(url);
    const hit = (overrides && Object.keys(overrides).find((k) => url.startsWith(k)));
    if (hit && overrides[hit] instanceof Error) throw overrides[hit];
    if (hit && typeof overrides[hit] === 'number') return { ok: false, status: overrides[hit], json: async () => ({}) };
    const body = hit ? overrides[hit] : (
      url.startsWith(U.geo) ? fx('geocode.json') : url.startsWith(U.forecast) ? fx('forecast.json') : url.startsWith(U.air) ? fx('air.json') :
      url.startsWith(U.payout) ? fx('payout.json') : url.startsWith(U.news) ? fx('news.json') : url.startsWith(U.daily) ? fx('daily.json') :
      url.startsWith(U.glossary) ? fx('glossary.json') : null);
    if (body === null) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  };
  f.calls = calls;
  return f;
}
const web = (o, imperial) => MarsWeb.create({ fetch: mockFetch(o), imperial: !!imperial, log: () => {} });

test('weather: full report with UV, air quality, sun times, and a ClearSky link', async () => {
  const r = await web().weather({ city: 'Seattle' });
  assert.match(r.text, /^Seattle, United States: 9°C now, light rain|^Seattle, United States: 9°C now, rain/);
  assert.match(r.text, /feels like 7°C/); assert.match(r.text, /gusts 31/); assert.match(r.text, /high 11°C, low 6°C, 85% chance/);
  assert.match(r.text, /UV peaks at 2 \(low\)/); assert.match(r.text, /Air quality 42 \(good\)/); assert.match(r.text, /Sunrise 7:05 AM, sunset 4:40 PM/);
  assert.equal(r.cards[0].url, 'https://sukonik.github.io/weather-app/');
});
test('weather: umbrella question is answered first', async () => {
  const r = await web().weather({ city: 'Seattle', ask: 'umbrella' });
  assert.match(r.text, /^Yes, take an umbrella\./);
});
test('weather: air quality failing does not break the report and invents nothing', async () => {
  const r = await web({ [U.air]: new Error('down') }).weather({ city: 'Seattle' });
  assert.ok(!/Air quality/.test(r.text)); assert.match(r.text, /UV peaks/);
});
test('weather: missing fields are omitted, never shown as zero', async () => {
  const r = await web({ [U.forecast]: { current: { temperature_2m: 3 }, daily: {} } }).weather({ city: 'Seattle' });
  assert.match(r.text, /3°C now/); assert.ok(!/0%|UV|wind 0|humidity 0/.test(r.text));
});
test('weather: unknown place gets a helpful answer', async () => {
  const r = await web({ [U.geo]: { results: [] } }).weather({ city: 'Zzyzx' });
  assert.match(r.text, /couldn't find a place called Zzyzx/);
});
test('weather: coordinates skip geocoding; imperial units are requested', async () => {
  const f = mockFetch(); const w = MarsWeb.create({ fetch: f, imperial: true });
  const r = await w.weather({ lat: 47.6, lon: -122.3, label: 'Your location' });
  assert.match(r.text, /^Your location:/); assert.ok(f.calls.every((u) => !u.startsWith(U.geo))); assert.ok(f.calls.some((u) => /temperature_unit=fahrenheit/.test(u)));
  assert.match(r.text, /°F/);
});
test('weather: rate limit surfaces as an error with a status', async () => {
  await assert.rejects(web({ [U.geo]: 429 }).weather({ city: 'Seattle' }), (e) => e.status === 429);
});
test('labels', () => {
  assert.equal(MarsWeb.aqiLabel(42), 'good'); assert.equal(MarsWeb.aqiLabel(120), 'unhealthy for sensitive groups'); assert.equal(MarsWeb.uvLabel(9), 'very high');
  assert.equal(MarsWeb.schedWords('Q3'), 'quarterly'); assert.equal(MarsWeb.schedWords('M'), 'monthly'); assert.equal(MarsWeb.schedWords('S'), 'twice a year');
});

test('stocks: ticker lookup with price, yield, schedule, last ex-date, source, and a disclaimer', async () => {
  const r = await web().stock('SCHD');
  assert.equal(r.ticker, 'SCHD'); assert.match(r.text, /^SCHD \(Schwab US Dividend Equity ETF\): \$36\.16\./);
  assert.match(r.text, /Pays about \$1\.06 a year \(2\.9% yield\), quarterly/); assert.match(r.text, /Last ex-dividend date Sep 23, 2026, last payment \$0\.27/);
  assert.match(r.text, /Yahoo Finance via Payout Lab, updated Nov 12, 2026/); assert.match(r.text, /not investment advice/);
  assert.equal(r.cards[0].url, 'https://sukonik.github.io/payout-lab/');
});
test('stocks: lowercase symbols and company names work', async () => {
  assert.equal((await web().stock('schd')).ticker, 'SCHD');
  const k = await web().stock('how is Coca-Cola stock doing'); assert.equal(k.ticker, 'KO');
});
test('stocks: a non-dividend stock says so plainly', async () => {
  const r = await web().stock('NODIV'); assert.match(r.text, /No dividend in the last 12 months/); assert.ok(!/yield/.test(r.text));
});
test('stocks: unknown ticker is honest and still offers Payout Lab', async () => {
  const r = await web().stock('ZZZZ'); assert.match(r.text, /couldn't find "ZZZZ"/); assert.equal(r.cards.length, 1);
});
test('stocks: the data file is cached between questions', async () => {
  const f = mockFetch(); const w = MarsWeb.create({ fetch: f }); await w.stock('SCHD'); await w.stock('KO');
  assert.equal(f.calls.filter((u) => u.startsWith(U.payout)).length, 1);
});

test('news: latest curated items, newest first, with sources and a GoldBrief link', async () => {
  const r = await web().news();
  assert.match(r.text, /^Latest AI news from GoldBrief \(curated, updated 2026-11-13\):/);
  const items = r.cards.slice(0, -1); assert.equal(items.length, 4);
  const dates = items.map((c) => c.sub.split(' · ')[1]); assert.deepEqual([...dates].sort().reverse(), dates);
  assert.ok(items.every((c) => /^https?:\/\//.test(c.url))); assert.equal(r.cards.at(-1).url, 'https://sukonik.github.io/goldbrief/news.html');
});
test('news: topic filter', async () => {
  const r = await web().news('news about SpaceX'); assert.match(r.text, /spacex/i); assert.ok(r.cards.length >= 2);
});
test('news: a topic with no curated story falls back to labeled, unreviewed headlines', async () => {
  const daily = fx('daily.json'); const word = daily.stories[0].title.split(/\s+/).find((w) => w.length > 6).toLowerCase().replace(/[^a-z]/g, '');
  const r = await web({ [U.news]: { updated: 'x', news: [] } }).news(word);
  assert.match(r.text, /automated and unreviewed/); assert.match(r.cards[0].sub, /Automated \/ unreviewed/);
});
test('glossary: plain definition and link; unknown term returns null', async () => {
  const r = await web().glossary('hallucination'); assert.match(r.text, /^Hallucination: /); assert.equal(r.cards[0].url, 'https://sukonik.github.io/goldbrief/glossary.html');
  assert.equal(await web().glossary('flibbertigibbet'), null);
});
test('wikipedia: best match plus related links and a web search link', async () => {
  const wiki = { query: { pages: { 1: { title: 'Ada Lovelace', extract: 'Augusta Ada King was an English mathematician.', fullurl: 'https://en.wikipedia.org/wiki/Ada_Lovelace', index: 1 }, 2: { title: 'Lovelace Medal', extract: 'x', fullurl: 'https://en.wikipedia.org/wiki/Lovelace_Medal', index: 2 } } } };
  const r = await web({ [U.wiki]: wiki }).wiki('ada lovelace');
  assert.match(r.text, /English mathematician/); assert.equal(r.cards[0].url, 'https://en.wikipedia.org/wiki/Ada_Lovelace'); assert.match(r.cards.at(-1).url, /duckduckgo\.com\/\?q=ada%20lovelace/);
});
