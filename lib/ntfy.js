/**
 * ntfy push notifications (https://ntfy.sh) for Live Laugh Local.
 *
 * Mirrors the conventions of the Spaces Please service (server/services/
 * ntfyService.js): fire-and-forget, never throws, ASCII-safe headers, and a
 * Click deep-link into the authenticated review desk.
 *
 * TOPIC: these deliberately land on the SAME topic as Spaces Please chat alerts,
 * because that is the subscription the owner's phone is already on and there is
 * no value in a second one to manage. Verified against origin/main's
 * server/services/ntfyService.js, where it is commented "team already
 * subscribed - do not change".
 *
 * Sharing a topic means these alerts MUST identify themselves, so every title
 * is prefixed "Live Laugh Local" and tagged `newspaper` (a newspaper icon).
 * Spaces Please chat alerts use `speech_balloon`, so the two are distinguishable
 * at a glance in one feed.
 *
 * Config:
 *  - NTFY_TOPIC_LLL  overrides the topic, so the magazine can be split onto its
 *                    own subscription later without a code change. Set it to ''
 *                    to disable pushes entirely.
 *  - NTFY_SERVER     custom/self-hosted ntfy server (defaults to ntfy.sh).
 *
 * Anyone holding the topic string can read the feed - treat it like a shared
 * secret and rotate via the env var if it leaks.
 *
 * PRIVACY: alerts are deliberately content-light. A submitted story has not
 * been published, and may be rejected, so its title and the submitter's
 * details are not sent to a third-party push service. The alert says what
 * arrived and how urgent it is; the operator reads the actual content in the
 * authenticated queue via the Click link.
 */
const DEFAULT_TOPIC = 'spacesplease-chat-a7k3m9qp2f';
const REVIEW_URL = 'https://spacesplease.com/pandoras-box/livelaughlocal/approvals';

function topic() {
  return process.env.NTFY_TOPIC_LLL !== undefined
    ? process.env.NTFY_TOPIC_LLL
    : DEFAULT_TOPIC;
}

function server() {
  return (process.env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/+$/, '');
}

// ntfy header values must be ASCII; the body may be UTF-8.
function asciiSafe(s) {
  return String(s || '').replace(/[^\x20-\x7E]/g, '').trim();
}

/**
 * Send a push. Never throws - a failed notification must never break the
 * request that triggered it.
 */
export async function sendAlert({ title, body, priority = 3, tags, clickUrl } = {}) {
  const t = topic();
  if (!t) return false; // pushes disabled

  try {
    const headers = { 'Content-Type': 'text/plain; charset=utf-8' };
    if (title) headers.Title = asciiSafe(title);
    if (priority) headers.Priority = String(priority);
    if (tags) headers.Tags = asciiSafe(Array.isArray(tags) ? tags.join(',') : tags);
    if (clickUrl) headers.Click = asciiSafe(clickUrl);

    const res = await fetch(`${server()}/${encodeURIComponent(t)}`, {
      method: 'POST',
      headers,
      body: String(body || ''),
      // Never let a slow push service hold up a reader's request.
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch (err) {
    console.error('[ntfy] alert failed:', err && err.message);
    return false;
  }
}

/**
 * A story has been submitted through the public form and is waiting in the
 * review queue. Featured submissions are flagged higher because there is £100
 * attached and the card is already authorised.
 *
 * @param {Object} opts
 * @param {boolean} opts.featured  did they request the paid Featured placement
 * @param {boolean} opts.hasImage  did they upload a hero image
 */
export async function sendSubmissionAlert({ featured = false, hasImage = false } = {}) {
  const extras = [];
  if (hasImage) extras.push('with an image');

  return sendAlert({
    // Prefixed because this shares a feed with Spaces Please chat alerts.
    title: featured
      ? 'Live Laugh Local: FEATURED story submitted (GBP 100)'
      : 'Live Laugh Local: story submitted for review',
    body: featured
      ? 'A paid Featured placement is waiting in the review queue' +
        (extras.length ? ` (${extras.join(', ')})` : '') +
        '. The card is authorised but NOT charged - publishing takes the payment, rejecting takes nothing. Tap to review.'
      : 'A story is waiting in the review queue' +
        (extras.length ? ` (${extras.join(', ')})` : '') +
        '. Tap to review it.',
    priority: featured ? 4 : 3,
    tags: featured ? 'moneybag,newspaper' : 'newspaper',
    clickUrl: REVIEW_URL,
  });
}

/**
 * A submitter confirmed their email address, so the story is now a genuine
 * entry in the queue rather than an unverified one.
 */
export async function sendSubmissionConfirmedAlert() {
  return sendAlert({
    title: 'Live Laugh Local: submitter confirmed their email',
    body: 'The submitter verified their email address, so their story is confirmed in the review queue. Tap to review it.',
    priority: 3,
    tags: 'newspaper,white_check_mark',
    clickUrl: REVIEW_URL,
  });
}
