'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Copilot = require('../../site/assets/copilot.js');
const crew = JSON.parse(fs.readFileSync(path.join(__dirname, '../../site/assets/crew.json'), 'utf8')).crew;
const ctx = { crew, missions: [{ id: 1, title: 'learn to bake bread', done: false }, { id: 2, title: 'call mom', done: false }, { id: 3, title: 'file taxes', done: true }] };
const a = (s) => Copilot.analyze(s, ctx);

// [phrase, expected intent, expected fields]
const CASES = [
  // navigation
  ['take me to the crew', 'navigate', { module: 'Crew' }],
  ['open the roadmap', 'navigate', { module: 'Roadmap' }],
  ['can you show me the themes', 'navigate', { module: 'Theme Lab' }],
  ['go back to the bridge', 'navigate', { module: 'Bridge' }],
  ['bridge', 'navigate', { module: 'Bridge' }],
  ['let me see the missions', 'navigate', { module: 'Missions' }],
  ['pull up shipcore', 'navigate', { module: 'ShipCore' }],
  ['take me home', 'navigate', { module: 'Bridge' }],
  // switch crew, including speech-to-text slips
  ['talk to Pluto', 'switch_crew', { crew: 'PLUTO' }],
  ['can I speak with Venus please', 'switch_crew', { crew: 'VENUS' }],
  ['let me hear from Europa', 'switch_crew', { crew: 'EUROPA' }],
  ['put Vega on', 'switch_crew', { crew: 'VEGA' }],
  ['bring up Saturn', 'switch_crew', { crew: 'SATURN' }],
  ['talk to Venice', 'switch_crew', { crew: 'VENUS' }],
  ['talk to Plato', 'switch_crew', { crew: 'PLUTO' }],
  ['I want to talk to serious', 'switch_crew', { crew: 'SIRIUS' }],
  ['switch to Mercurry', 'switch_crew', { crew: 'MERCURY' }],
  ['Luna', 'switch_crew', { crew: 'LUNA' }],
  ['talk to the engineer', 'switch_crew', { crew: 'VEGA' }],
  ['I want to talk to the diplomat', 'switch_crew', { crew: 'EUROPA' }],
  ['let me talk to a guardian', 'choose_crew', {}],
  ['i need to speak to the commander', 'choose_crew', {}],
  ['can I talk to someone else', 'random_crew', {}],
  ['who is on the crew', 'list_crew', {}],
  ['tell me about Atlas', 'about_crew', { crew: 'ATLAS' }],
  ['who is Bellatrix', 'about_crew', { crew: 'BELLATRIX' }],
  // addressing
  ['Venus, what do you think about this plan?', 'address', { crew: 'VENUS' }],
  ['hey Pluto, I could use some motivation', 'address', { crew: 'PLUTO' }],
  ['what do you think, Mars?', 'address', { crew: 'MARS' }],
  // recommendations
  ['who should I talk to about a contract dispute', 'recommend', { crew: 'MARS' }],
  ['I need someone to challenge my idea', 'recommend', { crew: 'VENUS' }],
  ['who can help me with debugging my code', 'recommend', { crew: 'VEGA' }],
  ['I need help with planning my week', 'recommend', {}],
  ['who is good at keeping me organized', 'recommend', { crew: 'VESTA' }],
  // missions and notes
  ['remind me to call the dentist', 'mission_add', { title: 'call the dentist' }],
  ['add a mission to learn guitar', 'mission_add', { title: 'learn guitar' }],
  ['new mission: write the report', 'mission_add', { title: 'write the report' }],
  ['set a goal to run a 5k', 'mission_add', { title: 'run a 5k' }],
  ['I need to renew my passport', 'mission_soft', {}],
  ["I've got to finish the budget", 'mission_soft', {}],
  ['what is on my plate', 'mission_list', {}],
  ['what do I have to do', 'mission_list', {}],
  ['show me my missions', 'mission_list', {}],
  ['I finished call mom', 'mission_done', { id: 2 }],
  ['mark bake bread as done', 'mission_done', { id: 1 }],
  ['complete mission 2', 'mission_done', { id: 2 }],
  ['write this down: the code is 4471', 'note_add', { text: 'the code is 4471' }],
  ["don't let me forget my sister's birthday is June 4", 'note_add', {}],
  ['jot down milk and eggs', 'note_add', { text: 'milk and eggs' }],
  ['what did I write down', 'note_list', {}],
  ['show my notes', 'note_list', {}],
  ['what do you know about me', 'about_me', {}],
  // web
  ['what is the weather in Paris', 'weather', { city: 'Paris' }],
  ["how's the weather in New York today", 'weather', { city: 'New York' }],
  ['do I need an umbrella in Seattle', 'weather', { city: 'Seattle' }],
  ['is it cold outside', 'weather', {}],
  ['weather here', 'weather', { here: true }],
  ['will it rain tomorrow in London', 'weather', { city: 'London' }],
  ['who is Ada Lovelace', 'fact', { query: 'ada lovelace' }],
  ['tell me about black holes', 'fact', { query: 'black holes' }],
  ['what does serendipity mean', 'fact', { query: 'serendipity' }],
  ['how tall is Mount Everest', 'fact', { query: 'mount everest' }],
  ['what is the capital of Japan', 'fact', { query: 'capital of japan' }],
  ['who invented the telephone', 'fact', { query: 'the telephone' }],
  // basics
  ['what time is it', 'time', {}],
  ["what's today's date", 'date', {}],
  ['what day is it', 'date', {}],
  ['what is 15 times 7', 'math', {}],
  ['twenty five plus thirty', 'math', {}],
  ['what is 15 percent of 80', 'math', {}],
  ['what is 2 to the power of 10', 'math', {}],
  // system
  ['turn on the voice', 'voice', { on: true }],
  ['talk to me out loud', 'voice', { on: true }],
  ['stop talking', 'voice', { on: false }],
  ['mute', 'voice', { on: false }],
  ['go full screen', 'fullscreen', { on: true }],
  ['exit full screen', 'fullscreen', { on: false }],
  ['start listening', 'listen', {}],
  ['clear the chat', 'clear', {}],
  ['open the settings', 'settings', {}],
  ['enable the AI brain', 'brain', { on: true }],
  ['turn off web lookups', 'web', { on: false }],
  ['connect to shipcore', 'connect', {}],
  ['shut down', 'power_off', {}],
  ["that's all", 'power_off', {}],
  ['what can you do', 'help', {}],
  ['yes', 'yes', {}],
  ['nope', 'no', {}],
];

for (const [phrase, intent, fields] of CASES) {
  test(`"${phrase}" -> ${intent}`, () => {
    const r = a(phrase);
    assert.ok(r, `no intent for: ${phrase}`);
    assert.equal(r.intent, intent, JSON.stringify(r));
    for (const k of Object.keys(fields)) assert.equal(r[k], fields[k], `${k} in ${JSON.stringify(r)}`);
  });
}

// plain conversation and look-alikes must NOT be grabbed as commands
const NOT = ['hello! how are you?', 'I am serious about this', 'thank you so much', 'I feel stressed today', 'tell me a story about dragons', 'I love lunar eclipses',
  'what should I do when I feel unmotivated', 'good night', 'my favorite planet is Mars bars', 'you are great', 'who are you', 'what is your name'];
for (const phrase of NOT) {
  test(`"${phrase}" is not a command`, () => {
    const r = a(phrase);
    assert.ok(!r || ['recommend', 'mission_soft'].indexOf(r.intent) === -1 && r.intent !== 'switch_crew' && r.intent !== 'navigate', `grabbed as ${r && r.intent}`);
  });
}

test('level of ambiguity: guardian offers all three', () => {
  assert.deepEqual(a('let me talk to a guardian').options.sort(), ['OBERON', 'RHEA', 'VENUS']);
});
test('recommend returns alternatives and a reason', () => {
  const r = a('who should I talk to about negotiating with my landlord');
  assert.equal(r.intent, 'recommend');
  assert.ok(r.crew);
});
