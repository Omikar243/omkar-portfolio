# Omkar V Shettigar Portfolio

A responsive, single-page portfolio for an AI Engineer, ML Engineer and Data Scientist.

## Run

```bash
npm start
```

The site listens on port `3000` by default and serves the static portfolio from the project root.

## Live features

The resume download uses the original `public/Omkar_Shettigar_Resume.pdf` file. The contact form POSTs JSON to `/api/contact`; the server validates the payload and records accepted notes in a server-side NDJSON log without exposing the data directory publicly. `/api/health` reports backend readiness.

The model playground combines three live confidence controls into a decision route. The Merchant Match mini demo is a three-round P2P/P2M classification game based on the narration-routing work described in the resume.

## Personalization

Resume-based copy is in `index.html`. Theme, responsive layout, particles, loading, timeline reveals, timeline chapter controls, model playground, game demo, navigation, case-study toast feedback, and API form submission are in `app.js` and `styles.css`.
