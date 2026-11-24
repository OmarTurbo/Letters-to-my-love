import nodemailer from 'nodemailer';

export function createNotificationService({ env = process.env, transport } = {}) {
  const configured = Boolean(
    env.GMAIL_USER &&
    env.GMAIL_APP_PASSWORD &&
    env.NOTIFICATION_TO_EMAIL &&
    env.PUBLIC_SITE_URL
  );

  const mailTransport = transport || (configured
    ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD
      },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 8_000
    })
    : null);

  return {
    async sendLetterCreated(letter) {
      return sendMail({
        configured,
        mailTransport,
        env,
        subject: `A new letter: ${letter.title}`,
        html: `<p>A new letter has been written for you.</p><p><strong>${escapeHtml(letter.title)}</strong></p><p><a href="${letterUrl(env, letter.id)}">Read the letter</a></p>`
      });
    },
    async sendReplyCreated(letter, reply) {
      return sendMail({
        configured,
        mailTransport,
        env,
        subject: `A new reply to: ${letter.title}`,
        html: `<p>${escapeHtml(reply.authorName)} posted a reply.</p><p>${escapeHtml(reply.message)}</p><p><a href="${letterUrl(env, letter.id)}">View the letter</a></p>`
      });
    }
  };
}

async function sendMail({ configured, mailTransport, env, subject, html }) {
  if (!configured || !mailTransport) {
    return { sent: false, skipped: true };
  }

  await mailTransport.sendMail({
    from: env.GMAIL_USER,
    to: [env.NOTIFICATION_TO_EMAIL],
    subject,
    html
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
