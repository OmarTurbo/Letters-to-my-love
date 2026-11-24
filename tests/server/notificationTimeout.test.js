import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationService } from '../../server/services/notifications.js';

test('notification requests include an abort signal', async () => {
  let options;
  const service = createNotificationService({
    env: { RESEND_API_KEY: 'key', NOTIFICATION_TO_EMAIL: 'to@example.com', NOTIFICATION_FROM_EMAIL: 'from@example.com', PUBLIC_SITE_URL: 'https://example.com' },
    fetchImpl: async (_url, requestOptions) => {
      options = requestOptions;
      return new Response('{}', { status: 200 });
    }
  });
  await service.sendLetterCreated({ id: 'id', title: 'Title' });
  assert.ok(options.signal instanceof AbortSignal);
});
