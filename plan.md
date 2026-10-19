# Motion, atmosphere and audio plan

## Design movement

Quiet kinetic Renaissance: editorial typography and fine-line orbital geometry remain dominant, while motion behaves like a restrained instrument panel rather than a spectacle. The atmospheric stack combines a deep interactive Vanta.NET network with a warm React Bits Side Rays–style sunbeam fan aimed from the top-right across the tree and the full page.

## Core principles

- Scroll should feel continuous and tactile without replacing accessibility or trapping touch input.
- Motion should reveal hierarchy: hero first, evidence second, interaction third.
- WebGL remains a low-contrast 3D field behind content; the Side Rays canvas adds the readable warm sunlight layer above it, with static fallbacks for reduced motion or unavailable capabilities.
- Audio is opt-in, low-gain and theme-aware; no autoplay.

## Color philosophy

Keep parchment, espresso and copper as the signature language. Vanta uses a muted copper network and the Side Rays layer uses two restrained copper-gold gradients. Dark mode changes opacity, blend and tint rather than turning the background into neon. SIGNAL // ORBIT keeps its existing Ember, Moon and Verdigris palettes.

## Layout and signature elements

Preserve the existing asymmetric editorial layout, orbital hero, timeline and canvas tree. Add only two fixed atmospheric layers: Vanta for deep mouse/touch-reactive 3D structure and Side Rays for sun shafts that fall through the hero/tree and fade across the rest of the page. Both layers have `pointer-events:none` so links, controls and the game canvas remain fully usable.

## Interaction and animation

Lenis uses native anchors, honors reduced motion, and protects the SIGNAL // ORBIT surface from scroll hijacking. GSAP ScrollTrigger follows Lenis' scroll event and ticker. Reveal animations use short, eased entrances; project cards receive a small depth shift; the hero artwork gains restrained scroll-linked drift. Side Rays uses a capped-DPR 2D canvas, a slow shimmer, cursor/touch lean and a brief pointer pulse. Vanta keeps its mouse/touch controls active without capturing page input.

## Typography and voice

Retain Playfair Display, DM Sans and Great Vibes. Motion copy stays concise and editorial: “Scroll the signal” and “Ambient field”.

## Implementation structure

- `motion-system.js`: Lenis, GSAP/ScrollTrigger, Vanta lifecycle and teardown orchestration.
- `side-rays.js`: vanilla canvas implementation of the requested Side Rays atmosphere with warm sunbeam colors, pointer lean, pulse, visibility pause and reduced-motion handling.
- `ambient-theme.js`: opt-in Web Audio ambient pads mapped to page and SIGNAL // ORBIT themes.
- `index.html`: vendor scripts, Vanta mount, Side Rays mount, ambient toggle and the knee-project accuracy correction.
- `styles.css`: both atmosphere layers, ambient control, reduced-motion and motion state styles.
- `app.js`: initialize and tear down the motion/audio systems and publish theme changes.

## External runtime dependencies

Use the official browser builds from Lenis, GSAP/ScrollTrigger, Three.js and Vanta. The Side Rays layer is deliberately local vanilla JavaScript so the static GitHub Pages backup does not need a React runtime. If an external asset fails, the portfolio continues with the existing particle canvas, native scrolling, local Side Rays fallback and CSS transitions.

## Official integration notes

Lenis' official README documents the browser build at `https://unpkg.com/lenis@1.3.27/dist/lenis.min.js`, recommends `new Lenis({ autoRaf: true })` or a custom RAF loop, enables anchor links with `anchors: true`, and honors `prefers-reduced-motion`. Its GSAP guidance forwards `lenis.on('scroll', ScrollTrigger.update)` and calls `lenis.raf(time * 1000)` from the GSAP ticker. Source: `https://github.com/darkroomengineering/lenis/blob/main/README.md`.

GSAP's official ScrollTrigger documentation at `https://gsap.com/docs/v3/Plugins/ScrollTrigger/` requires `gsap.registerPlugin(ScrollTrigger)`, documents `ScrollTrigger.refresh()` for recalculation, and provides `scrollerProxy()` for custom scrolling. This implementation uses Lenis' documented ticker integration and native page scrolling rather than a proxy.

Vanta's official README at `https://github.com/tengbao/vanta` documents the Three.js browser-build order, `mouseControls`/`touchControls`, `setOptions`, and `destroy()`. This implementation uses Vanta.NET with a low-opacity fallback layer and destroys the effect for reduced motion or teardown.

React Bits Side Rays documents the top-right origin, two-color fan, shimmer speed, spread, density, falloff, glow, cursor following and light-mode controls used as the visual reference for `side-rays.js`: `https://reactbits.dev/backgrounds/side-rays`.
