import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReplyInput, toApiReply, ReplyValidationError } from '../../server/lib/replyData.js';

test('parseReplyInput trims and validates public replies', () => {
  assert.deepEqual(parseReplyInput({ authorName: '  Mary  ', message: '  Beautiful  ' }), {
    authorName: 'Mary',
    message: 'Beautiful'
  });
});

test('parseReplyInput rejects empty and oversized values', () => {
  assert.throws(() => parseReplyInput({ authorName: '', message: 'hello' }), /Name is required/);
  assert.throws(() => parseReplyInput({ authorName: 'Mary', message: '' }), /Message is required/);
  assert.throws(() => parseReplyInput({ authorName: 'x'.repeat(81), message: 'hello' }), /80/);
  assert.throws(() => parseReplyInput({ authorName: 'Mary', message: 'x'.repeat(2001) }), /2000/);
});

test('toApiReply exposes safe public fields', () => {
  const result = toApiReply({
    _id: 'reply-1',
    letterId: 'letter-1',
    authorName: 'Mary',
    message: '<3',
    createdAt: new Date('2026-11-24T10:00:00.000Z')
  });
  assert.deepEqual(result, {
    id: 'reply-1',
    letterId: 'letter-1',
    authorName: 'Mary',
    message: '<3',
    createdAt: '2026-11-24T10:00:00.000Z'
  });
});

test('ReplyValidationError carries status 400', () => {
  assert.equal(new ReplyValidationError('bad').status, 400);
});
