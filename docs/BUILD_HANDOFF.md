# 🚀 MARSAI Build Handoff

## Purpose

This document translates the MARSAI concept into a focused browser-first implementation plan. It is written for the first developer or coding agent taking ownership of the prototype.

The immediate goal is not to build the entire galaxy. The goal is to prove that MARSAI can maintain one captain journey while presenting multiple convincing, original crew personalities through a responsive starship interface.

## ✅ Product truth

As of November 13, 2026:

- The repository contains product planning and the MPL-2.0 license.
- No production application has been implemented.
- MARSAI is an original planetary companion universe.
- Mars and Venus are the permanent foundational companions.
- Deck 1 is the curated First Constellation of eighteen personalities.
- Deck 2 is Open Orbit, where users create their own crew.
- The browser is the baseline platform.
- Voice, personality, intelligence, memory, and capabilities are separate layers.
- Progress must reflect real accomplishment rather than spending.
- The Captain Profile must remain portable across providers.

## 🎯 Prototype mission

Build a usable vertical slice in which a captain can:

1. Create a local Captain Profile.
2. Open a responsive starship bridge.
3. Speak or type to Mars and Venus.
4. Observe meaningfully different responses from one underlying model connection.
5. Select a device voice independently for each companion.
6. Create one Open Orbit crew member.
7. run a short Crew Link discussion between two companions.
8. Save, reload, export, and import the captain's journey.

The vertical slice should work without accounts or payment. Provider credentials, if required, must not be committed or exposed.

## 🚫 First-prototype non-goals

Do not add these before the vertical slice is reliable:

- All eighteen Deck 1 implementations
- A marketplace
- Mandatory subscriptions
- Complex multiplayer
- Public social feeds
- Cloud synchronization
- Native mobile applications
- Vehicle integrations
- Photorealistic avatars
- Custom voice cloning
- Support for every AI provider
- Production legal, medical, or financial workflows
- Extensive combat or world simulation

## 🧱 Recommended project structure

```text
marsai/
├── README.md
├── docs/
│   └── BUILD_HANDOFF.md
├── public/
│   └── icons/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── captain/
│   │   ├── crew/
│   │   ├── crew-link/
│   │   ├── missions/
│   │   ├── voice/
│   │   └── export/
│   ├── shipcore/
│   │   ├── router/
│   │   ├── providers/
│   │   ├── memory/
│   │   └── policies/
│   ├── personalities/
│   │   ├── mars/
│   │   ├── venus/
│   │   └── open-orbit/
│   ├── storage/
│   ├── types/
│   └── tests/
└── package.json
```

The exact framework setup may vary, but the domain boundaries should remain clear.

## 🧠 Core architecture

### Captain Profile

The Captain Profile is the stable user-owned identity layer.

Minimum prototype fields:

| Field | Purpose |
|---|---|
| profile version | Supports migration as the schema changes |
| captain ID | Local unique identifier |
| display name | Captain-facing identity |
| pronouns | Optional dialogue personalization |
| preferences | Tone, accessibility, and interface settings |
| goals | Long-term outcomes |
| active missions | Current actionable work |
| achievements | Completed progress records |
| crew roster | Foundational and custom crew references |
| memory index | User-approved summaries and facts |
| created and updated dates | Data lifecycle |
| privacy settings | Retention and sharing choices |

Do not store unrestricted conversation history inside the main profile object. Store transcripts separately and reference approved summaries.

### ShipCore Router

ShipCore owns orchestration, not personality.

Responsibilities:

- Receive captain messages
- Select one or two active crew matrices
- Assemble bounded context
- Apply capability and safety policies
- Call the selected provider adapter
- Record structured results
- Route text to the voice layer
- Enforce Crew Link turn limits
- Handle provider failure without losing captain data

ShipCore should not contain provider-specific logic outside the adapter boundary.

### Personality Matrix

A personality configuration should define behavior without pretending to be a separate intelligence model.

Recommended fields:

| Field | Purpose |
|---|---|
| ID and display name | Stable crew identity |
| celestial type | Planet, moon, star, or other body |
| role | Rival, mediator, engineer, guardian, and similar |
| core traits | Three to six defining characteristics |
| values | What the crew member consistently prioritizes |
| speaking style | Rhythm, directness, warmth, and vocabulary |
| reasoning posture | How the matrix approaches uncertainty |
| strengths | Recommended task categories |
| blind spots | Known limitations |
| disagreement style | How it challenges the captain or crew |
| care style | How loyalty and support are expressed |
| prohibited behaviors | Safety, manipulation, and imitation boundaries |
| greeting prompts | Short original interaction seeds |

Personality files must contain original descriptions. Do not add third-party character names, likeness instructions, signature lines, or actor imitation requests.

### Capability Packs

Professional capabilities must be separate from personality.

Possible future packs:

- Research
- Drafting
- Project planning
- Contract issue spotting
- Coding
- Study support
- Mission coaching

A capability pack defines tools, required verification, output structure, and handoff rules. A crew member supplies tone and perspective, while the capability pack supplies workflow discipline.

### Provider adapters

Start with one functional provider adapter and one deterministic mock adapter for development.

Every adapter should expose the same basic operations:

- Generate a response
- Report supported features
- Report whether tools or live research are available
- Return structured errors
- Support cancellation
- Avoid logging secrets

Provider choice belongs in local settings. Never couple Captain Profile storage to a provider's proprietary thread format.

## 🪐 Initial personality implementation

### Mars

Implementation tests should confirm that Mars:

- Considers competing interests
- Gives a clear recommendation
- Uses calm and deliberate language
- Avoids empty neutrality
- Identifies long-term consequences
- Does not become passive merely because he is diplomatic

### Venus

Implementation tests should confirm that Venus:

- Challenges weak assumptions
- Identifies exploitation and hidden risk
- Gives direct recommendations
- Protects the captain's stated goals
- Avoids cruelty, harassment, and reckless certainty
- Can revise her position when presented with better evidence

### Pluto test profile

Pluto should be the first Deck 1 personality test after Mars and Venus.

Pluto is:

- Proud without demanding worship
- Highly competitive without sabotaging allies
- Blunt without becoming needlessly abusive
- Relentlessly disciplined
- Suspicious of shortcuts
- Respectful of demonstrated competence
- Quietly loyal
- Protective through action
- Aware of past errors and capable of growth

Pluto should push the captain to improve, but never shame the captain for disability, exhaustion, failure, or asking for help. His value comes from standards, focus, honesty, and hard-earned loyalty.

## 🗣️ Voice implementation

Use the browser SpeechSynthesis interface for the first prototype.

Requirements:

- Enumerate device voices after the voices-changed event
- Store voice preferences per device and crew member
- Provide language and voice fallbacks
- Allow speech to be interrupted immediately
- Never autoplay long responses without permission
- Expose rate, pitch, and volume controls within safe ranges
- Provide text captions at all times
- Keep personality behavior independent of voice selection

Recorded phrases may be added later for greetings and achievements. Do not implement voice cloning in the first prototype.

## 🔗 Crew Link protocol

Crew Link permits two personalities to respond within one captain-controlled session.

Minimum flow:

1. Captain chooses two crew members.
2. Captain submits one mission or question.
3. First crew member gives an initial position.
4. Second crew member responds to the captain and the first position.
5. First crew member may provide one final refinement.
6. ShipCore summarizes agreements, disagreements, and next actions.
7. Captain decides what to do.

Default maximum: three crew turns plus one ShipCore summary.

Controls:

- Stop session
- Skip next response
- Ask captain for clarification
- Prevent repeated content
- Prevent crew from creating new sessions
- Keep private memories private
- Mark which context was shared
- Save or discard the transcript

### Cross-tab design

Use BroadcastChannel for same-origin tab messages. Include:

- Session ID
- Sender crew ID
- Sequence number
- Message type
- Created time
- Payload
- Schema version

Reject stale, duplicate, unknown-session, and out-of-order messages. A tab must not trust another tab merely because it shares the same origin.

Use a SharedWorker only as an enhancement. The application must still function when SharedWorker is unavailable.

## 💾 Local persistence

Use IndexedDB behind a small typed repository layer.

Suggested stores:

- captain profiles
- crew configurations
- missions
- approved memories
- transcripts
- achievements
- device voice preferences
- application settings

Requirements:

- Schema versioning
- Migration tests
- Transactional writes for related records
- Human-readable export
- Import validation
- Duplicate-ID handling
- Recovery from incomplete imports
- Clear delete controls

## 📦 The .starship format

The first export can be a versioned JSON document even if the final format later becomes a packaged archive.

It should include:

- Format and schema version
- Export date
- Captain Profile
- Crew configurations
- Missions and achievements
- Approved memories
- Optional transcripts chosen by the captain
- Integrity metadata

It must not silently include:

- Provider API keys
- Browser credentials
- Unapproved raw recordings
- Deleted memories
- Device-specific secrets

Import should preview the contents and ask whether to merge, replace, or create a separate captain profile.

## 🖥️ Starship Interface

The first interface should prioritize speed and clarity over heavy animation.

Minimum screens:

- Welcome and Captain Profile setup
- Main bridge
- Crew selector
- Single-crew conversation
- Crew Link dual panel
- Mission console
- Open Orbit crew editor
- Voice settings
- Data export and import
- Privacy and memory controls

Design principles:

- Responsive from phone through desktop
- Keyboard accessible
- Reduced-motion support
- Visible focus states
- Sufficient color contrast
- No interface that requires speech
- No essential information shown only through animation
- Fast initial load
- Clear offline and provider-error states

## 🏅 Mission Engine

The first mission model should remain simple.

A mission needs:

- Title
- Captain-defined outcome
- Optional steps
- Status
- Difficulty
- Experience value
- Created and completed dates
- Related goal
- Optional crew guide
- Captain reflection

Experience should be awarded for captain-confirmed progress. Avoid streak mechanics that punish illness, emergencies, disability, travel, or ordinary life changes.

## 🛡️ Safety and trust boundaries

- The captain remains in command.
- Crew members cannot claim authority over the user.
- Crew must not encourage dependence or isolation.
- High-impact professional output must identify uncertainty and verification needs.
- Voice mode must be distraction-minimized during movement.
- Location, microphone, and notification permissions must be requested only when needed.
- User data must not be sent to a provider without a clear action.
- Secrets must never be stored in source control.
- The application must distinguish local data from provider-processed data.

## 🧪 Required prototype tests

### Unit tests

- Captain Profile validation
- Personality configuration validation
- Provider adapter contract
- Mission experience calculation
- Export and import validation
- Crew Link turn limit
- Duplicate and stale cross-tab message handling
- Voice fallback selection

### Integration tests

- Create captain, reload, and recover state
- Switch between Mars and Venus without losing profile context
- Keep private crew memory from leaking into another session
- Complete one Crew Link exchange
- Export and import into a fresh local database
- Cancel an active provider request
- Recover from provider failure

### Behavioral evaluations

Use a fixed prompt set and review whether:

- Mars is balanced but decisive
- Venus is direct but evidence-responsive
- Pluto is proud and demanding but not abusive
- Custom crew instructions do not override safety boundaries
- Two crew members disagree without fabricating personal hostility
- Shared Captain Profile facts remain consistent

## 🗺️ Implementation ladder

### Milestone 0: Repository foundation

- Select the React build tool
- Add formatting, linting, tests, and continuous integration
- Add contribution and security guidance
- Establish the source structure

### Milestone 1: Local captain

- Captain setup
- IndexedDB repository
- Profile view and edit
- Export and import skeleton

### Milestone 2: Mars and Venus

- Mock provider
- One real provider adapter
- Personality configuration system
- Chat interface
- Device voice selection

### Milestone 3: Open Orbit

- Custom crew editor
- Role and trait configuration
- Voice and theme settings
- Private and shared memory controls

### Milestone 4: Crew Link

- Dual-panel experience
- BroadcastChannel synchronization
- Turn controller
- Session transcript and summary

### Milestone 5: Missions

- Goal and mission records
- Experience and ranks
- Achievements
- Professor Mashu check-ins

### Milestone 6: First Constellation preview

- Add Pluto as the first evaluation profile
- Compare Mars, Venus, and Pluto with behavioral tests
- Establish the reusable process for the remaining seventeen matrices

## ✅ Definition of first-prototype complete

The prototype is complete when:

- It installs as a PWA from a supported browser.
- A new user can create a captain without an account.
- Captain data persists across reloads.
- Mars and Venus produce observably different but useful behavior.
- Voice selection works with a visible fallback.
- One custom Open Orbit crew member can be created and used.
- Two crew members can complete a bounded Crew Link session.
- Data can be exported, deleted, and imported.
- No secrets or private inspiration notes appear in the repository.
- Core accessibility checks and automated tests pass.
- The README accurately distinguishes implemented features from plans.

## 🌠 Development rule

Every new feature should strengthen at least one of these outcomes:

1. The captain owns the journey.
2. The crew provides meaningfully different perspectives.
3. Real-world progress becomes easier to understand and continue.
4. The system remains portable, respectful, and safe.

If a proposed feature does not serve one of those outcomes, it should wait.
