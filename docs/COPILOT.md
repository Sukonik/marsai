# MARSAI Copilot: plain-language understanding

Talk to the HUD the way you would talk to a person. The copilot turns what you say into an action, runs it, and answers in the active crew member's own voice. It asks before doing anything uncertain.

It is a small dependency-free engine (`site/assets/copilot.js`, about 10 KB). It runs in the browser with no key, works offline, answers instantly, and is covered by 100+ phrase tests (`tests/js/copilot.test.js`, run in CI).

## What you can say

| You want to | Say something like |
| --- | --- |
| Move around | "take me to the crew", "open the roadmap", "let me see the missions", "go back to the bridge", "take me home" |
| Choose who to talk to | "talk to Pluto", "can I speak with Venus please", "put Vega on", "talk to the engineer", "can I talk to someone else" |
| Address a crew member | "Venus, what do you think about this plan?", "hey Pluto, I need motivation", "what do you think, Mars?" |
| Learn about the crew | "who is on the crew", "tell me about Atlas", "who is Bellatrix" |
| Find the right person | "I need someone to challenge my idea", "who should I talk to about a contract dispute", "who can help me with debugging", "who is good at keeping me organized" |
| Manage missions | "remind me to call the dentist", "add a mission to learn guitar", "I need to renew my passport" (asks first), "what is on my plate", "I finished call mom", "mark bake bread as done" |
| Keep notes | "write this down: the wifi code is 4471", "jot down milk and eggs", "what did I write down", "what do you know about me" |
| Weather | "do I need an umbrella in Seattle", "will it rain tomorrow in London", "is it cold outside", "weather here" |
| Facts | "who is Ada Lovelace", "tell me about black holes", "what does serendipity mean", "how tall is Mount Everest" |
| Quick answers | "what time is it", "what day is it", "what is 15 percent of 80", "twenty five plus thirty", "2 to the power of 10" |
| Look things up | "price of SCHD", "how is Apple stock doing", "any AI news", "news about OpenAI", "what is hallucination" (see [INTEGRATIONS.md](INTEGRATIONS.md)) |
| Take phone messages | "take a message: Phil Gordon 516-787-9090 SWA Development wants to speak to law staff, urgent", "show my messages" |
| Themes and apps | "change the theme to Solar Forge", "next theme", "what themes do you have", "open payout lab", "open the weather app" |
| Chat | "tell me a joke", "another one", "fun fact", "give me a riddle", "I'm bored", "should I take the job", "what should I eat", "flip a coin" |
| Control the HUD | "turn on the voice", "stop talking", "start listening", "go full screen", "open the settings", "clear the chat", "enable the AI brain", "turn off web lookups", "that is all" |

Plain conversation ("hello, how are you?", "I feel stressed", "thanks") still gets an in-character reply, and anything the copilot does not recognize goes to the crew member's conversation layer (ShipCore with a local model, or the in-browser AI brain if enabled).

## How it behaves

- **Asks when unsure.** "Let me talk to a guardian" returns "Which guardian: Venus, Oberon or Rhea?"; "I need to renew my passport" asks "Want me to log that as a mission?"; a recommendation asks "Shall I put Vega on?" and waits for yes or no.
- **Hands off in character.** Switching crew has the outgoing crew member say a short acknowledgement and "Passing you to Pluto", then the new crew member greets you.
- **Tolerates speech-to-text slips.** Names match fuzzily ("Mercurry"), and common mishearings map only when you are clearly choosing a crew member ("talk to Venice" is Venus, "talk to serious" is Sirius). "I am serious" and "lunar eclipse" are not treated as commands.
- **Plain results.** "You have 2 open missions: #1 call the dentist, #2 renew my passport." Not a data dump.
- **Honest limits.** It does not guess: unmatched requests fall through to conversation, or to a short list of what it can do.

## How it works

1. Text is lowercased, contractions expanded, accents and punctuation stripped; number words become digits.
2. Intents are checked in a fixed order: yes or no, addressing a crew member, system controls, missions and notes, crew selection and recommendation, navigation, then web (weather, facts), time, and math. Specific phrasings come before general ones.
3. Slots are extracted (crew member, module, city, mission title, query).
4. The HUD (`app.js`) executes the action, using ShipCore for missions and notes when linked, the onboard core otherwise.

Each crew member has `topics` (from the README strengths) used for recommendations, and `ack` lines for acknowledgements, in `shipcore/crew.json`.

## Adding a phrase or intent

Add a case to `tests/js/copilot.test.js` first, then adjust `copilot.js`, then handle the new `intent` in `runAction` in `app.js`. Keep specific patterns above general ones, and add a look-alike to the "must not be a command" list if the new pattern could swallow ordinary conversation.

## Why not a framework

Reviewed for this job (concepts only):

| Option | Verdict |
| --- | --- |
| [compromise](https://github.com/spencermountain/compromise) (MIT) | About 250 KB, rule-based tagging and matching, exact-token matching with no tolerance for speech slips. Too large for what we need |
| [wink-nlp](https://github.com/winkjs/wink-nlp) (MIT) | Small core, good entity extraction, but intent classification is a separate Naive Bayes package we would have to train and feed; English model about 1 MB |
| [NLP.js](https://github.com/axa-group/nlp.js) (MIT) | Closest to a full NLU toolkit (intents, fuzzy entities), but needs a per-bot training pipeline and bundle size is unstated; overkill for a command set this size |
| [semantic-router](https://github.com/aurelio-labs/semantic-router) (MIT) | Good idea (nearest example by embeddings), but Python only |
| [Fuse.js](https://github.com/krisk/Fuse) (Apache-2.0) | About 8.6 KB, fuzzy matching only; our edit-distance matcher already covers names |
| [transformers.js embeddings](https://github.com/huggingface/transformers.js) (Apache-2.0) | Sentence embeddings (for example Xenova/all-MiniLM-L6-v2) run in the browser and would add paraphrase matching |

**Decision:** keep the dependency-free rule engine as the fast, offline default. Later, when the AI brain is enabled, a transformers.js embedding step can catch paraphrases the rules miss ("get me out of here" meaning power off), without changing the action layer.
