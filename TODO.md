

## Typography and pacing pass

- [x] Strengthen editorial hierarchy with larger headline contrast, restrained gold emphasis, calmer supporting copy and clearer section-label rhythm.
- [x] Refactor project cards into one scroll beat each: visual first, then title, evidence, stack and action.
- [x] Decouple SIGNAL // ORBIT canvas rendering from per-frame DOM/UI writes so smooth scrolling does not contend with the game loop.
- [x] Make pointer interaction more visible through a moving spotlight, conic light shafts, translated depth ring and stronger card/canvas response.
- [x] Remove the remaining article-wide scroll boundary, allow vertical pan through the canvas, suspend playground tilt while scrolling, and lazy-boot the game near its viewport boundary.
- [x] Add a throttled opt-in spotlight sound cue through the existing ambient audio graph.
- [x] Run mobile Chromium emulation and a deployed Lighthouse audit; a physical handset test remains a hardware limitation of this environment.
