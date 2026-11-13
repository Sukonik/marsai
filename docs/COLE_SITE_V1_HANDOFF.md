# 🛰️ MARSAI Site V1 Development Handoff for Cole

## Mission

Build the first public MARSAI website as an interactive, browser-first starship interface at:

**https://sukonik.github.io/marsai/**

Version 1 should introduce the original MARSAI universe, make the twenty-member celestial crew easy to explore, demonstrate the visual logic of ShipCore, and provide a convincing preview of the future companion application.

This is not a generic landing page with a space background. It should feel like the captain has opened a functioning orbital console.

## 🌌 Product foundation

MARSAI is an original personal AI starship and life-progression RPG.

The website must communicate four ideas immediately:

1. **The user is the captain.**
2. **Mars, Venus, and the First Constellation provide different perspectives.**
3. **Real goals become missions and progress.**
4. **The captain owns a portable journey that can survive changes in AI provider.**

Professor Mashu and the Celestial Personality Project provide the narrative frame. ShipCore provides the technical frame.

All public names, visuals, dialogue, terminology, and personality descriptions must remain original to MARSAI. Do not add third-party character names, franchise terminology, recognizable likenesses, signature dialogue, or performer imitation instructions.

## ✅ V1 outcome

The first release should be a polished interactive product preview with:

- A deployable GitHub Pages site
- A persistent tactical HUD shell
- Responsive desktop, tablet, and mobile layouts
- Ares Prime as the default theme
- All eight selectable HUD themes
- Mars, Venus, and all eighteen First Constellation profiles
- Crew sigils and role filtering
- A visual Crew Link demonstration
- A sample mission console
- A ShipCore architecture view
- A Professor Mashu transmission
- Theme-aware SVG logo and favicon assets
- Clear labeling of planned features versus working interactions
- No backend or paid service requirement

The public site must not pretend that live AI, memory, voice cloning, or mission synchronization is already operational. Interactive previews should be labeled **SYSTEM PREVIEW** or **LOCAL DEMO** where necessary.

## 🚫 V1 non-goals

Do not block the first release on:

- Live provider integration
- User accounts
- Cloud synchronization
- Real voice cloning
- Payment systems
- A character marketplace
- Full Captain Profile persistence
- All mission-engine rules
- Desktop packaging
- Native mobile applications
- Photorealistic characters
- Heavy 3D rendering
- WebGL as a core dependency

The page should remain fast and useful without advanced graphics hardware.

## 🎨 Visual direction

The visual language combines:

- Orbital telemetry
- Planetary navigation
- Precision mechanical instrumentation
- Late-analog CRT rhythm
- Modern responsive interface discipline
- Clean geometric typography
- Controlled glow rather than unrestricted neon
- Layered depth without sacrificing readability

The interface should feel engineered, not decorated.

### Design rule: 70 / 20 / 10

- **70% neutral structure:** background, panels, readable text, and quiet grid lines
- **20% theme identity:** borders, headings, selected controls, and planetary markers
- **10% active signal:** alerts, current task, focus, and live system state

Do not apply glow to body text. Glow is reserved for active controls, signal traces, and focus states.

## 🪐 Primary identity

### Official logo system (provided)

The official vector emblem, wordmarks, subtag, and lockups are in [`public/brand/`](../public/brand/) and documented in [`LOGO_HANDOFF.md`](LOGO_HANDOFF.md). Raster app icons and `favicon.ico` are in [`assets/brand/`](../assets/brand/). Use the SVGs for the header and hero, and the raster files for the favicon and manifest. The bridge shell in [`site/`](../site/) already uses them. A brand zip is still to come.

### Standard logo

Create an original SVG logo with:

- A double-ringed planetary Mars sphere
- One diagonal orbital trajectory
- Two restrained vector fins or orbital stabilizers
- A wide **MARSAI** wordmark
- Optional technical subline: **ORBITAL COMPANION OS // SYS-04**

The logo should work in three forms:

1. **Full lockup:** emblem, MARSAI wordmark, and technical subline
2. **Compact lockup:** emblem and MARSAI
3. **Mark only:** planetary emblem for navigation and application icons

Avoid excessive detail, gradients that disappear at small sizes, and faux-metal textures.

### Typography

The approved typography system is defined in [TYPOGRAPHY.md](TYPOGRAPHY.md).

- **Orbitron:** primary MARSAI display family, live wordmark basis, hero headings, navigation, theme names, major controls, and large status readouts
- **Quantico:** large panel titles and large system prompts only, with an intended minimum size of 18 CSS pixels
- **JetBrains Mono:** telemetry, IDs, times, logs, coordinates, and command output
- **System sans-serif:** paragraphs, descriptions, settings, forms, and small interface text

The visual wordmark is written **MARS AI** in large Orbitron. The product name remains **MARSAI** in metadata, URLs, filenames, and ordinary prose.

Do not use Quantico for body copy, small labels, buttons, timestamps, telemetry, or mobile microcopy. Do not use Orbitron for long paragraphs.

The previously supplied rounded path wordmark and its combined lockups are deprecated. The shield-and-orbit emblem remains approved. Until replacement wordmark assets are delivered, use the emblem with live Orbitron text.

Provide system-font fallbacks and ensure that the site remains usable if web fonts fail.

## 🎛️ Unified HUD architecture

Every page uses the same bridge shell. Navigation changes the active central module rather than rebuilding the layout.

### 1. Top telemetry strip

Contains:

- Left: captain tier badge and connection state
- Center: compact MARSAI mark, active module, and session chronometer
- Right: compute reserve bars, local status, and theme control

The chronometer may count the local session duration. It must not suggest actual compute usage when no provider is connected.

### 2. Left systems wing

Contains compact status modules:

- **Trace Sync:** preview of captain-to-crew context alignment
- **Core Pulse:** animated but reduced-motion-safe processing waveform
- **Subsystem Nodes:** local demo, voice availability, storage preview, and network status
- **Primary Navigation:** Bridge, Crew, Missions, ShipCore, Theme Lab, Roadmap

On smaller screens, this becomes a slide-out systems drawer.

### 3. Center focus matrix

The central workspace hosts the active module.

Visual frame:

- Low-opacity coordinate grid
- Two or three concentric orbital rings
- Corner targeting brackets
- One strong focal panel
- Contextual command title
- No constant large rotation

When processing a local demo, targeting brackets may contract once and the active ring may pulse. Honor reduced-motion preferences.

### 4. Right chamber rack

A vertical six-slot action rack:

1. Talk to Mars
2. Talk to Venus
3. Open Crew Link
4. Create Mission
5. Open Crew
6. Change Theme

Each slot uses a crew sigil or functional glyph, a text label, and an active state. Never rely on color alone.

On mobile, the rack becomes a horizontally scrollable quick-action tray.

### 5. Bottom command console

Contains:

- Command input
- Send or execute button
- Voice availability indicator
- Clear button
- Current active crew
- Keyboard hint
- Expandable system log

V1 uses deterministic local responses and navigation actions. The console must clearly show **LOCAL DEMO** until a real provider is added.

## 🗺️ Site modules

Use one React application with a persistent bridge shell. Hash routing is acceptable for GitHub Pages and avoids server rewrite problems.

### Route: Bridge

Purpose: provide the strongest first impression and explain MARSAI in under thirty seconds.

Content:

- Hero statement: **ONE GALAXY. INFINITE STORIES.**
- Short product explanation
- Mars and Venus companion selectors
- One sample mission
- Professor Mashu transmission card
- Animated ShipCore status orb
- Calls to explore crew and launch the local demo

Suggested Professor Mashu message:

> Captain detected. Celestial Personality Project transferred successfully. The twenty matrices insist they are functioning exactly as designed. I remain scientifically open-minded.

### Route: Crew

Purpose: make the First Constellation memorable and useful.

Features:

- Foundational, male constellation, and female constellation filters
- Role filters
- Twenty crew cards
- Permanent crew sigils
- Personality summary
- Strengths and blind spots
- Recommended mission types
- Voice status marked as device-selected
- Pin-to-chamber action
- Compare-two-crews action

Crew cards must use the existing public descriptions from the README as the source of truth.

### Route: Crew Link

Purpose: demonstrate the two-perspective system.

V1 behavior:

- Choose two crew members
- Choose a sample scenario
- Display a deterministic three-turn exchange
- Show agreements, disagreements, and proposed next action
- Allow pause, reset, and switch
- Label the transcript as a local preview

Default demonstration:

- Mars evaluates competing interests.
- Venus challenges hidden risk.
- ShipCore summarizes the shared recommendation.

A second demonstration can pair Vega and Jupiter to show engineering versus command strategy.

### Route: Missions

Purpose: show how real-world progress becomes an adventure.

Include:

- Mission cards
- Objective, steps, difficulty, and experience
- Bronze, Silver, and Gold preview
- Captain-confirmed completion
- Achievement preview
- One sample side quest
- Clear message that progress is earned through real action, not spending

Local demo state may persist through localStorage for V1. Do not describe this as the final Captain Profile database.

### Route: ShipCore

Purpose: explain the architecture in a visual and understandable way.

Show:

- Captain Profile
- ShipCore Router
- Personality Matrix
- Capability Pack
- Voice Profile
- Provider Adapter
- Mission Engine
- Local Persistence
- Export and import concept

The architecture should be interactive but simple. Selecting a component reveals what it owns, what it cannot access, and what data crosses its boundary.

### Route: Theme Lab

Purpose: demonstrate all eight HUD palettes on the same geometry.

Features:

- Eight theme cards
- Live preview
- Theme comparison
- Reset to Ares Prime
- Store selection locally
- Show palette swatches and semantic roles
- Reduced-glow toggle
- High-contrast text preview

### Route: Roadmap

Purpose: separate the current site from the future application.

Include:

- Website V1
- Captain Profile
- Mars and Venus prototype
- Open Orbit custom crew
- Crew Link
- Mission Engine
- First Constellation implementation
- Portable **.starship** format
- Tauri desktop evaluation

Use clear labels: **LIVE**, **IN PREVIEW**, **PLANNED**, and **RESEARCH**.

## 🌈 Revised HUD themes

All themes preserve identical geometry and component behavior. Only tokens change.

Body text remains light and readable. Highly saturated colors are accents, not large reading surfaces.

| # | Theme | Primary vector | Secondary | Active signal | Background | Panel | Text |
|---|---|---|---|---|---|---|---|
| 1 | **Ares Prime** | #E65A3A | #D99A3D | #42CFE0 | #080B10 | #111821 | #E6EDF3 |
| 2 | **Lunar Alloy** | #C7D2DC | #559FD1 | #55C985 | #08111B | #101C28 | #EDF3F7 |
| 3 | **Solar Forge** | #E87532 | #D9B744 | #ED5572 | #100B08 | #1C1310 | #F3EDE8 |
| 4 | **Helios Signal** | #DFAE3F | #52BE91 | #E66060 | #0D0E0A | #181A12 | #F2F0E6 |
| 5 | **Europa Crown** | #32C3D3 | #BE9D50 | #CE70A9 | #061116 | #0E2028 | #E5F3F5 |
| 6 | **Orbital Command** | #4B7FCA | #B5C2D0 | #D89935 | #070D16 | #111B2A | #E7EDF5 |
| 7 | **Nebula Relay** | #8E60CC | #4DB88C | #DC717B | #0B0812 | #191124 | #F0EAF5 |
| 8 | **Phobos Night** | #76B4CC | #7C8898 | #CFAE47 | #05080D | #0C121A | #DFE8EF |

### Shared semantic tokens

These meanings remain consistent across themes:

| Token | Default | Use |
|---|---|---|
| Success | #55C985 | Confirmed, available, completed |
| Advisory | #D9A441 | Warning, review, partial state |
| Danger | #E86464 | Failure, destructive action, critical alert |
| Information | #55B6E8 | Help, neutral system information |
| Muted text | #9BAABA | Secondary labels and inactive telemetry |
| Focus ring | #FFFFFF | Keyboard focus combined with theme outline |

Use contrast testing for every text and background pair. If a theme accent fails for normal-size text, reserve it for borders, icons, and large labels.

## 🧩 Theme token model

Implement themes through CSS custom properties, not duplicated stylesheets.

Minimum variables:

- color-bg
- color-panel
- color-panel-raised
- color-text
- color-text-muted
- color-primary
- color-secondary
- color-signal
- color-border
- color-success
- color-warning
- color-danger
- glow-primary
- grid-opacity
- scanline-opacity

The reduced-glow toggle should lower glow and scanline opacity without changing theme identity.

## 🔖 Favicon system

Create eight original, crisp SVG marks with 32x32 and 16x16 PNG fallbacks.

1. **Orbital Mars Ring:** default crimson planet and amber orbit
2. **Tri-Wing Crest:** planetary core within three restrained vector fins
3. **Command Shield:** hexagonal badge, planet, and star glint
4. **Core Eye:** circular signal ring and centered waveform
5. **M-Bracket:** geometric M formed from targeting corners
6. **Twin-Moon Orbit:** central planet and two orbital markers
7. **Six-Chamber Core:** six-slot circular action rack
8. **Solar Compass:** four-point navigation burst over a planetary disc

Requirements:

- Recognizable without text
- No detail thinner than one effective pixel at 16x16
- Transparent outer canvas where practical
- Ares Prime Orbital Mars Ring is the default
- Theme changes may update the favicon, but failure must fall back to the default
- Include Apple touch icon and web manifest icons

## 🧱 Recommended stack

- Vite
- React
- TypeScript
- CSS Modules or a small token-driven stylesheet system
- React Router with hash routing, or an equivalent Pages-safe strategy
- Vitest
- Testing Library
- Playwright for responsive smoke tests
- GitHub Actions
- GitHub Pages

Avoid adding a large component framework for the first release. The visual identity depends on custom layout and token discipline.

## 📁 Suggested repository structure

```text
marsai/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy-pages.yml
├── docs/
│   ├── BUILD_HANDOFF.md
│   └── COLE_SITE_V1_HANDOFF.md
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── social-card.svg
├── src/
│   ├── app/
│   ├── assets/
│   ├── components/
│   │   ├── hud/
│   │   ├── crew/
│   │   ├── missions/
│   │   └── shipcore/
│   ├── content/
│   │   ├── crew.ts
│   │   ├── missions.ts
│   │   └── roadmap.ts
│   ├── routes/
│   ├── themes/
│   │   ├── tokens.ts
│   │   └── themes.css
│   ├── demos/
│   ├── tests/
│   └── main.tsx
├── index.html
├── vite.config.ts
└── package.json
```

Keep content data separate from visual components so personality descriptions can be updated without rewriting the interface.

## 📱 Responsive behavior

### Desktop, 1280px and wider

- Full top strip
- Left systems wing
- Central module
- Right chamber rack
- Bottom console
- Maximum content width to prevent empty ultra-wide layouts

### Tablet, 768px to 1279px

- Collapsible left wing
- Compact right rack
- Central module receives most space
- Telemetry labels shorten without becoming cryptic

### Mobile, below 768px

- Single-column center module
- Top strip retains logo, module, and menu
- Systems wing becomes a drawer
- Chamber rack becomes a horizontal tray
- Bottom console remains reachable above the browser safe area
- Tables convert to readable cards
- No tiny decorative telemetry
- Touch targets at least 44px
- No horizontal page overflow

## ♿ Accessibility

Required:

- Semantic headings and landmarks
- Full keyboard navigation
- Visible focus
- Skip-to-content link
- Dialog focus trapping
- Escape closes overlays
- Meaningful button labels
- Crew name and role always accompany sigils
- Status never communicated by color alone
- Reduced-motion support
- Reduced-glow control
- Sufficient contrast
- Screen-reader announcements for theme and module changes
- Voice features never required for navigation
- Waveform animations hidden from assistive technology

## ⚡ Performance

Targets for the deployed Pages site:

- Lighthouse Performance: 90 or higher
- Accessibility: 95 or higher
- Best Practices: 95 or higher
- SEO: 90 or higher
- Initial JavaScript under 250 KB compressed where practical
- No blocking video backgrounds
- No mandatory WebGL
- SVG rather than large raster HUD decorations
- Lazy-load noncritical modules
- Avoid continuous animations when the page is hidden

## 🧪 Test matrix

### Automated

- Unit tests for theme selection and persistence
- Unit tests for crew filtering
- Unit tests for Crew Link demo sequencing
- Route smoke tests
- Keyboard navigation tests
- Build with the GitHub Pages base path
- Link and asset-path validation

### Playwright viewports

Test every theme at:

- 390x844 mobile
- 820x1180 tablet
- 1440x900 desktop

This produces 24 theme-and-viewport smoke combinations.

Required assertions:

- No horizontal overflow
- Navigation remains reachable
- Command console remains usable
- Theme persists after reload
- Crew cards display names, roles, and sigils
- Dialogs close through keyboard
- Reduced-motion mode does not depend on animation completion
- Direct hash routes load on GitHub Pages

## 🚀 Build sequence for Cole

### PR 1: Application foundation

- Scaffold Vite, React, and TypeScript
- Configure the **/marsai/** base path
- Add CI
- Add GitHub Pages deployment
- Add bridge shell placeholders
- Confirm public deployment

### PR 2: Ares Prime bridge

- Implement default tokens
- Build top strip, systems wing, center matrix, chamber rack, and command console
- Add responsive collapse behavior
- Add reduced-motion support

### PR 3: Identity and assets

- Add full and compact SVG logos
- Add eight favicon concepts
- Add manifest and social card
- Establish typography and icon rules

### PR 4: Crew

- Add all twenty crew records from the README
- Add filters, cards, sigils, and detail panels
- Add pin-to-chamber behavior

### PR 5: Theme Lab

- Add all eight revised themes
- Add persistence and reduced-glow mode
- Add contrast and responsive checks

### PR 6: Crew Link and Missions demos

- Add deterministic Crew Link scenarios
- Add mission preview and local completion state
- Add visible preview labels

### PR 7: ShipCore, roadmap, and polish

- Add architecture explorer
- Add roadmap states
- Complete accessibility and performance pass
- Run the full 24-combination visual smoke matrix

Do not combine all seven slices into one oversized pull request.

## ✅ V1 acceptance criteria

Version 1 is complete when:

- The site is publicly available at the expected GitHub Pages URL.
- The interface clearly looks and behaves like a MARSAI orbital console.
- Ares Prime loads by default.
- All eight themes preserve the same geometry and remain readable.
- All twenty crew members are discoverable with names, roles, sigils, and original descriptions.
- Crew Link demonstrates two perspectives without implying a live AI connection.
- Missions demonstrate real-life progression without pay-to-win language.
- The logo, favicon, and manifest assets work.
- Mobile, tablet, and desktop layouts pass smoke tests.
- Keyboard and reduced-motion behavior work.
- No third-party franchise names or recognizable material appear.
- No API secrets or paid services are required.
- The README and roadmap accurately distinguish live, preview, planned, and research features.
- CI and Pages deployment are green.

## 🧭 First action

Cole should begin with **PR 1: Application foundation** and publish the empty but responsive bridge shell to GitHub Pages before building detailed visuals. A deployed shell will expose base-path, routing, asset, and mobile-layout problems early.

After the shell is live, Ares Prime becomes the reference geometry for every remaining theme.
