# 🪐 MARSAI Logo and Wordmark Handoff

## Brand lock

- Primary name: **MARSAI**
- Technical subtag: **ORBITAL COMPANION OS // SYS-04**
- Primary emblem: shield enclosing a ringed Mars sphere
- Default site theme: **Ares Prime**

The emblem and wordmark are supplied separately so Cole can use the shield as an application icon, crew-console mark, favicon source, or compact navigation badge without forcing the full wordmark into small spaces.

## Color system

| Token | Hex | Use |
|---|---:|---|
| Ares Crimson | `#E65A3A` | Planet core and primary brand signal |
| Solar Amber | `#D99A3D` | Orbital path and secondary signal |
| HUD Silver | `#DCE7F0` | Shield, light wordmark, and high-contrast lines |
| Active Cyan | `#42CFE0` | Small active-state glint only |
| Bridge Navy | `#08111B` | Dark wordmark and light-background use |
| Telemetry Gray | `#9BAABA` | Technical subtag and secondary labels |

## Asset selection

### Emblem only

Use files in `logo/` for:

- Browser and application icons
- Compact navigation
- Loading and boot states
- Crew-console badges
- Social avatars
- Favicon derivation

The full-color emblem is the primary version. Use silver on dark monochrome applications and dark navy on light backgrounds.

### Wordmark only

Use files in `wordmark/` when the emblem already appears nearby or when horizontal space is limited. The custom wordmark is path-based and does not require an installed display font.

The technical subtag is optional and should not appear below approximately 480 pixels of available width.

### Combined lockups

Use files in `lockups/` for:

- Website hero and footer
- README and social header art
- About and press pages
- Desktop boot screen

Use the horizontal lockup for wide layouts and the stacked lockup for square or portrait placements.

## Clear space

Maintain clear space equal to at least one quarter of the planet diameter around the emblem or combined lockup. Do not let panel borders, text, or HUD traces cross through the shield.

## Minimum size

- Emblem: 32 pixels digital minimum
- Wordmark: 140 pixels wide minimum
- Horizontal lockup with subtag: 420 pixels wide minimum
- Stacked lockup with subtag: 260 pixels wide minimum

Below those sizes, remove the subtag first. At favicon sizes, use the simplified emblem rather than the combined lockup.

## Background use

- Full-color and silver assets are designed for dark HUD backgrounds.
- Dark assets are designed for white, silver, or very light backgrounds.
- Do not place the full-color emblem over a busy photograph.
- Do not add an outer glow directly to the source asset. Apply controlled interface glow through CSS so reduced-glow and accessibility settings remain possible.

## Do not

- Stretch or skew the emblem
- Recolor individual elements outside an approved theme treatment
- Replace the custom wordmark with an ordinary typeface
- Put the wordmark inside the shield
- Add gradients, textures, chrome, or bevels
- Rotate the shield or change the orbit angle
- Use the technical subtag as the primary product name
- Display the old spaced form `MARS AI` as the primary brand

## Website integration

Recommended header behavior:

- Desktop: horizontal lockup
- Tablet: emblem plus wordmark, no subtag
- Mobile: emblem only with accessible `MARSAI` text label
- Browser tab: emblem-derived favicon
- Loading screen: stacked lockup

Every image element should have useful alternative text. Decorative repetitions should use empty alternative text.

## Source of truth

The SVG files are the editable source assets. PNG files are convenience exports for platforms that cannot consume SVG. Always regenerate raster sizes from the SVG rather than resizing an already-small PNG.
