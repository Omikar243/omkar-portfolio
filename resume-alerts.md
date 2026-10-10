# Private resume-download alerts

Resume button downloads fetch the exact original PDF, initiate the browser save, and then send an owner-only email through the already activated anonymous FormSubmit endpoint. The visitor sees no notification, feed or public analytics. No recipient email is embedded in source. The alert contains UTC time, first-landing referrer hostname, sanitized UTM source/medium/campaign, device category and approximate country when Vercel supplies it. It cannot identify a visitor or prove the PDF was saved or read.

Events are written only to internal Vercel runtime logs; there is no HTTP endpoint to retrieve download activity. Delivery is best-effort: provider acceptance is not confirmation of inbox placement. The original download remains available if telemetry or email fails. A 30-second per-tab cooldown persists across reloads when storage is available; Vercel origin/rate rejections and duplicate event IDs suppress forwarding. Safari/iOS keeps its original trusted native resume-anchor action and performs a separate PDF verification before attempting a private alert; no asynchronous blob save is forced there. Direct PDF links, modified/right clicks, scripting blockers, privacy signals and failed Vercel gates may also bypass these alerts. GitHub Pages can send the same anonymous email alert, but has no backend country data or Vercel logs. No raw IP, name, visitor email, full referrer URL, arbitrary query values or cross-site visitor ID is included by the application.

## Your private traffic dashboard

Open the project’s **Analytics** tab in your signed-in Vercel account. Web Analytics on the included Hobby plan is enabled; pageview reporting starts after the tracking script is deployed. Use **Referrers**, **Countries**, **Devices**, **Browsers** and **Hostnames**. The dashboard is private to authorized Vercel project members, not website visitors.

Custom download events and UTM dashboard analysis are not included on Hobby. Download-specific sources and campaign tags are included in your inbox alerts instead, without buying a Pro upgrade. To summarize downloads, filter your inbox for subjects beginning **Resume download**. Internal request logs are short-lived and must not be treated as a durable database; retained email alerts provide the owner’s record, subject to provider/inbox delivery and retention.

Analytics was disabled when inspected on 10 October 2026. The initial dashboard showed demo data, not real traffic. Historic visitor/download sources cannot be reconstructed from this new setup. Setup visits and labelled tests can appear in future analytics; do not treat them as prospective-employer traffic.

## Campaign links

Share a labelled link such as:

```text
https://omkar-v-shettigar.vercel.app/?utm_source=linkedin&utm_medium=profile&utm_campaign=ai-portfolio
```

Use meaningful non-personal source tags. When a browser suppresses referrers and no campaign tag is supplied, the honest attribution is **direct / unknown**, not a guessed social network. Country is coarse network-derived information, not GPS or verified physical location.

## Phone notifications and SMS

Enable notifications for the owner's existing mail app to receive these email alerts on the phone. No SMS provider or phone number is configured. SMS would require separate credentials, a verified destination and provider terms/charges; no paid account or upgrade has been created.

## Verified sources

- [Vercel plain HTML quickstart](https://vercel.com/docs/analytics/quickstart)
- [Hobby limits and custom-event availability](https://vercel.com/docs/analytics/limits-and-pricing)
- [FormSubmit anonymous endpoint and additional field support](https://formsubmit.co/documentation)

## Implementation and coverage

`resume-attribution.js` owns bounded, pure normalization of first-landing tags and notification fields. `resume-tracking.js` intercepts ordinary trusted clicks on the existing download anchor, validates a successful original PDF response, initiates a byte-preserving save, and then runs optional private telemetry asynchronously. The anonymous FormSubmit transport keeps the owner’s mailbox out of browser code; no CC, visitor autoresponse or visitor Reply-To is added for a download alert. The Vercel backend receives only bounded anonymous fields and writes internal logs; all event-history GET routes are absent. The Pages backup loads the same browser modules, while Vercel includes them explicitly in its function bundle.

Mocked browser coverage includes accepted email transport, provider failure, failed PDF enhancement with native-download fallback, native Safari-path verification, Do Not Track, Global Privacy Control, rejected server decisions, blocked storage, duplicate throttling, original PDF byte equality and absence of public toasts. Event fields are browser-reported and must not be treated as verified identity or tamper-proof audit data. The endpoint’s origin check and per-instance limits reduce casual misuse but are not authentication or a globally durable deduplication mechanism.
