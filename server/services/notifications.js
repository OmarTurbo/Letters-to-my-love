import { google } from 'googleapis';

export function createNotificationService({ env = process.env, gmailClient } = {}) {
  const configured = Boolean(
    env.GMAIL_USER &&
    env.GMAIL_CLIENT_ID &&
    env.GMAIL_CLIENT_SECRET &&
    env.GMAIL_REFRESH_TOKEN &&
    env.NOTIFICATION_TO_EMAIL &&
    env.PUBLIC_SITE_URL
  );

  let client = gmailClient;

  if (!client && configured) {
    const auth = new google.auth.OAuth2(
      env.GMAIL_CLIENT_ID,
      env.GMAIL_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: env.GMAIL_REFRESH_TOKEN });
    client = google.gmail({ version: 'v1', auth });
  }

  return {
    async sendLetterCreated(letter) {
      return sendMail({
        configured,
        client,
        env,
        subject: `A new letter: ${letter.title}`,
        html: `<p>A new letter has been written for you.</p><p><strong>${escapeHtml(letter.title)}</strong></p><p><a href="${letterUrl(env, letter.id)}">Read the letter</a></p>`
      });
    },
    async sendReplyCreated(letter, reply) {
      return sendMail({
        configured,
        client,
        env,
        subject: `A new reply to: ${letter.title}`,
        html: `<p>${escapeHtml(reply.authorName)} posted a reply.</p><p>${escapeHtml(reply.message)}</p><p><a href="${letterUrl(env, letter.id)}">View the letter</a></p>`
      });
    }
  };
}

async function sendMail({ configured, client, env, subject, html }) {
  if (!configured || !client) {
    return { sent: false, skipped: true };
  }

  const message = [
    `From: ${env.GMAIL_USER}`,
    `To: ${env.NOTIFICATION_TO_EMAIL}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html
  ].join('\r\n');

  await client.users.messages.send({
    userId: env.GMAIL_USER,
    requestBody: { raw: Buffer.from(message).toString('base64url') }
  });

  return { sent: true };
}

function letterUrl(env, id) {
  return `${escapeHtml(env.PUBLIC_SITE_URL)}/src/views/letters.html?id=${encodeURIComponent(id)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}
