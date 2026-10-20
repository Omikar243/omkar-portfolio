# Omkar V Shettigar — AI / ML Portfolio

A Modern Renaissance portfolio for **Omkar V Shettigar**, an AI Engineer, ML Engineer, and Data Scientist. The site turns resume evidence into an interactive case for building reliable intelligence systems: hybrid RAG, agentic classification, production ML, and sustainable-finance workflows.

## What’s inside

### Resume-grounded work

- **Catalysk — Data Scientist:** hybrid RAG and agentic classification systems for financial intelligence; a 4,535-sample golden parity harness; sustainability scoring accuracy improved by 85%; feature-pipeline runtime reduced from 2,160 seconds to 125 seconds; 17,500+ merchant entities indexed with Sentence-BERT and FAISS; Ollama reasoning, monitoring hooks, and a zero-drift CI/CD gate.
- **SM Khannukar Associates — ML Engineer Intern:** an LSTM/RNN stock-forecasting pipeline with 85% directional accuracy across a 30-day backtest, plus automated Yahoo Finance ingestion that reduced preprocessing time by 40%.
- **[Ancient Modern Apparel — live website](https://ancient-modern-apparel-six.vercel.app/):** a full-stack fashion-tech platform combining AI-generated four-view avatars, real-time Three.js garment previews, personalized catalog flows, and cart experiences using Next.js, FastAPI, Drizzle, Turso, and Supabase.
- **[Knee Osteoarthritis Detection — GitHub](https://github.com/Ramachandra-2k96/Kneeosteoarthritits):** ~90% accuracy on 5-grade knee osteoarthritis classification from X-rays, paired with a literature-grounded LLaMA-3 RAG assistant using PyTorch, CLAHE, LangChain, and Groq.

## Interactive features

- Renaissance-inspired responsive layout with beige, brown, and gold visual language.
- Light/dark theme toggle, particle field, scroll progress, cursor glow, and a crumbling-ball loading animation.
- Scroll-triggered experience timeline with expandable chapters for Catalysk, the internship, and education.
- Personal first-person About story covering identity, projects and ambition, alongside the supplied real portrait (optimized WebP, full frame retained, lazy loading and light/dark editorial framing).
- Downloadable original resume PDF.
- Quiet owner-only resume-download email alerts with first-landing source/referrer, campaign tags, UTC time, device category and country when available; no public activity feed or exposed recipient address.
- Included Vercel Hobby pageview analytics, visible only in the signed-in project dashboard. Historical sources are unavailable because tracking was previously disabled; paid custom download events are not enabled.
- Contact form forwarding to my inbox using FormSubmit, with visitor Reply-To, activation-aware feedback and preservation of typed messages on delivery failure. Owner activation and received-inbox verification are complete.
- **SIGNAL // ORBIT:** optional Canvas physics arcade with keyboard/mouse/touch steering, moving hazards, collection combos, evolving orbital paths, a 90-second window, three lives, local best score, pause/restart and explicit opt-in sound. From level 2 onward, a bounded transparent WebGL field, reactive rings/beams and denser particle bursts respond to the player and selected palette without changing the physics layer.
- Native anchor scrolling with GSAP Core + ScrollTrigger reveal/parallax choreography on desktop, a low-contrast lazy-loaded Vanta interactive network only for fine-pointer desktop devices, and a React Bits Side Rays–style sunbeam layer that falls across the tree and page with deterministic water-like drift at 60 FPS on desktop and a bounded mobile fallback. Touch devices use native scrolling and never initialize Lenis or Vanta.
- All canvas systems share one singleton frame scheduler: page particles, Side Rays, the fractal tree and SIGNAL // ORBIT subscribe to one requestAnimationFrame pump. Device tiers cap mobile work at 30 FPS, 1.5× pixel density, lower tree depth and lower particle counts while preserving the precise O interaction.
- Desktop fine-pointer sessions receive a subtle low-resolution WebGL bloom pass over the hero only after the browser is idle. It shares the same scheduler, pauses when the hero is offscreen, and is excluded from touch and reduced-motion sessions so it does not compete with first paint or mobile interaction.
- The desktop bloom has a live **desktop bloom** panel with an on/off switch and intensity slider. Its setting persists locally, and when the opt-in ambient soundscape is active the existing analyser gently modulates the glow instead of creating another audio graph.
- SIGNAL // ORBIT owns native interaction only inside its canvas shell. The surrounding heading, HUD and controls remain part of the page scroll, preventing Lenis/native-scroll handoff stutter while preserving touch input on the game surface.
- An explicit ambient theme-sound toggle with quiet procedural soundscapes that crossfade across page sections, website light/dark modes and SIGNAL // ORBIT Ember, Moon and Verdigris palettes; audio never autoplays. Opt-in interface chimes reuse the same filtered sound field.
- A cinematic depth stage inspired by high-end Three UI experiences: the precise tree/O remains central while pointer light, parallax rings, draggable orbit objects, reactive particles, scroll scene states and interactive 3D project-card tilt add depth without a second WebGL renderer. SIGNAL // ORBIT keeps its mechanics and gains the same perspective-light treatment.

### Living fractal tree

The hero artwork uses a single Canvas 2D renderer and fixed connected Bézier graph. The trunk splits into two limbs that form an organic O and rejoin below the canopy—there is no separate glyph or ring overlay. Use the header or **Dark canvas / Light canvas** control to switch both the artwork palette and site theme. Tap anywhere on the artwork to morph across five configurations; shared junctions, controls and stroke widths interpolate with quintic easing and staggered twig motion. Interrupted morphs retarget the exact interpolated geometry; orbit phases never reset on a tap. Trusted signature taps give an 8ms haptic cue where supported. The separate **Leaves off / Leaves on** control enables a soft procedural wind-through-leaves rustle: one cached mono noise texture, high-/low-pass filters and a smooth 0.72–0.94 second gust envelope, subtly varied per signature. There are no pitched tones; overlapping gusts fade with a two-voice ceiling; sound is muted initially, theme changes are silent, fast repeated taps are throttled and unsupported feedback never blocks the artwork. iOS haptics may be unavailable. The renderer pauses offscreen/hidden, respects live reduced-motion changes, and caps mobile rendering at 30 FPS with a 1.5 pixel-ratio ceiling.

Run the repeatable geometry tests with `node tests/tree-geometry.test.js`. Real-touch Chromium mobile checks are in `tests/mobile-tree.test.py` (Python Playwright and Chromium required): `python3 tests/mobile-tree.test.py`. This verifies all five forms, rapid retargets, coordinated themes, reduced-motion repaint, persistence, low-power budgets and that only SIGNAL // ORBIT remains.

The artwork uses a **transparent, synchronized canvas**, allowing the single page-wide ray field and theme surface to continue through the tree without a rectangular compositing boundary. Paper texture uses sparse CSS specks rather than an SVG turbulence filter. Context-restoration handlers repaint the active theme. Signature changes add a restrained brightness wave along the existing trunk and canopy, with a small status-dot pulse; reduced-motion mode skips both. The About layout balances the full-frame portrait, compact **Omkar** caption and personal story at phone, tablet and desktop widths.

Run `python3 tests/live-portfolio.test.py https://omkar-v-shettigar.vercel.app/` for transparent light/dark pixel checks, all five touch/haptic requests, leaf-rustle PCM graph evidence, portrait/caption bounds, actual external project-button popups and original resume download. These are mobile-emulated browser checks, not validation of a physical phone’s GPU, loudspeaker or vibration actuator.

## Run locally

```bash
npm start
```

The server listens on `0.0.0.0:3000` by default. Override the port with `PORT=3000 npm start`.

## Backend API

- `GET api/health` — readiness check.
- `POST api/resume-event` — bounds/sanitizes anonymous download attribution, writes to private Vercel runtime logs, and returns only coarse country context. No public event-history endpoint exists. Logs are not durable storage; see [private alerts](resume-alerts.md) for limitations and the owner inbox record.
- `POST api/contact` — accepts `{ "name": "…", "email": "…", "message": "…" }`, validates the payload, and forwards through FormSubmit. A failed or activation-required provider response is never shown as successful delivery. The website calls the provider directly from the browser so contact also works on the static Pages backup; server-side forwarding can be rejected by provider anti-abuse rules. No new messages are saved to ephemeral local files. See [contact setup](contact-setup.md) for the owner activation requirement.
- `GET Omkar_Shettigar_Resume.pdf` — downloads the original resume with PDF content and attachment headers.

## Project structure

```text
index.html                         Portfolio page and resume-grounded copy
styles.css                         Renaissance design system and responsive layout
app.js                             Portfolio interaction and module lifecycle
motion-system.js                   Lenis, GSAP/ScrollTrigger and Vanta lifecycle
side-rays.js                       Cursor-leaning warm Side Rays canvas atmosphere
frame-scheduler.js                 Shared RAF pump and mobile/desktop quality tiers
desktop-bloom.js                   Deferred desktop-only WebGL hero bloom pass
research-cinematic-refresh.md      Walkthrough diagnosis and reference research
ambient-theme.js                   Opt-in theme-and-section-aware ambient Web Audio
cinematic-stage.js                 Pointer light, draggable depth objects and 3D card tilt
contact-delivery.js                Shared forwarding payload and response interpretation
resume-tracking.js                 Silent download alerts and free pageview integration
resume-attribution.js              Privacy-limited attribution normalization
resume-alerts.md                   Owner-only notification and traffic-reporting guide
orbit-game.js                      Canvas arcade rendering/input/UI/lifecycle
orbit-physics.js                   Testable delta-time physics, score and state
public/portrait-450.webp / -600.webp Proportional mobile portrait sources
orbit-game.css                     Responsive espresso-and-gold game styling
fractal-tree.js                    Canvas timeline, input handling and lifecycle
tree-geometry.js                   Fixed connected graph and parameter interpolation
tests/tree-geometry.test.js        Connectivity, morph continuity and retargeting tests
server.mjs                         Static server plus contact API
public/portrait.webp               Supplied portrait, optimized without cropping
public/Omkar_Shettigar_Resume.pdf  Original downloadable resume
vercel.json                        Vercel Node runtime and route configuration
.github/workflows/pages.yml        GitHub Pages deployment workflow
manus-routes.json                  Managed Webdev route declaration
```

## Deployment

### Vercel

`vercel.json` configures the Node server as the Vercel runtime so the full experience, including `api/contact`, can be deployed together. Connect the repository to Vercel and set the project’s custom domain in the Vercel Domains panel.

### GitHub Pages

The included `pages.yml` workflow publishes the browser-only portfolio from `main` through GitHub Pages. GitHub Pages cannot execute Node or `api/contact`, so the contact form uses FormSubmit directly from the browser on both hosts, after owner activation. The workflow assembles only browser assets, excluding backend files, secrets and local enquiry data. The relative asset paths keep the visual portfolio and resume download working under the project-site path.

## Contact activation and checks

Activation completed on 10 October 2026. The owner confirmed receiving the live form test, and its visitor Reply-To payload was verified. The recipient mailbox is managed privately by the forwarding provider. Current source uses the provider-issued anonymous submission identifier, not an email address; the original resume is an intentional public-email exception. Older Git commits are not rewritten. For a fresh deployment or recipient change, open the FormSubmit activation email sent during setup, click **Activate Form**, then send a clearly labelled test from the website. Confirm receipt in the inbox or Spam and check that Reply addresses the visitor. Provider acceptance is not a guarantee of inbox placement.

```bash
node tests/contact-delivery.test.js
node tests/resume-attribution.test.js
node tests/tree-geometry.test.js
node --test tests/orbit-physics.test.js
# Optional real-touch and timeline-style browser checks:
python3 tests/feedback-timeline.test.py
python3 tests/mobile-tree.test.py
python3 tests/leaves-about.test.py
python3 tests/live-portfolio.test.py
python3 tests/resume-download.test.py
```

Browser tests use real Chromium touchscreen events in mobile emulation. The vibration API is instrumented to verify 8ms requests for each signature; tests cannot confirm physical actuator sensation. Unsupported vibration and reduced-motion fallbacks are tested.

## Personalization

The visible copy lives in `index.html`. Interactions live in `app.js`, while the palette, type system, responsive breakpoints, timeline controls, playground panels, and game states live in `styles.css`. Replace the PDF in `public/` only when a newer resume should become the download source.
