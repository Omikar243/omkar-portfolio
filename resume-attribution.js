// No visitor identity or recipient mailbox is embedded here.
export const ALERT_COOLDOWN_MS = 30000;

export function safeCampaign(value) {
  const text = String(value || '').trim();
  if (text.includes('@') || text.includes('://')) return '';
  return text.replace(/[^a-zA-Z0-9 ._-]/g, '').slice(0, 64);
}

export function referrerHost(value, currentHost = '') {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === currentHost.toLowerCase() ? '' : host.slice(0, 180);
  } catch { return ''; }
}

export function arrivalAttribution(url, referrer, device = 'desktop') {
  const page = new URL(url);
  const campaign = Object.fromEntries(['source', 'medium', 'campaign'].map((key) => [
    key, safeCampaign(page.searchParams.get(`utm_${key}`)),
  ]));
  const referrerHostname = referrerHost(referrer, page.hostname);
  return {
    source: campaign.source || referrerHostname || 'direct / unknown',
    medium: campaign.medium,
    campaign: campaign.campaign,
    referrerHostname,
    device: ['mobile', 'tablet', 'desktop'].includes(device) ? device : 'unknown',
  };
}

export function normalizeResumeEvent(value = {}) {
  const eventId = String(value.eventId || '');
  if (!/^[a-zA-Z0-9-]{12,64}$/.test(eventId)) throw new Error('Invalid event identifier');
  const time = new Date(value.time);
  if (!Number.isFinite(time.getTime())) throw new Error('Invalid event time');
  // Re-normalize untrusted client fields before logging or emailing them.
  const hostname = String(value.referrerHostname || '').toLowerCase();
  const referrerHostname = /^[a-z0-9.-]{1,180}$/.test(hostname) ? hostname : '';
  const source = value.source === 'direct / unknown' ? value.source : safeCampaign(value.source) || 'direct / unknown';
  return {
    eventId, time: time.toISOString(), source, referrerHostname,
    medium: safeCampaign(value.medium), campaign: safeCampaign(value.campaign),
    device: ['mobile', 'tablet', 'desktop'].includes(value.device) ? value.device : 'unknown',
    host: /^[a-z0-9.-]{1,180}$/.test(String(value.host || '')) ? String(value.host) : 'unknown',
  };
}

export function countryFromHeaders(headers = {}) {
  const country = String(headers['x-vercel-ip-country'] || '').toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : 'unknown';
}

export function notificationPayload(event, country = 'unknown') {
  const data = normalizeResumeEvent(event);
  const safeCountry = /^[A-Z]{2}$/.test(country) ? country : 'unknown';
  return {
    name: 'Portfolio resume download',
    _subject: `Resume download — ${data.source}`,
    _template: 'table',
    message: 'The original resume PDF was fetched successfully and a browser save was initiated. This does not confirm that the visitor saved or read the file.',
    'UTC time': data.time,
    'Traffic source': data.source,
    'Referrer hostname': data.referrerHostname || 'Not available',
    'UTM medium': data.medium || 'Not supplied',
    'UTM campaign': data.campaign || 'Not supplied',
    'Device category': data.device,
    'Approximate country': safeCountry,
    'Portfolio hostname': data.host,
    'Event ID': data.eventId,
  };
}
