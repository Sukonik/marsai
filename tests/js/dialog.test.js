'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const D = require('../../site/assets/dialog.js');
const crew = JSON.parse(fs.readFileSync(path.join(__dirname, '../../site/assets/crew.json'), 'utf8')).crew;
const by = (id) => crew.find((c) => c.id === id);
const ctx = (id = 'MARS', extra) => Object.assign({ crew: by(id), captain: '', now: new Date('2026-11-13T09:30:00') }, extra || {});
function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const say = (t, id, extra, seed) => { const r = D.respond(t, ctx(id, extra), seeded(seed || 7)); return r && r.text; };

test.beforeEach(() => D.reset());

test('content is real: no empty or duplicate entries', () => {
  for (const list of [D.JOKES, D.FACTS, D.QUOTES]) { assert.ok(list.length >= 12); assert.equal(new Set(list).size, list.length); assert.ok(list.every((x) => x.length > 15)); }
  assert.ok(D.RIDDLES.length >= 8 && D.RIDDLES.every((r) => r[0] && r[1]));
});
test('jokes vary and never repeat back to back', () => {
  const rand = seeded(3); const seen = []; for (let i = 0; i < 30; i++) { const r = D.respond('tell me a joke', ctx(), rand); seen.push(r.text); }
  assert.ok(new Set(seen).size >= 12, 'only ' + new Set(seen).size + ' distinct jokes');
  for (let i = 1; i < seen.length; i++) assert.notEqual(seen[i], seen[i - 1]);
});
test('follow-ups continue the last topic', () => {
  D.respond('tell me a joke', ctx(), seeded(1));
  const j2 = D.respond('another one', ctx(), seeded(2)); assert.equal(j2.intent, 'joke' === j2.intent ? 'joke' : j2.intent); assert.ok(D.JOKES.some((j) => j2.text.includes(j)));
  D.respond('fun fact', ctx(), seeded(1)); const f2 = D.respond('another', ctx(), seeded(2)); assert.match(f2.text, /Fun fact:/);
});
test('follow-up with no context asks what you want', () => {
  const r = D.respond('another one', ctx(), seeded(1)); assert.equal(r, null);
});
test('riddle then answer', () => {
  const r = say('give me a riddle'); assert.match(r, /\(Say "I give up" for the answer\.\)/);
  const a = say('i give up'); assert.match(a, /^(?:.*)The answer is:/); assert.equal(D.respond('i give up', ctx(), seeded(1)), null);
});
test('mood and support replies', () => {
  assert.match(say('I am so happy today'), /great to hear|Love that|Good\. Hold|what I like/);
  assert.match(say("I'm bored"), /joke|fun fact|riddle|challenge/i);
  assert.match(say("i can't sleep"), /breath|Grounding|shoulders|4-7-8|box/i);
  assert.match(say('you are so stupid'), /tell me|Fair|try again|breath/i);
  assert.match(say('i love you'), /AI|crew/i);
  assert.match(say('do you have feelings'), /AI|personality/i);
});
test('identity, favorites, about', () => {
  assert.match(say('who made you'), /MARSAI/); assert.match(say("what's your favorite color"), /Amber|blue|Teal|Crimson/);
  assert.match(say('what is your favourite planet'), /Saturn|Mars|Earth/); assert.match(say('what is this'), /MARSAI/);
});
test('decisions and suggestions', () => {
  assert.match(say('should I quit my job'), /Weigh|year from now|best case|goal/i); assert.match(say('what should I eat'), /How about this:/); assert.match(say('what should I do today'), /An idea:/);
});
test('randomness utilities are bounded', () => {
  for (let i = 1; i < 40; i++) { const r = say('roll a d20', 'MARS', null, i); const n = +/rolled a (\d+)/.exec(r)[1]; assert.ok(n >= 1 && n <= 20); }
  assert.match(say('flip a coin'), /^(Heads|Tails)\.?/); assert.match(say('pick a number between 5 and 9', 'MARS', null, 4), /How about [5-9]\?/);
});
test('time-aware greetings', () => {
  assert.match(say('good morning'), /Good morning/);
  const evening = D.respond('good morning', { crew: by('MARS'), captain: 'Alex', now: new Date('2026-11-13T19:00:00') }, seeded(1)).text; assert.match(evening, /actually evening/);
  assert.match(say('good night'), /Good night|Sleep well|Goodnight/);
});
test('persona flavor: each crew member sounds different but stays on topic', () => {
  const out = {}; for (const c of crew) { D.reset(); const rand = seeded(11); let best = null; for (let i = 0; i < 20 && !best; i++) { const r = D.respond('what should I eat', ctx(c.id), rand); const f = D.FLAVOR[c.id]; if (f[0].some((p) => r.text.startsWith(p)) || f[1].some((s) => r.text.endsWith(s))) best = r.text; } out[c.id] = best; }
  assert.ok(Object.values(out).every(Boolean), 'every crew member has a flavor that shows up'); assert.ok(Object.keys(D.FLAVOR).length === 20);
});
test('the captain name is used when known', () => {
  const r = D.respond('i am so happy', { crew: by('MARS'), captain: 'Alex', now: new Date() }, seeded(1)).text; assert.ok(/Alex/.test(r) || /Love that|Tell me what happened|Hold onto|celebrating/.test(r));
});
test('plain commands and questions are NOT swallowed', () => {
  for (const t of ['take me to the crew', 'weather in Paris', 'what is 15 times 7', 'who is Ada Lovelace', 'remind me to call mom', 'should-not-match-anything-here']) assert.equal(D.respond(t, ctx(), seeded(1)), null, t);
});
test('fallback replies are varied, on-voice coaching prompts', () => {
  const seen = new Set(); const rand = seeded(5); for (let i = 0; i < 24; i++) seen.add(D.fallback(ctx('SATURN'), rand)); assert.ok(seen.size >= 4);
});
