# MARSAI HUD References

Ranked reference list for planning the unique MARSAI HUD. Primary basis: Tailwind CSS, Node tooling, and static output for high site performance.

Ranking weighs fit with our stack, license, performance, and the original-IP rule. Facts come from each repository's public page. Last-commit dates were not shown; activity notes come from archived or unmaintained flags and topic-listing dates. Ant Design's license type was not confirmed in the check (believed MIT, verify before relying on it).

## Tier 1: build on or adopt

| # | Repo | License | Stars | Use for MARSAI |
| --- | --- | --- | --- | --- |
| 1 | [mui/base-ui](https://github.com/mui/base-ui) | MIT | 11.4k | Unstyled, accessible React primitives to style with Tailwind. Active. |
| 2 | [arwes/arwes](https://github.com/arwes/arwes) | MIT | 7.6k | Closest concept match: animated frames, text effects, UI sound. No longer maintained, so borrow techniques, do not depend on it. |
| 3 | [TailAdmin free](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template) | MIT | 2.4k | Light Tailwind and Alpine shell and module layout patterns. Not for its look. |
| 4 | [mdrbx/nerv-ui](https://github.com/mdrbx/nerv-ui) | MIT | 97 | Tailwind 4, React 19, Framer Motion architecture. Franchise styling, so structure only. |
| 5 | [suwa-sh/mui-fui-theme](https://github.com/suwa-sh/mui-fui-theme) | MIT | 6 | HUD design-token structure. Tied to MUI, so copy the token ideas only. |

## Tier 2: look-only references

| # | Repo | License | Note |
| --- | --- | --- | --- |
| 6 | [rizznme/cosmic-ui](https://github.com/rizznme/cosmic-ui) | none | Best visual match (Tailwind and React). No license, so study only. |
| 7 | [horizon-edex-theme](https://github.com/GitSquared/horizon-edex-theme) | MIT (fonts OFL, Apache) | Palettes and type pairings. |
| 8 | [eDEX-UI](https://github.com/GitSquared/edex-ui) | GPL-3.0, archived 2021 | Persistent side-wing and center-console layout model. No code reuse; Electron is the wrong runtime. |
| 9 | [TheGreatGildo/nerv-ui](https://github.com/TheGreatGildo/nerv-ui) | MIT | Pure CSS technique reference. Franchise styling. |
| 10 | [evangelion-ui-artboard](https://github.com/charlintosh/evangelion-ui-artboard) | MIT | Small vanilla CSS playground. Franchise styling. |
| 11 | [ant-design](https://github.com/ant-design/ant-design) | verify | Heavy; conflicts with performance goals. Form and table patterns only. |

## Tier 3: concept only

| # | Repo | License | Note |
| --- | --- | --- | --- |
| 12 | [devdogio/sci-fi-ui](https://github.com/devdogio/sci-fi-ui) | MIT | Unity VR and panel layout ideas. |
| 13 | [cyberpunk-hud-demo](https://github.com/hi-godot/cyberpunk-hud-demo), [NewLeafHUD](https://github.com/livened/NewLeafHUD) | none | Mood boards only (Godot, FiveM). |
| 14 | [battle-of-jaburo-0079](https://github.com/keithligh/battle-of-jaburo-0079) | MIT code, CC BY 4.0 content | Three.js starfield technique only; content is franchise material. |
| 15 | [ZoidsLegacyDecomp](https://github.com/jmacato/ZoidsLegacyDecomp), [re-zoids-saga](https://github.com/serivt/re-zoids-saga) | MIT, GPL-3.0 | Skip. Decompilation and reimplementation of a copyrighted game. |

Audio inspiration: [soulextract.com](https://soulextract.com) (a site, not a repository). Use only as a mood reference for our own original sound pack.

## Typography sources

Fonts come from Google Fonts under the SIL Open Font License 1.1: Orbitron ([googlefonts/orbitron-vf](https://github.com/googlefonts/orbitron-vf)) and Quantico ([google/fonts](https://github.com/google/fonts/tree/main/ofl/quantico)). See [TYPOGRAPHY.md](TYPOGRAPHY.md).

## Plan implications

- **Stack:** Tailwind v4 and Node tooling (Vite or Astro, static output for GitHub Pages). Base UI primitives for accessible controls. Hand-drawn SVG frames and CSS for visuals.
- **Sound:** a small original sound pack, off by default, with a mute control and reduced-motion respect.
- **Licenses:** do not copy GPL code (eDEX-UI, re-zoids-saga) or unlicensed repos (cosmic-ui, Godot demo, NewLeafHUD).
- **Originality:** the NERV, Evangelion, Zoids, and Gundam repos are mood references only. No names, marks, layouts, or assets carry over into public MARSAI material.
