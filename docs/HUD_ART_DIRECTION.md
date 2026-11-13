# MARSAI HUD Art Direction

**Feel:** clean, modern, minimal, and future-forward, with the confidence of an anime starship console. Neon on dark glass, in the spirit of TRON: thin glowing lines, one calm accent per state, and controls that feel good to touch.

Nothing about the design's influences is shown on screen: no years, no era labels, no CRT scanlines or static.

## Principles

1. **Neon minimal.** Dark surfaces, thin neon outlines, and glow only where something is active or selected. One accent at a time.
2. **Touch first.** Big rounded caps (48px and up on touch screens), glossy pill slider thumbs, short haptic ticks and a soft click on every press. Pressing feels like pressing.
3. **Conversation is the hero.** The channel owns the center of the screen. Controls stay at the edges.
4. **Everything is a switch you can see.** Subsystems are real switches with indicator lights, ON by default after power-on.
5. **One geometry, eight themes.** Colors come from tokens only, so every theme shares the same layout.

## Layout

| Zone | Contents |
| --- | --- |
| Top strip | Brand, module tabs, local date and time, Full screen, Settings, Off |
| Left | Active crew (sigil, name, role) and **Subsystems**: switches for Voice replies, Microphone, Web data, AI brain, ShipCore, Sound cues, plus Volume and Voice speed sliders and a live level display |
| Center | Module card (the Crew module shows the roster, Theme Lab shows the eight themes) over the conversation |
| Right | Six quick actions |
| Bottom | State pill, the talk disc, one message line, Send |

Phones: the left panel becomes a drawer, tabs scroll, quick actions become a tray, and the talk disc stays under the thumb.

## Components

- **Neon keys:** rounded outline, bloom on hover and when active, an indicator light for selected state. No fills except for the primary action (Send) and Off.
- **Frames:** chamfered panels drawn as a thin neon line around a dark fill.
- **Talk disc:** a glowing ring with a white marker, like an identity disc. Press and hold to talk. Ring states: **SPEAK NOW** (the mic is live, pulsing), **LISTENING** (you are being heard, the marker spins), **THINKING**, **SPEAKING**. Sound cues mark start and stop.
- **Sliders:** a dark recessed track, a glowing neon fill, and a glossy pill thumb.
- **Switches:** a recessed track with a metal cap and an indicator light.
- **Finishes:** the metal parts (switch caps, the disc centre) can be carbon, titanium, or matte (Settings, Button finish). The highlight follows the pointer, or the tilt of a phone.

The physical-controls language (carbon and titanium finishes, the moving highlight, depressible caps, big touch targets, the ring with a marker) is adapted from the GoldenSunDJ controller, a project of the same owner ([Sukonik/GoldenSunDJ](https://github.com/Sukonik/GoldenSunDJ), MPL-2.0). The neon is MARSAI's own.

## Themes

Eight palettes from the README, applied everywhere (home and HUD), remembered per device, and switchable from Theme Lab, Settings, or by voice ("change the theme to Solar Forge", "next theme"):

Ares Prime, Lunar Alloy, Solar Forge, Helios Signal, Europa Crown, Orbital Command, Nebula Relay, Phobos Night.

## Type

Orbitron (brand, tabs, tags, buttons), Quantico at 18px or larger (panel titles), JetBrains Mono (readouts), system sans (conversation). See [TYPOGRAPHY.md](TYPOGRAPHY.md).

## Accessibility and performance

- Reduced motion removes the boot sequence, ring animation, and pulses; a Glow switch (Settings) removes soft glows
- Visible focus on every control; sliders and switches are native or ARIA-correct and keyboard operable (arrow keys, Page Up and Down, Home and End)
- Status is never color alone (labels and states are always text)
- No images or video: shapes are CSS, so the HUD stays light

## Inspiration and originality boundary

Studied for mood only, nothing copied: 90s anime starship and mecha interfaces, TRON, [mui-fui-theme](https://github.com/suwa-sh/mui-fui-theme) (MIT, token structure), and the GoldenSunDJ controller for touch feel. MARSAI's HUD uses its own shapes, copy, and names. No franchise names, logos, typography, layouts, or assets appear in public MARSAI material.
