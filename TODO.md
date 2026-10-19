

## Desktop bloom and final TBT pass

- [x] Add a subtle low-resolution WebGL bloom pass only for fine-pointer desktop devices; share the singleton RAF scheduler, skip touch/reduced-motion devices, pause when the hero is offscreen, and preserve the existing tree/O hierarchy.
- [x] Further reduce TBT by keeping GSAP/Lenis/Vanta post-idle enhancements out of the initial critical path and retain native/reduced-motion fallbacks.
