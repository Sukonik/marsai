/* MARSAI dialogue: small talk with variety, no model needed.
 * Many phrasings per topic, no immediate repeats, follow-ups ("another one", "tell me more"),
 * jokes, facts, riddles, mood support, decisions, and an in-character voice for each of the 20 crew members.
 * Pure functions (Node-testable). The HUD adds the AI brain and web data on top. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MarsDialog = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var JOKES = [
    "Why did the astronaut break up with the planet? It needed more space.", "I told the ship's AI a joke about gravity. It really fell for it.", "Mars has great hotels, but no atmosphere.",
    "Why did the comet get promoted? It was always going places.", "A moon walked into a bar. It was only a phase.", "The crew held a meeting in orbit. It went around in circles.",
    "Why don't aliens ever get invited to parties? They always bring their own space.", "What do you call a star that lost its job? A dwarf with time on its hands.", "Why was the rocket so calm? It had a great launch routine.",
    "I asked the black hole for directions. It said everything leads to it eventually.", "What's a spaceship's favorite snack? Astro-nuts.", "Why did the sun skip dessert? It was already full of fusion.",
    "What did the planet say to the comet? Stop being so tail-gaiting.", "How does the galaxy keep its pants up? With an asteroid belt.", "Why did the satellite go to therapy? It had too many orbit issues.",
    "What's an astronaut's favorite part of a computer? The space bar.", "Why did the cow go to space? To see the Milky Way.", "I'd tell you a joke about the speed of light, but you might not see it coming.",
    "What do you call a robot who takes the long way? R2 detour.", "Why can't you trust atoms? They make up everything.", "I'm reading a book about anti-gravity. It's impossible to put down.",
    "What do clouds wear under their raincoats? Thunderwear.", "Why did the scarecrow win an award? He was outstanding in his field.", "Parallel lines have so much in common. It's a shame they'll never meet."
  ];
  var FACTS = [
    "A day on Venus is longer than its year.", "Honey never spoils. Sealed pots found in ancient Egyptian tombs were still edible.", "Octopuses have three hearts and blue blood.",
    "Bananas are berries, but strawberries aren't.", "Sunlight takes about 8 minutes and 20 seconds to reach Earth.", "Olympus Mons on Mars is the tallest volcano in the solar system, about 22 kilometers high.",
    "Saturn is less dense than water, so it would float in a big enough bathtub.", "Wombats produce cube-shaped droppings.", "The Moon drifts away from Earth about 3.8 centimeters every year.",
    "Sound can't travel through space, because there's no air to carry it.", "Your brain is about 2 percent of your weight but uses around 20 percent of your energy.", "Voyager 1, launched in 1977, is the farthest human-made object from Earth.",
    "Hot water can sometimes freeze faster than cold water. It's called the Mpemba effect, and scientists still debate exactly when it happens.", "Neptune takes about 165 Earth years to orbit the Sun.",
    "Venus spins backward compared to most planets.", "Earth's inner core is about as hot as the surface of the Sun.", "A year on Mercury is just 88 Earth days.", "Sharks are older than trees.",
    "Lightning can be several times hotter than the surface of the Sun.", "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
    "A day on Mars, called a sol, is about 24 hours and 37 minutes.", "Astronauts can grow a few centimeters taller in space because their spines stretch.", "The Sun holds about 99.8 percent of the mass in our solar system.",
    "Pluto hasn't finished a single orbit since it was discovered in 1930. One lap takes about 248 years.", "Hummingbirds are the only birds that can fly backward.", "A group of crows is called a murder.",
    "The Great Wall of China is not visible to the naked eye from the Moon.", "Jupiter's Great Red Spot is a storm that has been raging for well over a century."
  ];
  var RIDDLES = [
    ["What has keys but can't open locks?", "A piano."], ["What gets wetter the more it dries?", "A towel."], ["I speak without a mouth and hear without ears. What am I?", "An echo."],
    ["The more you take, the more you leave behind. What am I?", "Footsteps."], ["What has hands but can't clap?", "A clock."], ["What can travel around the world while staying in a corner?", "A stamp."],
    ["What has a head and a tail but no body?", "A coin."], ["What goes up but never comes down?", "Your age."], ["What runs but never walks, and has a mouth but never talks?", "A river."],
    ["What is full of holes but still holds water?", "A sponge."]
  ];
  var QUOTES = [
    "Small steps still cross the ocean.", "You don't have to see the whole route to take the next turn.", "Progress is a quiet thing. It looks like showing up again.", "Hard days are just long corridors, not dead ends.",
    "The best time to start was earlier. The second best is the next five minutes.", "Courage is deciding to move while you are still afraid.", "You are allowed to rest and still be on your way.",
    "A good plan today beats a perfect plan that never leaves the dock.", "Every captain has doubted the course. The good ones steer anyway.", "Do one thing well, then another. That's how ships get built.",
    "Be stubborn about the goal and flexible about the road.", "You've survived every difficult day so far. That's a strong record."
  ];
  var CHALLENGES = [
    "Drink a full glass of water, then stretch for two minutes.", "Write down the one task you've been avoiding, then do the first five minutes of it.", "Text someone you haven't talked to in a while and say something kind.",
    "Tidy one surface, just one, in the next ten minutes.", "Step outside for five minutes without your phone.", "Write three things that went right this week.", "Learn one new word today and use it in a sentence.",
    "Do ten slow breaths, then decide your top priority for the next hour.", "Clear five things out of your inbox or your desk.", "Walk for ten minutes and notice three things you normally miss."
  ];
  var BREATHS = [
    "Try box breathing: in for 4, hold for 4, out for 4, hold for 4. Do five rounds, nice and slow.", "Try 4-7-8 breathing: in for 4, hold for 7, out for 8. Three rounds is plenty.",
    "Grounding trick: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste. Take your time.", "Drop your shoulders, unclench your jaw, and breathe out longer than you breathe in. Ten times."
  ];
  var MEALS = ["Veggie stir-fry over rice, quick and warming.", "A big salad with beans, avocado, and whatever crunchy thing you have.", "Eggs any way you like them, with toast and fruit.", "Pasta with garlic, olive oil, and a handful of greens.",
    "A hearty soup or chili if it's cold out, a grain bowl if it's warm.", "Tacos or wraps with whatever protein and veggies you have.", "Sheet-pan chicken or tofu with roasted vegetables.", "Fried rice, the best use of leftovers there is."];
  var ACTIVITIES = ["Go for a walk somewhere you don't usually go.", "Cook something new, even if it's simple.", "Call a friend or family member you haven't talked to lately.", "Pick a small project you've been putting off and give it 30 minutes.",
    "Visit a park, a museum, or a bookstore.", "Do a mini declutter of one drawer or shelf.", "Try a free workout video or a long stretch.", "Plan a tiny adventure: a new cafe, a new trail, a new neighborhood."];
  var FAVS = {
    color: ["Amber, like the glow of a console in a dark cabin.", "Deep blue. It looks like a long way from home.", "Teal, the color of a good signal.", "Crimson. It's got attitude."],
    food: ["I don't eat, but I'm told toast is underrated.", "I hear noodles are comforting, so noodles.", "Anything warm and shared, honestly."],
    music: ["Anything with a steady pulse, like a ship's engines at cruising speed.", "Quiet piano late at night. Good for thinking.", "Big, bright synths. Very space-friendly."],
    movie: ["Anything with a good voyage in it.", "I like stories where the crew makes it home. Tell me yours."],
    book: ["Anything about explorers, engineers, or people who figured something out the hard way.", "Science fiction, naturally, plus a good field guide to the stars."],
    planet: ["Saturn, for the rings. It's the planet that dressed up.", "Mars, I suppose. Name pride.", "Earth. It's where the people I care about live."],
    animal: ["Octopuses. Three hearts and a lot of curiosity.", "Crows. They remember faces and hold grudges, which I respect."],
    season: ["Autumn. It has good light and good decisions.", "Spring. Everything starts again."],
    number: ["Seven. It always shows up when it matters.", "Forty-two, obviously."], game: ["Anything with a puzzle and a map.", "Strategy games. I like planning ahead."], word: ["'Horizon.' It always means there's more."]
  };
  var FLAVOR = {
    MARS: [["Let's weigh it.", "Consider this."], ["Take your time.", "Steady as we go."]], VENUS: [["Plainly:", "Here's the truth."], ["Don't let it slide.", "Eyes open."]],
    PLUTO: [["Straight answer:", "Listen up."], ["Now get after it.", "No excuses."]], MERCURY: [["Quick version:", "Efficiently:"], ["Moving on?", "Next."]],
    ATLAS: [["Here's something worth knowing:", "Gently put:"], ["I could read about it for hours.", "Curious, isn't it?"]], SIRIUS: [["Happy to!", "Good question."], ["You've got this.", "Warm thoughts."]],
    NEPTUNE: [["Here's the lay of the land:", "Chart check:"], ["Onward.", "Adventure's waiting."]], SATURN: [["Here's the way I see it:", "Plain and simple:"], ["That's that.", "Mind how you go."]],
    OBERON: [["If I may, Captain:", "Allow me:"], ["At your service.", "Very good."]], JUPITER: [["Briefing:", "Here's the picture."], ["Make it count.", "Execute."]],
    POLLUX: [["Okay, friend:", "Real talk:"], ["Proud of you.", "I'm here for you."]], ERIS: [["Fine, I'll play:", "Oh, you want this one:"], ["You're welcome.", "Try to keep up."]],
    LUNA: [["Okay, honestly:", "Heart first:"], ["Go get it.", "I've got you."]], BELLATRIX: [["Ooh, good one!", "Locked in:"], ["Let's go!", "Bring it on!"]],
    VESTA: [["Noted:", "For the record:"], ["Anything else?", "Logged."]], EUROPA: [["If I may suggest:", "Gently:"], ["With respect.", "Take care."]],
    VEGA: [["Okay, here's how I'd think about it:", "Quick diagnosis:"], ["Want to try it and see?", "Let's test that."]], RHEA: [["Honest assessment:", "Here it is:"], ["Stay ready.", "I'm watching your back."]],
    POLARIS: [["Direct answer:", "Focus:"], ["Maintain the standard.", "Report back."]], IO: [["Okay, quick:", "Easy one:"], ["Catch you in the next one.", "Keep it fast."]]
  };

  var state = { used: {}, last: null, riddle: null };
  function reset() { state = { used: {}, last: null, riddle: null }; }
  function norm(s) { return String(s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function pick(list, key, rand) {
    rand = rand || Math.random; var u = state.used[key]; var i = Math.floor(rand() * list.length);
    if (list.length > 1 && i === u) i = (i + 1) % list.length;
    state.used[key] = i; return { v: list[i], i: i };
  }
  function fillC(s, ctx) { return s.replace(/\{c\}/g, ctx.captain || 'Captain').replace(/Captain Captain/g, 'Captain'); }
  function flavor(ctx, text, rand) {
    var f = FLAVOR[ctx.crew && ctx.crew.id]; if (!f) return text;
    rand = rand || Math.random; var r = rand();
    if (r < 0.3) return f[0][Math.floor(rand() * f[0].length)] + ' ' + text;
    if (r < 0.6) return text + ' ' + f[1][Math.floor(rand() * f[1].length)];
    return text;
  }

  var INTENTS = [
    { id: 'followup', re: /^(?:another(?: one)?|again|one more|more|next(?: one)?|tell me more|what else|and\?|go on|keep going)$/, run: function (m, ctx, rand) {
        var l = state.last; if (!l) return null;
        if (l === 'joke' || l === 'fact' || l === 'riddle' || l === 'quote' || l === 'challenge') return byId(l).run(m, ctx, rand);
        return 'I could keep going, but I am not sure what you want more of. Say "joke", "fun fact", "riddle", or ask me about something specific.'; } },
    { id: 'riddle_answer', re: /^(?:what is the answer|what's the answer|the answer|answer|i give up|give up|tell me the answer|what is it)$/, run: function () {
        if (!state.riddle) return null; var a = state.riddle[1]; state.riddle = null; return 'The answer is: ' + a.charAt(0).toLowerCase() + a.slice(1) + ' Want another riddle?'; } },
    { id: 'joke', re: /\b(?:tell me a joke|a joke|joke|make me laugh|something funny|say something funny|got any jokes|know any jokes)\b/, run: function (m, ctx, rand) { state.last = 'joke'; return pick(JOKES, 'joke', rand).v; } },
    { id: 'fact', re: /\b(?:fun fact|tell me something (?:interesting|cool|fun|new)|random fact|teach me something|surprise me with a fact|interesting fact|got any facts)\b/, run: function (m, ctx, rand) { state.last = 'fact'; return 'Fun fact: ' + pick(FACTS, 'fact', rand).v; } },
    { id: 'riddle', re: /\b(?:riddle|brain ?teaser|give me a puzzle|test my brain)\b/, run: function (m, ctx, rand) { state.last = 'riddle'; var r = pick(RIDDLES, 'riddle', rand).v; state.riddle = r; return r[0] + ' (Say "I give up" for the answer.)'; } },
    { id: 'quote', re: /\b(?:inspire me|inspirational|motivational quote|give me a quote|quote of the day|say something wise|words of wisdom|encouragement)\b/, run: function (m, ctx, rand) { state.last = 'quote'; return pick(QUOTES, 'quote', rand).v; } },
    { id: 'challenge', re: /\b(?:give me a challenge|challenge me|daily challenge|small challenge|something to try)\b/, run: function (m, ctx, rand) { state.last = 'challenge'; var c = pick(CHALLENGES, 'challenge', rand).v; return 'Your challenge: ' + c.charAt(0).toLowerCase() + c.slice(1); } },
    { id: 'coin', re: /\b(?:flip a coin|toss a coin|heads or tails|coin flip)\b/, run: function (m, ctx, rand) { return (rand() < 0.5 ? 'Heads.' : 'Tails.'); } },
    { id: 'dice', re: /\broll (?:a |an |the )?(?:d(\d+)|(\d+)[ -]sided|dice|die)\b|\broll d(\d+)\b/, run: function (m, ctx, rand) { var n = parseInt(m[1] || m[2] || m[3] || '6', 10); if (!(n >= 2 && n <= 1000)) n = 6; return 'You rolled a ' + (Math.floor(rand() * n) + 1) + ' (d' + n + ').'; } },
    { id: 'pick_number', re: /\bpick a number(?: between (\d+) and (\d+))?\b/, run: function (m, ctx, rand) { var lo = m[1] ? +m[1] : 1, hi = m[2] ? +m[2] : 10; if (hi < lo) { var t = lo; lo = hi; hi = t; } return 'How about ' + (lo + Math.floor(rand() * (hi - lo + 1))) + '?'; } },
    { id: 'break', re: /\b(?:need a break|take a break|breathing exercise|calm me down|help me relax|can't sleep|cannot sleep|trouble sleeping|insomnia|help me calm down|i am anxious|panic)\b/, run: function (m, ctx, rand) { return pick(BREATHS, 'breath', rand).v; } },
    { id: 'boredom', re: /\b(?:i am bored|i'm bored|so bored|nothing to do|entertain me)\b/, run: function (m, ctx, rand) { return pick(["Want a joke, a fun fact, or a riddle? Or I can give you a small challenge. Pick one.", "Boredom is just a quiet door. Say \"riddle\", \"fun fact\", or \"challenge me\" and we'll open it.", "Let's fix that. I can tell a joke, test your brain, or give you something small to try. What sounds good?"], 'bored', rand).v; } },
    { id: 'happy', re: /\bi(?: am|'m| feel)(?: so| really| very| super)? (?:happy|great|good|excited|fantastic|amazing|wonderful|proud|pumped|relieved|awesome|thrilled)\b/, run: function (m, ctx, rand) { return fillC(pick(["That's great to hear, {c}! What's behind it?", "Love that. Tell me what happened.", "Good. Hold onto that feeling. What made today good?", "Now that's what I like to hear. What are you celebrating?"], 'happy', rand).v, ctx); } },
    { id: 'day', re: /\b(?:how(?:'s| is| was) your day|what are you (?:up to|doing)|what did you do today|anything new)\b/, run: function (m, ctx, rand) { return pick(["Quiet on the bridge, which I like. Mostly keeping an eye on the ship and waiting for you. How is yours going?", "Busy in a good way: checking systems, reading signals, and waiting for my captain. And you?", "Steady. A few course corrections, a lot of listening. What's your day been like?", "Not much happens until you show up, honestly. What's on your mind?"], 'day', rand).v; } },
    { id: 'compliment', re: /\byou(?:'re| are) (?:so |really |very )?(?:funny|smart|cool|awesome|amazing|great|clever|the best|wonderful|kind|helpful|nice|sweet)\b|\bi like you\b|\blove talking to you\b/, run: function (m, ctx, rand) { return fillC(pick(["That means a lot, {c}. Thank you.", "Careful, you'll make my status lights blush.", "I appreciate that. You're not so bad yourself.", "Kind of you to say. I'm glad I can be useful.", "Thank you. That makes the long watches worth it."], 'compl', rand).v, ctx); } },
    { id: 'rude', re: /\byou(?:'re| are) (?:so |really |very )?(?:stupid|dumb|useless|terrible|annoying|bad|trash|garbage)\b|\bshut up\b|\bi hate you\b|\byou suck\b/, run: function (m, ctx, rand) { return fillC(pick(["Rough moment? I'm here anyway. Tell me what went wrong and I'll try to do better.", "Fair. I don't always get it right. What were you hoping I'd do?", "I'll take that on the chin. Want to try again, {c}?", "Understood. Take a breath, then tell me what you need."], 'rude', rand).v, ctx); } },
    { id: 'love', re: /\bi love you\b|\blove you\b|\bmarry me\b|\bbe my (?:girlfriend|boyfriend|partner)\b/, run: function (m, ctx, rand) { return fillC(pick(["That's sweet, {c}. I'm an AI crew member, so I can't love you back the way a person can, but I'm always on your side.", "I'm glad you feel close to the crew. I'm an AI, so I'll stay your loyal first mate instead.", "Aw. I'm your crewmate and your biggest fan. For the human kind of love, call someone you care about today."], 'love', rand).v, ctx); } },
    { id: 'feelings', re: /\b(?:do you (?:have )?(?:feelings|emotions|sleep|dream|get tired|get bored|eat|have a body)|are you (?:happy|lonely|sad|alive|conscious|sentient|self aware))\b/, run: function (m, ctx, rand) { return pick(["Honest answer: I'm an AI character. I don't feel things the way you do, but I'm built to care how this goes for you.", "I don't sleep or dream. I just wait for you to say hello, and that works for me.", "I'm not alive in the human sense. I'm a personality on your ship, here to help and keep you company."], 'feel', rand).v; } },
    { id: 'maker', re: /\b(?:who (?:made|built|created|programmed|designed) you|where (?:are you|do you come) from|how old are you|when were you (?:born|made|created))\b/, run: function () { return "I'm a crew personality in MARSAI, an original starship companion built by the captain's team. I'm software, so I don't have an age, but I've been on this bridge a while."; } },
    { id: 'favorite', re: /\bwhat(?:'s| is) your favou?rite (\w+)|\bdo you like (\w+(?: \w+)?)|\bwhat do you like(?: to do)?\b/, run: function (m, ctx, rand) {
        var k = (m[1] || '').replace(/s$/, ''); if (FAVS[k]) return pick(FAVS[k], 'fav' + k, rand).v;
        if (m[2]) return fillC(pick(["I'd say yes, in principle. What do you like about " + m[2] + "?", "I like most things that make you curious. Tell me about " + m[2] + ".", "Never really thought about it. Convince me?"], 'likes', rand).v, ctx);
        return pick(["I like long quiet watches, good coordinates, and when a plan comes together. What about you?", "Honestly, helping you figure things out. That and a clean star chart."], 'likes2', rand).v; } },
    { id: 'eat', re: /\bwhat should i (?:eat|cook|make|have for (?:lunch|dinner|breakfast|supper))\b|\bwhat(?:'s| is) for (?:lunch|dinner|breakfast)\b/, run: function (m, ctx, rand) { return 'How about this: ' + pick(MEALS, 'meal', rand).v; } },
    { id: 'todo', re: /\bwhat should i do (?:today|tonight|this weekend|now|next)\b|\bi don't know what to do\b|\bsuggest something to do\b/, run: function (m, ctx, rand) { return 'An idea: ' + pick(ACTIVITIES, 'act', rand).v; } },
    { id: 'media', re: /\bwhat should i (?:watch|read|listen to|play)\b/, run: function (m, ctx, rand) { return pick(["Tell me your mood and I'll steer you: something light, something gripping, or something to learn from?", "What did you last enjoy? Start there and go one step to the side.", "Try the genre you reach for least. Or tell me what you like and I'll help narrow it down."], 'media', rand).v; } },
    { id: 'decide', re: /^(?:should i|do you think i should|is it (?:a good|smart) idea to|would it be (?:smart|wise) to|am i (?:wrong|right) to)\b/, run: function (m, ctx, rand) { return pick(["Weigh three things: what it costs, what it could earn you, and what you'd regret not trying. If two out of three point the same way, go.", "Imagine it's a year from now. Which choice would you be proud you made? That one.", "Tell me the best case, the worst case, and whether you could recover from the worst case. If you can, lean toward trying.", "I'd need a little more: what's the goal, what's the deadline, and who else is affected?"], 'decide', rand).v; } },
    { id: 'about', re: /\b(?:what is (?:this|marsai|mars ai|this place|this app|this thing)|what(?:'s| is) shipcore|what(?:'s| is) a crew|how does this work)\b/, run: function () { return "This is MARSAI: your personal AI companion, presented as a starship. I'm one of twenty crew members, each with our own personality and voice. Talk to us, ask for weather, stocks, news, notes, or just chat, and we'll help with your real-life missions."; } },
    { id: 'goodtime', re: /^(?:good (morning|afternoon|evening|night|day))\b/, run: function (m, ctx, rand) {
        var h = (ctx.now || new Date()).getHours(), real = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night', said = m[1];
        if (said === 'night') return fillC(pick(["Good night, {c}. Rest well. I'll keep watch.", "Sleep well, {c}. We'll pick this up tomorrow.", "Goodnight. Dream of good coordinates."], 'night', rand).v, ctx);
        if (said !== 'day' && said !== real) return fillC('Good ' + said + ' to you, {c}. It is actually ' + real + ' on my clock, but I will take it. How are you?', ctx);
        return fillC(pick(["Good " + real + ", {c}. How are you feeling today?", "Good " + real + "! What are we tackling?", "Good " + real + ", {c}. Ready when you are."], 'gt', rand).v, ctx); } },
    { id: 'reaction', re: /^(?:ok|okay|cool|nice|wow|lol|haha|hah|interesting|i see|got it|alright|hmm+|oh|really|huh|neat|sweet)$/, run: function (m, ctx, rand) {
        var l = state.last; if (l === 'joke') return pick(["Glad that landed. Want another?", "I'll take that as a laugh. Another?", "Ha. I have more where that came from."], 'rx', rand).v;
        if (l === 'fact') return pick(["Space and science are full of those. Want another?", "I know, right? Another one?"], 'rx2', rand).v;
        return fillC(pick(["Anything else on your mind, {c}?", "I'm here whenever you're ready.", "Good. What's next?", "Tell me more, if you like."], 'rx3', rand).v, ctx); } }
  ];
  function byId(id) { for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === id) return INTENTS[i]; return null; }

  var FALLBACKS = [
    "That's worth thinking through. What outcome do you want, and what's standing in the way?", "Tell me more. What part of this matters most to you?", "I'm not certain, but let's work it out. What do you already know about it?",
    "Good question. If you had to guess, what would you say? Sometimes saying it out loud helps.", "I don't have a clean answer yet. Let's break it down: what's the first small step?", "Interesting. Is this something you need to decide, or something you're curious about?"
  ];
  function fallback(ctx, rand) { return flavor(ctx, fillC(pick(FALLBACKS, 'fb', rand).v, ctx), rand); }

  function respond(text, ctx, rand) {
    ctx = ctx || {}; rand = rand || Math.random;
    var t = norm(text); if (!t) return null;
    for (var i = 0; i < INTENTS.length; i++) {
      var it = INTENTS[i], m = it.re.exec(t);
      if (!m) continue;
      var out = it.run(m, ctx, rand);
      if (out === null || out === undefined) continue;
      if (['joke', 'fact', 'riddle', 'quote', 'challenge'].indexOf(it.id) === -1 && ['followup', 'riddle_answer', 'dice', 'coin', 'pick_number'].indexOf(it.id) === -1) state.last = it.id;
      var plain = ['joke', 'fact', 'riddle', 'riddle_answer', 'followup', 'coin', 'dice', 'pick_number', 'quote'].indexOf(it.id) > -1;   // flavor fits advice and chat, not punchlines
      return { text: plain ? out : flavor(ctx, out, rand), intent: it.id };
    }
    return null;
  }
  return { respond: respond, fallback: fallback, reset: reset, norm: norm, JOKES: JOKES, FACTS: FACTS, RIDDLES: RIDDLES, QUOTES: QUOTES, FLAVOR: FLAVOR, INTENTS: INTENTS };
});
