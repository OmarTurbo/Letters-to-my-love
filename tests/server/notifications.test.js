import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationService } from '../../server/services/notifications.js';

test('sendLetterCreated calls Resend with a safe letter link', async () => {
  const calls = [];
  const service = createNotificationService({
    env: {
      RESEND_API_KEY: 'key',
      NOTIFICATION_TO_EMAIL: 'to@example.com',
      NOTIFICATION_FROM_EMAIL: 'from@example.com',
      PUBLIC_SITE_URL: 'https://letters.example.com'
    },
    fetchImpl: async (...args) => {
      calls.push(args);
      return new Response('{}', { status: 200 });
    }
  });

  const result = await service.sendLetterCreated({ id: 'abc', title: '<Love>' });
  assert.deepEqual(result, { sent: true });
  assert.equal(calls[0][0], 'https://api.resend.com/emails');
  const request = JSON.parse(calls[0][1].body);
  assert.equal(request.to[0], 'to@example.com');
  assert.match(request.html, /&lt;Love&gt;/);
  assert.match(request.html, /id=abc/);
});

test('notifications are skipped when Resend is not configured', async () => {
  let called = false;
  const service = createNotificationService({ fetchImpl: async () => { called = true; } });
  assert.deepEqual(await service.sendLetterCreated({ id: 'abc', title: 'Hello' }), { sent: false, skipped: true });
  assert.equal(called, false);
});
