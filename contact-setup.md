# Contact delivery setup

Enquiries are intended for the owner’s inbox, the address already displayed on the portfolio. FormSubmit requires owner activation before forwarding submissions. A browser setup request returned `success: "false"` and an activation-required message on 10 October 2026; this is not evidence of inbox delivery. The owner must open the FormSubmit activation email and click its link.

The browser calls FormSubmit's cross-origin AJAX endpoint so the same contact form works on Vercel and GitHub Pages. `contact-delivery.js` sends the visitor's name, email, message, `_replyto`, fixed subject and template. No autoresponder is configured. reCAPTCHA is not disabled; the honeypot field supplements provider spam controls.

The Node `/api/contact` endpoint also uses forwarding instead of an ephemeral file. It never returns successful local-file acceptance. If its server-to-provider request is blocked, it returns an honest delivery error; the website's direct browser request remains the intended path.

Provider acceptance is distinct from confirmed inbox arrival. After activation, submit a clearly labelled test and check the owner inbox (and Spam). Reply should address the visitor email. Existing notes saved by the old endpoint are not automatically recovered by the new provider. One old local note was recovered for the owner during this fix; its contents are not included in Git or this public document.

Official references: [FormSubmit documentation](https://formsubmit.co/documentation), [AJAX documentation](https://formsubmit.co/ajax-documentation). Documentation says `_replyto` sets the reply recipient; submissions are retained by FormSubmit for 30 days and archive access is rate-limited.

## Verified activation

On 10 October 2026 the owner activated forwarding to the owner’s inbox. A test submitted through the real production form returned HTTP 200 and `success: "true"`; the owner subsequently confirmed **Received**. Visitor Reply-To was verified in the submitted payload. This is the recorded end-to-end confirmation, not just provider acceptance.
