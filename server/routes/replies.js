import { Router } from 'express';
import mongoose from 'mongoose';
import { parseReplyInput, toApiReply, ReplyValidationError } from '../lib/replyData.js';

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function assertValidId(id, label) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ReplyValidationError(`Invalid ${label} id.`);
  }
}

export function createRepliesRouter({ letterRepo, replyRepo, requireAdmin, rateLimiter, notifications }) {
  const router = Router({ mergeParams: true });

  router.get('/', asyncHandler(async (req, res) => {
    assertValidId(req.params.letterId, 'letter');
    const letter = await letterRepo.get(req.params.letterId);
    if (!letter) return res.status(404).json({ error: 'Letter not found.' });
    const replies = await replyRepo.listByLetter(req.params.letterId);
    return res.json(replies.map(toApiReply));
  }));

  router.post('/', rateLimiter, asyncHandler(async (req, res) => {
    assertValidId(req.params.letterId, 'letter');
    const letter = await letterRepo.get(req.params.letterId);
    if (!letter) return res.status(404).json({ error: 'Letter not found.' });

    const data = parseReplyInput(req.body);
    const reply = await replyRepo.create({ ...data, letterId: req.params.letterId });
    let notification = { status: 'skipped' };
    try {
      const result = await notifications.sendReplyCreated({ id: String(letter._id), title: letter.title }, toApiReply(reply));
      notification = { status: result?.sent ? 'sent' : 'skipped' };
    } catch (error) {
      console.error(`Reply notification failed: ${error.message}`);
      notification = { status: 'failed' };
    }
    return res.status(201).json({ ...toApiReply(reply), notification });
  }));

  return router;
}

export function createReplyAdminRouter({ letterRepo, replyRepo, requireAdmin }) {
  const router = Router();
  router.delete('/:letterId/replies/:replyId', requireAdmin, asyncHandler(async (req, res) => {
    assertValidId(req.params.letterId, 'letter');
    assertValidId(req.params.replyId, 'reply');
    const letter = await letterRepo.get(req.params.letterId);
    if (!letter) return res.status(404).json({ error: 'Letter not found.' });
    const reply = await replyRepo.removeForLetter(req.params.replyId, req.params.letterId);
    if (!reply) return res.status(404).json({ error: 'Reply not found.' });
    return res.status(204).end();
  }));
  return router;
}
