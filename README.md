# Omkar V Shettigar — AI / ML Portfolio

A Modern Renaissance portfolio for **Omkar V Shettigar**, an AI Engineer, ML Engineer, and Data Scientist. The site turns resume evidence into an interactive case for building reliable intelligence systems: hybrid RAG, agentic classification, production ML, and sustainable-finance workflows.

## What’s inside

### Resume-grounded work

- **Catalysk — Data Scientist:** hybrid RAG and agentic classification systems for financial intelligence; a 4,535-sample golden parity harness; sustainability scoring accuracy improved by 85%; feature-pipeline runtime reduced from 2,160 seconds to 125 seconds; 17,500+ merchant entities indexed with Sentence-BERT and FAISS; Ollama reasoning, monitoring hooks, and a zero-drift CI/CD gate.
- **SM Khannukar Associates — ML Engineer Intern:** an LSTM/RNN stock-forecasting pipeline with 85% directional accuracy across a 30-day backtest, plus automated Yahoo Finance ingestion that reduced preprocessing time by 40%.
- **Ancient Modern Apparel:** a full-stack fashion-tech platform combining AI-generated four-view avatars, real-time Three.js garment previews, personalized catalog flows, and cart experiences using Next.js, FastAPI, Drizzle, Turso, and Supabase.
- **Knee Osteoarthritis Detection:** a Compact Vision Net reaching 90% accuracy across 13 X-ray classes, paired with a literature-grounded LLaMA-3 RAG assistant using PyTorch, CLAHE, LangChain, and Groq.

## Interactive features

- Renaissance-inspired responsive layout with beige, brown, and gold visual language.
- Light/dark theme toggle, particle field, scroll progress, cursor glow, and a crumbling-ball loading animation.
- Scroll-triggered experience timeline with expandable chapters for Catalysk, the internship, and education.
- **Model Playground:** tune rules certainty, retrieval match, and LLM confidence to see the next decision route and confidence meter update live.
- **Merchant Match:** a three-round P2P/P2M classification game based on transaction narration routing.
- Downloadable original resume PDF.
- Contact form forwarding to my inbox using FormSubmit, with visitor Reply-To, activation-aware feedback and preservation of typed messages on delivery failure. Owner activation is required.
- **SIGNAL // ORBIT:** optional Canvas physics arcade with keyboard/mouse/touch steering, moving hazards, collection combos, evolving orbital paths, a 90-second window, three lives, local best score, pause/restart and explicit opt-in sound.

### Living fractal tree

The hero artwork uses a single Canvas 2D renderer and fixed connected Bézier graph. The trunk splits into two limbs that form an organic O and rejoin below the canopy—there is no separate glyph or ring overlay. Tap anywhere on the artwork to morph across five configurations; shared junctions, controls and stroke widths interpolate with quintic easing and staggered twig motion. Interrupted morphs retarget the exact interpolated geometry; orbit phases never reset on a tap. The renderer pauses offscreen/hidden, respects live reduced-motion changes, and caps mobile rendering at 30 FPS with a 1.5 pixel-ratio ceiling.

Run the repeatable geometry tests with `node tests/tree-geometry.test.js`.

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

The recipient is `omikar243@gmail.com`. Open the FormSubmit activation email sent during setup, click **Activate Form**, then send a clearly labelled test from the website. Confirm receipt in the inbox or Spam and check that Reply addresses the visitor. Provider acceptance is not a guarantee of inbox placement.

```bash
node tests/contact-delivery.test.js
node tests/tree-geometry.test.js
node --test tests/orbit-physics.test.js
```

## Personalization

The visible copy lives in `index.html`. Interactions live in `app.js`, while the palette, type system, responsive breakpoints, timeline controls, playground panels, and game states live in `styles.css`. Replace the PDF in `public/` only when a newer resume should become the download source.
