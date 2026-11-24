const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function createNotificationService({ fetchImpl = fetch, env = process.env } = {}) {
  return {
    async sendLetterCreated(letter) {
      return sendEmail({
        fetchImpl,
        env,
        subject: `A new letter: ${letter.title}`,
        html: `<p>A new letter has been written for you.</p><p><strong>${escapeHtml(letter.title)}</strong></p><p><a href="${escapeHtml(env.PUBLIC_SITE_URL || '')}/src/views/letters.html?id=${encodeURIComponent(letter.id)}">Read the letter</a></p>`
      });
    },
    async sendReplyCreated(letter, reply) {
      return sendEmail({
        fetchImpl,
        env,
        subject: `A new reply to: ${letter.title}`,
        html: `<p>${escapeHtml(reply.authorName)} posted a reply.</p><p>${escapeHtml(reply.message)}</p><p><a href="${escapeHtml(env.PUBLIC_SITE_URL || '')}/src/views/letters.html?id=${encodeURIComponent(letter.id)}">View the letter</a></p>`
      });
    }
  };
}

async function sendEmail({ fetchImpl, env, subject, html }) {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_TO_EMAIL || !env.NOTIFICATION_FROM_EMAIL || !env.PUBLIC_SITE_URL) {
    return { sent: false, skipped: true };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  let response;

  try {
    response = await fetchImpl(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.NOTIFICATION_FROM_EMAIL,
      to: [env.NOTIFICATION_TO_EMAIL],
      subject,
      html
    }),
    signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Resend returned HTTP ${response.status}.`);
  }

  return { sent: true };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}
