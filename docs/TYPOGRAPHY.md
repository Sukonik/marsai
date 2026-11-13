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

The bridge shell loads Orbitron and Quantico through Google Fonts with system fallbacks.

CSS roles:

- **--font-display:** Orbitron
- **--font-panel:** Quantico
- Body copy: system sans-serif

If remote fonts fail, the interface must remain fully usable.

## Current wordmark status

The rounded custom path wordmarks and combined lockups currently under **public/brand/** are deprecated. They must not be used as the final MARSAI wordmark.

The shield-and-orbit emblem remains approved.

Until the replacement Orbitron-based wordmark assets are delivered:

- Use the emblem by itself where possible.
- Use live Orbitron text for **MARS AI** in the website header and hero.
- Do not rasterize the temporary live-text treatment.
- Do not update social graphics with the deprecated wordmark.

## Accessibility

- Do not use letter spacing that causes words to fragment visually.
- Keep display text at accessible contrast.
- Never use a display family as the only carrier of critical information.
- Allow browser zoom without clipping.
- Reduce tracking on narrow mobile screens when needed.
- Avoid all-caps paragraphs.

## License handling

The repository retains the official OFL 1.1 license text for both approved families under **site/assets/fonts/**.

If font binaries are self-hosted later, keep their copyright notices and licenses with the files. Do not sell the font files by themselves or rename a modified font using a reserved font name without permission.
