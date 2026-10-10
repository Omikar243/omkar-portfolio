import { CONTACT_ENDPOINT, interpretDelivery } from './contact-delivery.js';
import { ALERT_COOLDOWN_MS, arrivalAttribution, normalizeResumeEvent, notificationPayload } from './resume-attribution.js';

const VERCEL_HOSTS = new Set(['omkar-v-shettigar.vercel.app', 'omkar-portfolio-murex-seven.vercel.app']);
const privacyRequested = () => navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
const deviceCategory = () => /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet'
  : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

function firstArrival() {
  const current = arrivalAttribution(location.href, document.referrer, deviceCategory());
  try {
    const saved = JSON.parse(sessionStorage.getItem('portfolio-arrival-v1') || 'null');
    // Never reuse arbitrary stored fields; retain only bounded attribution strings.
    if (saved && typeof saved.source === 'string') {
      const normalized = normalizeResumeEvent({ ...saved, eventId: 'arrival-normalize', time: new Date().toISOString() });
      return { ...current, source: normalized.source, referrerHostname: normalized.referrerHostname,
        medium: normalized.medium, campaign: normalized.campaign };
    }
    sessionStorage.setItem('portfolio-arrival-v1', JSON.stringify(current));
  } catch { /* Storage is optional; no cookie or cross-site visitor identifier. */ }
  return current;
}

export function initResumeTracking() {
  if (privacyRequested()) return () => {};
  // Safari can silently reject asynchronously initiated blob saves. Preserve
  // its original trusted anchor action rather than claiming a tracked save.
  const safari = /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|Android/i.test(navigator.userAgent);
  const iOS = /iPad|iPhone|iPod/i.test(navigator.userAgent)
    || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  if (safari || iOS) return () => {};
  const attribution = firstArrival();
  const abort = new AbortController();
  let busy = false;
  let lastAlert = 0;
  try { lastAlert = Number(sessionStorage.getItem('portfolio-last-resume-alert') || 0); } catch { /* optional */ }
  let disposed = false;

  async function alertOwner(event) {
    const now = Date.now();
    if (disposed || privacyRequested() || now - lastAlert < ALERT_COOLDOWN_MS) return;
    lastAlert = now;
    try { sessionStorage.setItem('portfolio-last-resume-alert', String(now)); } catch { /* optional */ }
    let country = 'unknown';
    // Internal request logs are available only in the signed-in Vercel dashboard.
    // On Pages the same anonymous provider alert works, without a Node backend.
    if (VERCEL_HOSTS.has(location.hostname) || location.hostname === '127.0.0.1' || location.hostname === 'localhost') {
      try {
        const response = await fetch(new URL('api/resume-event', document.baseURI), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event), signal: AbortSignal.timeout(5000), keepalive: true,
        });
        // Never bypass an origin/rate rejection or a failed Vercel gate.
        if (!response.ok) return;
        const decision = await response.json();
        if (!decision.ok || decision.notify === false) return;
        country = decision.country || 'unknown';
      } catch { return; /* Optional alert is skipped; original download remains successful. */ }
    }
    if (disposed) return;
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(notificationPayload(event, country)),
        signal: AbortSignal.timeout(15000), keepalive: true,
      });
      const result = interpretDelivery(await response.json(), response.ok);
      if (!result.ok) console.warn('Private resume alert was not accepted by the provider. The PDF download is unaffected.');
    } catch { console.warn('Private resume alert could not be confirmed. The PDF download is unaffected.'); }
  }

  function nativeDownload(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
  }

  async function download(event) {
    const link = event.currentTarget;
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    // Normal/right-click direct PDF navigation remains an untracked fallback.
    event.preventDefault();
    if (busy) return;
    busy = true;
    link.setAttribute('aria-busy', 'true');
    const url = link.href;
    const filename = link.getAttribute('download') || 'Omkar_Shettigar_Resume.pdf';
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('PDF request failed');
      const blob = await response.blob();
      const magic = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
      if (magic !== '%PDF-') throw new Error('Not the original PDF');
      const objectURL = URL.createObjectURL(blob);
      nativeDownload(objectURL, filename);
      setTimeout(() => URL.revokeObjectURL(objectURL), 30000);
      const downloadEvent = normalizeResumeEvent({
        ...attribution, host: location.hostname, time: new Date().toISOString(), eventId: crypto.randomUUID(),
      });
      if (event.isTrusted) void alertOwner(downloadEvent);
    } catch {
      // Failure of the enhancement must not take away the original file link.
      nativeDownload(url, filename);
    } finally {
      busy = false;
      link.removeAttribute('aria-busy');
    }
  }

  document.querySelectorAll('a[download]').forEach((link) => {
    link.addEventListener('click', download, { signal: abort.signal });
  });
  return () => { disposed = true; abort.abort(); };
}

export function initPrivateWebAnalytics() {
  if (privacyRequested() || !VERCEL_HOSTS.has(location.hostname)) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  // Drop arbitrary query strings from page URLs; no paid custom event calls.
  window.va('beforeSend', (event) => {
    try {
      const url = new URL(event.url);
      url.search = '';
      url.hash = '';
      return { ...event, url: url.toString() };
    } catch { return null; }
  });
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.append(script);
}
