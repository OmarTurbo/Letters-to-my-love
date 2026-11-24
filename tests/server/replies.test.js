import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../server/app.js';

const letterId = '665f1c2a9b1e4c0012a34560';
const replyId = '665f1c2a9b1e4c0012a34561';

function createReplyRepo() {
  const replies = new Map();
  return {
    listByLetter: async (id) => [...replies.values()].filter((reply) => reply.letterId === id),
    create: async (data) => {
      const reply = { _id: replyId, ...data, createdAt: new Date('2026-11-24T10:00:00Z') };
      replies.set(reply._id, reply);
      return reply;
    },
    removeForLetter: async (id, letterId) => {
      const reply = replies.get(id);
      if (!reply || reply.letterId !== letterId) return null;
      replies.delete(id);
      return reply || null;
    }
  };
}

async function withApp(run) {
  const notifications = {
    letterCalls: 0,
    replyCalls: 0,
    async sendLetterCreated() { this.letterCalls += 1; },
    async sendReplyCreated() { this.replyCalls += 1; }
  };
  const app = createApp({
    repo: {
      get: async (id) => id === letterId ? {
        _id: letterId,
        title: 'A letter',
        content: 'Hello',
        date: new Date('2026-11-24T00:00:00Z'),
        createdAt: new Date('2026-11-24T00:00:00Z'),
        updatedAt: new Date('2026-11-24T00:00:00Z')
      } : null,
      list: async () => [],
      create: async () => null,
      update: async () => null,
      remove: async () => null
    },
    replyRepo: createReplyRepo(),
    config: { adminPassword: 'secret' },
    notifications,
    distDir: 'missing-dist'
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await run(base, notifications); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('public replies can be created and listed', async () => {
  await withApp(async (base, notifications) => {
    const create = await fetch(`${base}/api/letters/${letterId}/replies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorName: 'Mary', message: '<3' })
    });
    assert.equal(create.status, 201);
    assert.equal((await create.json()).message, '<3');
    assert.equal(notifications.replyCalls, 1);

    const list = await fetch(`${base}/api/letters/${letterId}/replies`);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).length, 1);
  });
});

test('public reply validation and rate limiting work', async () => {
  await withApp(async (base) => {
    const invalid = await fetch(`${base}/api/letters/${letterId}/replies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ authorName: '', message: '' })
    });
    assert.equal(invalid.status, 400);

    for (let index = 0; index < 5; index += 1) {
      await fetch(`${base}/api/letters/${letterId}/replies`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': 'rate-limit-test' },
        body: JSON.stringify({ authorName: 'Mary', message: `Reply ${index}` })
      });
    }
    const limited = await fetch(`${base}/api/letters/${letterId}/replies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': 'rate-limit-test' },
      body: JSON.stringify({ authorName: 'Mary', message: 'One too many' })
    });
    assert.equal(limited.status, 429);
  });
});

test('admin can delete a reply', async () => {
  await withApp(async (base) => {
    await fetch(`${base}/api/letters/${letterId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ authorName: 'Mary', message: 'Hello' }),
      headers: { 'content-type': 'application/json' }
    });
    const response = await fetch(`${base}/api/letters/${letterId}/replies/${replyId}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': 'secret' }
    });
    assert.equal(response.status, 204);
  });
});
