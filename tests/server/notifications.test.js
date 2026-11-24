import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationService } from '../../server/services/notifications.js';

test('notifications are skipped when Gmail is not configured', async () => {
  let called = false;
  const service = createNotificationService({ fetchImpl: async () => { called = true; } });
  assert.deepEqual(await service.sendLetterCreated({ id: 'abc', title: 'Hello' }), { sent: false, skipped: true });
  assert.equal(called, false);
});

test('Gmail notifications send through the configured SMTP transport', async () => {
  let mail;
  const service = createNotificationService({
    env: {
      GMAIL_USER: 'sender@gmail.com',
      GMAIL_APP_PASSWORD: 'app-password',
      NOTIFICATION_TO_EMAIL: 'recipient@gmail.com',
      PUBLIC_SITE_URL: 'https://letters.example.com'
    },
    transport: {
      async sendMail(message) { mail = message; }
    }
  });

  const result = await service.sendLetterCreated({ id: 'abc', title: 'Hello' });
  assert.deepEqual(result, { sent: true });
  assert.equal(mail.from, 'sender@gmail.com');
  assert.deepEqual(mail.to, ['recipient@gmail.com']);
  assert.match(mail.subject, /Hello/);
});
