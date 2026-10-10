// Public submission identifier issued by FormSubmit; not a mailbox or an archive/API key.
export const CONTACT_FORM_ID = '34a6882bde5af629dd7f3dc5bcc89331';
export const CONTACT_ENDPOINT = `https://formsubmit.co/ajax/${CONTACT_FORM_ID}`;

export function deliveryPayload({ name, email, message, _honey = '' }) {
  return {
    name: String(name || '').trim(),
    email: String(email || '').trim(),
    message: String(message || '').trim(),
    _replyto: String(email || '').trim(),
    _subject: 'New enquiry from my portfolio',
    _template: 'table',
    _honey: String(_honey || ''),
  };
}

export function interpretDelivery(result, httpOK = true) {
  if (/activat/i.test(String(result?.message || ''))) {
    return {
      ok: false,
      code: 'activation_required',
      message: 'Email delivery is awaiting owner activation. Your note has not been confirmed as sent. Please try again later. Your text is still here.',
    };
  }
  if (httpOK && (result?.success === true || result?.success === 'true')) {
    return {
      ok: true,
      code: 'provider_accepted',
      message: 'Your message was accepted by the email service. Thank you—I’ll reply to the email address you provided.',
    };
  }
  return {
    ok: false,
    code: 'delivery_failed',
    message: 'Email delivery could not be confirmed. Please try again later. Your text is still here.',
  };
}

export async function forwardContact(payload, fetcher = fetch, headers = {}) {
  const note = deliveryPayload(payload);
  if (!note.name || note.name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(note.email) || note.email.length > 240 || !note.message || note.message.length > 5000 || note._honey) {
    return { ok: false, code: 'invalid_fields', message: 'Please provide your name, a valid email and a message under 5,000 characters.' };
  }
  try {
    const response = await fetcher(CONTACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: JSON.stringify(note),
      signal: AbortSignal.timeout(20000),
    });
    return interpretDelivery(await response.json(), response.ok);
  } catch {
    return interpretDelivery(null, false);
  }
}
