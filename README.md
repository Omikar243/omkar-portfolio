# Omkar V Shettigar — AI / ML Portfolio

A Modern Renaissance portfolio for **Omkar V Shettigar**, an AI Engineer, ML Engineer, and Data Scientist. The site turns resume evidence into an interactive case for building reliable intelligence systems: hybrid RAG, agentic classification, production ML, and sustainable-finance workflows.

## What’s inside

### Resume-grounded work

- **Catalysk — Data Scientist:** hybrid RAG and agentic classification systems for financial intelligence; a 4,535-sample golden parity harness; sustainability scoring accuracy improved by 85%; feature-pipeline runtime reduced from 2,160 seconds to 125 seconds; 17,500+ merchant entities indexed with Sentence-BERT and FAISS; Ollama reasoning, monitoring hooks, and a zero-drift CI/CD gate.
- **SM Khannukar Associates — ML Engineer Intern:** an LSTM/RNN stock-forecasting pipeline with 85% directional accuracy across a 30-day backtest, plus automated Yahoo Finance ingestion that reduced preprocessing time by 40%.
- **[Ancient Modern Apparel — live website](https://ancient-modern-apparel-six.vercel.app/):** a full-stack fashion-tech platform combining AI-generated four-view avatars, real-time Three.js garment previews, personalized catalog flows, and cart experiences using Next.js, FastAPI, Drizzle, Turso, and Supabase.
- **[Knee Osteoarthritis Detection — GitHub](https://github.com/Ramachandra-2k96/Kneeosteoarthritits):** a Compact Vision Net reaching 90% accuracy across 13 X-ray classes, paired with a literature-grounded LLaMA-3 RAG assistant using PyTorch, CLAHE, LangChain, and Groq.

## Interactive features

- Renaissance-inspired responsive layout with beige, brown, and gold visual language.
- Light/dark theme toggle, particle field, scroll progress, cursor glow, and a crumbling-ball loading animation.
- Scroll-triggered experience timeline with expandable chapters for Catalysk, the internship, and education.
- Personal first-person About story covering identity, projects and ambition, alongside the supplied real portrait (optimized WebP, full frame retained, lazy loading and light/dark editorial framing).
- Downloadable original resume PDF.
- Contact form forwarding to my inbox using FormSubmit, with visitor Reply-To, activation-aware feedback and preservation of typed messages on delivery failure. Owner activation and received-inbox verification are complete.
- **SIGNAL // ORBIT:** optional Canvas physics arcade with keyboard/mouse/touch steering, moving hazards, collection combos, evolving orbital paths, a 90-second window, three lives, local best score, pause/restart and explicit opt-in sound.

### Living fractal tree

The hero artwork uses a single Canvas 2D renderer and fixed connected Bézier graph. The trunk splits into two limbs that form an organic O and rejoin below the canopy—there is no separate glyph or ring overlay. Use the header or **Dark canvas / Light canvas** control to switch both the artwork palette and site theme. Tap anywhere on the artwork to morph across five configurations; shared junctions, controls and stroke widths interpolate with quintic easing and staggered twig motion. Interrupted morphs retarget the exact interpolated geometry; orbit phases never reset on a tap. Trusted signature taps give an 8ms haptic cue where supported. The separate **Leaves off / Leaves on** control enables a soft procedural wind-through-leaves rustle: one cached mono noise texture, high-/low-pass filters and a smooth 0.72–0.94 second gust envelope, subtly varied per signature. There are no pitched tones; overlapping gusts fade with a two-voice ceiling; sound is muted initially, theme changes are silent, fast repeated taps are throttled and unsupported feedback never blocks the artwork. iOS haptics may be unavailable. The renderer pauses offscreen/hidden, respects live reduced-motion changes, and caps mobile rendering at 30 FPS with a 1.5 pixel-ratio ceiling.

Run the repeatable geometry tests with `node tests/tree-geometry.test.js`. Real-touch Chromium mobile checks are in `tests/mobile-tree.test.py` (Python Playwright and Chromium required): `python3 tests/mobile-tree.test.py`. This verifies all five forms, rapid retargets, coordinated themes, reduced-motion repaint, persistence, low-power budgets and that only SIGNAL // ORBIT remains.

## Run locally

```bash
npm start
```

The server listens on `0.0.0.0:3000` by default. Override the port with `PORT=3000 npm start`.

## Backend API

- `GET api/health` — readiness check.
- `POST api/contact` — accepts `{ "name": "…", "email": "…", "message": "…" }`, validates the payload, and forwards through FormSubmit. A failed or activation-required provider response is never shown as successful delivery. The website calls the provider directly from the browser so contact also works on the static Pages backup; server-side forwarding can be rejected by provider anti-abuse rules. No new messages are saved to ephemeral local files. See [contact setup](contact-setup.md) for the owner activation requirement.
- `GET Omkar_Shettigar_Resume.pdf` — downloads the original resume with PDF content and attachment headers.

## Project structure

```text
index.html                         Portfolio page and resume-grounded copy
styles.css                         Renaissance design system and responsive layout
app.js                             Portfolio interaction and module lifecycle
contact-delivery.js                Shared forwarding payload and response interpretation
orbit-game.js                      Canvas arcade rendering/input/UI/lifecycle
orbit-physics.js                   Testable delta-time physics, score and state
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
node tests/tree-geometry.test.js
node --test tests/orbit-physics.test.js
# Optional real-touch and timeline-style browser checks:
python3 tests/feedback-timeline.test.py
python3 tests/mobile-tree.test.py
python3 tests/leaves-about.test.py
```

Browser tests use real Chromium touchscreen events in mobile emulation. The vibration API is instrumented to verify 8ms requests for each signature; tests cannot confirm physical actuator sensation. Unsupported vibration and reduced-motion fallbacks are tested.

## Personalization

The visible copy lives in `index.html`. Interactions live in `app.js`, while the palette, type system, responsive breakpoints, timeline controls, playground panels, and game states live in `styles.css`. Replace the PDF in `public/` only when a newer resume should become the download source.
