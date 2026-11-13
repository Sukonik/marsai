# MARSAI Typography System

## Approved families

### Orbitron

**Primary display family and wordmark basis**

Source: https://github.com/googlefonts/orbitron-vf  
License: SIL Open Font License 1.1

Use Orbitron for:

- The large **MARS AI** display wordmark
- Hero headings
- Primary navigation labels
- Theme names
- System modes
- Major HUD controls
- Large status readouts
- Brand-bearing interface text

Recommended weights:

- 900 for the display wordmark and primary hero
- 700 or 800 for navigation and major controls
- 600 for status text and secondary display labels
- 500 only where the text remains comfortably large

The display wordmark is visually written **MARS AI**. The product remains **MARSAI** in metadata, filenames, URLs, documentation, and ordinary prose.

Orbitron should not be used for long paragraphs. The replacement wordmark will be created from a large Orbitron treatment and converted to outlines after final spacing and geometry are approved.

### Quantico

**Large tactical prompt and panel family**

Source: https://github.com/google/fonts/tree/main/ofl/quantico  
License: SIL Open Font License 1.1

Use Quantico only for:

- Large panel titles
- Large system prompts
- Mission classifications
- Alert banners
- Commander-level headings
- Modal or chamber titles

Minimum intended size: **18 CSS pixels**, preferably 20 pixels or larger.

Do not use Quantico for:

- Body copy
- Small labels
- Buttons with compact text
- Telemetry
- Timestamps
- Legal notices
- Dense settings
- Mobile microcopy

### Supporting text

- **JetBrains Mono:** telemetry, timestamps, IDs, logs, coordinates, and command output
- **System sans-serif:** paragraphs, descriptions, forms, settings, and all small readable interface text

No display family should replace readable body typography.

## Current implementation

The bridge shell self-hosts Orbitron (variable, weights 400 to 900) and Quantico (400 and 700) as WOFF2 files in `site/assets/fonts/`, converted from the official Google Fonts sources (https://github.com/google/fonts). Fonts use `font-display: swap` with system fallbacks, and Orbitron is preloaded. No third-party font requests are made.

The official OFL license files sit beside the fonts and must stay with them.

CSS roles:

- **--font-display:** Orbitron
- **--font-panel:** Quantico
- Body copy: system sans-serif

If the font files fail, the interface must remain fully usable.
