# Cinematic refresh research

## Supplied walkthrough

The uploaded walkthrough analysis identified the most visible defect around 00:06–00:09: scrolling near SIGNAL // ORBIT bounces between the lab heading and the game controls. The likely cause in the current implementation was Lenis preventing smooth scrolling for the entire `[data-orbit-game]` article, then handing control back when the pointer leaves. The fix narrows prevention to the actual canvas shell and leaves the heading, HUD and controls in the normal page scroll flow.

The walkthrough also showed an abrupt lab-to-toolkit transition and dense toolkit copy. The refresh adds a chapter separator, more vertical breathing room and keeps reveal choreography restrained rather than forcing snap-scroll.

## Reference patterns

- [Lando Norris](https://landonorris.com/) uses a strong authored “vertical drive” metaphor, clear chapter navigation (On Track / Off Track), controlled text progression and media-led section beats. The transferable lesson is to make each section feel like a deliberate chapter with one dominant action.
- [Google Antigravity](https://antigravity.google/) uses a single clear hero promise, a focused primary action, product chapters and intentional motion around the story rather than decorative motion everywhere. The transferable lesson is to give scroll a narrative job and keep interaction hierarchy obvious.
- [Codrops scroll-driven 3D case study](https://tympanus.net/codrops/2026/04/28/more-than-a-portfolio-building-a-scroll-driven-3d-world-with-something-to-say/) describes mapping scroll progression to camera/object/reveal timing, unifying input handling, using low-resolution shaders on mobile, and culling expensive work outside the viewport. These principles guide the current no-snap, section-aware enhancement.

## Implemented direction

Keep the fractal tree/O as the authored identity. Improve the experience through stable scroll ownership, chapter spacing, restrained section choreography, desktop-only WebGL bloom with a live control panel, and ambient analyser-driven bloom modulation. Touch and reduced-motion paths remain native and lightweight.
