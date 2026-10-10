import assert from 'node:assert/strict';
import { deliveryPayload, interpretDelivery, forwardContact, CONTACT_FORM_ID, CONTACT_ENDPOINT } from '../contact-delivery.js';

assert.match(CONTACT_FORM_ID, /^[a-f0-9]{32}$/);
assert.equal(CONTACT_ENDPOINT.includes('@'), false);

const note = { name: 'A visitor', email: 'visitor@example.com', message: 'Hello, let us discuss a project.' };
const payload = deliveryPayload(note);
assert.equal(payload._replyto, note.email);
assert.equal(payload.message, note.message);
assert.equal(payload._template, 'table');
assert.equal(interpretDelivery({ success: 'false', message: 'This form needs Activation.' }).code, 'activation_required');
assert.equal(interpretDelivery({ success: 'false', message: 'Rejected' }).ok, false);
assert.equal(interpretDelivery({ success: 'true' }, false).ok, false);
assert.equal(interpretDelivery({ success: 'true' }).ok, true);
assert.equal(interpretDelivery({ success: true }).code, 'provider_accepted');
assert.equal(interpretDelivery({ success: true, message: 'Activation required' }).ok, false);
assert.equal(interpretDelivery({}).ok, false);
let sent;
const accepted = await forwardContact(note, async (url, request) => {
  sent = { url, body: JSON.parse(request.body) };
  return { ok: true, json: async () => ({ success: 'true' }) };
});
assert.equal(accepted.ok, true);
assert.equal(sent.body._replyto, note.email);
assert.match(sent.url, /formsubmit.co\/ajax\//);
const transport = await forwardContact(note, async () => { throw new Error('network failure'); });
assert.equal(transport.ok, false);
assert.match(transport.message, /try again later/);
console.log('PASS: activation is not success; provider acceptance, rejection, transport failure and Reply-To are handled correctly. No real emails sent by this test.');
