# MARSAI HUD Art Direction: Chronoframe

**Brief:** users should feel they have entered the distant future. The look is 90s anime-era HUD design, modernized across the span **1996 to 2026 to 2056**.

The HUD is built as three layers of time. Each layer has its own visual vocabulary, and the screen reads as one coherent machine that has been upgraded for sixty years.

| Era | Layer role | Visual vocabulary | In code |
| --- | --- | --- | --- |
| **1996** | Foundation | CRT scanlines, hex lattice, chamfered (cut-corner) frames, hard-edged color tags, warning-stripe bands, dense monospaced readouts, hexagonal tabs and sigil frames | `.cut` frames, `--hex` lattice, `.fx` scanlines, `.stripe`, `.hextabs`, `.tag` |
| **2026** | Precision | Crisp vector line work, variable type (Orbitron, Quantico, JetBrains Mono), glass backdrop on modal panels, easing and reduced-motion handling, high-DPI sharpness | Orbitron weights, `dialog::backdrop`, transitions, `prefers-reduced-motion` |
| **2056** | Depth and awareness | In-world date (`2056.<day of year>`), route trace (`MARS » BRIDGE » CORE`), boot sequence, concentric orbit rings, a listening pulse, an ambient intelligence that speaks first | `#stardate`, `#trace`, `.boot`, `.rings`, `.wave` |

The home screen carries the same idea: an era ruler (`1996 ── 2026 ── 2056`) sits above the logo, and the power button is a hex-ended slab.

## Layout (declutter rules)

1. **One hero.** The conversation is the center of the screen. Modules sit above it as a compact card; the Crew module expands into the roster.
2. **Few controls visible.** The top strip holds brand, module tabs, date, link status, and four buttons (full screen, systems, off). Everything else lives in the **Systems** panel (AI brain, web lookups, ShipCore link, voice and recorded phrases, glow, log).
3. **Crew first.** The left wing shows the active crew member's sigil, role, and persona; the right rack holds six quick actions.
4. **One input.** A single message line with mic and send. Voice status appears beneath it only when relevant.
5. **Phones:** the left wing becomes a drawer, tabs become a scrolling row, quick actions become a tray, and full screen is hidden.

## Palette and type

- Ares Prime tokens from the handoff, used 70 / 20 / 10: deep navy-black surfaces, crimson and amber accents, cyan as the active signal. Amber marks the "present" (active tab, your messages); cyan marks the "machine" (crew messages, links, focus)
- Orbitron 700 to 900 for brand, tabs, tags, and buttons; Quantico at 18px or larger for panel titles; JetBrains Mono for telemetry; the system sans stack for conversation and descriptions

## Accessibility and performance

- Reduced-motion removes the boot sequence, pulses, and entrance animation
- A glow switch (Systems panel) removes soft glows
- Focus is always visible (cyan outline); touch targets are at least 40 to 44px; text contrast meets AA
- No images or video: shapes are CSS `clip-path`, an inline SVG lattice, and gradients, so the HUD stays light

## Inspiration and originality boundary

Studied for mood only, nothing copied:

- [mui-fui-theme](https://github.com/suwa-sh/mui-fui-theme) (MIT): token structure and FUI component ideas
- [evangelion-ui-artboard](https://github.com/charlintosh/evangelion-ui-artboard) (MIT): 90s anime HUD composition in plain CSS
- 90s anime mecha and spacecraft interfaces in general: Gundam-family HUDs (including the ZERO System idea of a system that feeds a pilot foresight), Mobile Fighter G Gundam, Zoids New Century, and the Gilliam II bridge in Outlaw Star

**What we take:** abstract visual language only: angular framing, hex cells, bold status tags, dense but ordered readouts, a machine that anticipates the pilot, and a boot-up ritual.

**What we do not take:** any franchise name, logo, typography, iconography, screen layout, warning text, character, or asset. MARSAI's HUD uses its own shapes, copy, and names (Chronoframe, Trace, crew sigils). Public MARSAI material never references those franchises.

Our own take on the ZERO System idea is the **route trace**: a plain statement of where the captain is (`crew » module » engine`). It makes no predictions and implies no hidden compute; future builds can extend it with real, explainable suggestions.
