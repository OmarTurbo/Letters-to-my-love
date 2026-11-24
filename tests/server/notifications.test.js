import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationService } from '../../server/services/notifications.js';

test('notifications are skipped when Gmail API is not configured', async () => {
  let called = false;
  const service = createNotificationService({ fetchImpl: async () => { called = true; } });
  assert.deepEqual(await service.sendLetterCreated({ id: 'abc', title: 'Hello' }), { sent: false, skipped: true });
  assert.equal(called, false);
});

test('Gmail API notifications send a base64url encoded message', async () => {
  let mail;
  const service = createNotificationService({
    env: {
      GMAIL_USER: 'sender@gmail.com',
      GMAIL_REFRESH_TOKEN: 'refresh-token',
      NOTIFICATION_TO_EMAIL: 'recipient@gmail.com',
      PUBLIC_SITE_URL: 'https://letters.example.com',
      GMAIL_CLIENT_ID: 'client-id',
      GMAIL_CLIENT_SECRET: 'client-secret'
    },
    gmailClient: {
      users: {
        messages: {
          async send(request) { mail = request; }
        }
      }
    }
  });

  const result = await service.sendLetterCreated({ id: 'abc', title: 'Hello' });
  assert.deepEqual(result, { sent: true });
  assert.equal(mail.userId, 'sender@gmail.com');
  assert.ok(mail.requestBody.raw);
  const decoded = Buffer.from(mail.requestBody.raw, 'base64url').toString('utf8');
  assert.match(decoded, /From: sender@gmail.com/);
  assert.match(decoded, /To: recipient@gmail.com/);
  assert.match(decoded, /Subject: A new letter: Hello/);
});
