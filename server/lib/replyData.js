export const REPLY_NAME_MAX = 80;
export const REPLY_MESSAGE_MAX = 2000;

export class ReplyValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ReplyValidationError';
    this.status = 400;
  }
}

export function parseReplyInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ReplyValidationError('Reply body must be an object.');
  }

  if (typeof body.authorName !== 'string' || !body.authorName.trim()) {
    throw new ReplyValidationError('Name is required.');
  }

  if (typeof body.message !== 'string' || !body.message.trim()) {
    throw new ReplyValidationError('Message is required.');
  }

  const authorName = body.authorName.trim();
  const message = body.message.trim();

  if (authorName.length > REPLY_NAME_MAX) {
    throw new ReplyValidationError(`Name must be at most ${REPLY_NAME_MAX} characters.`);
  }

  if (message.length > REPLY_MESSAGE_MAX) {
    throw new ReplyValidationError(`Message must be at most ${REPLY_MESSAGE_MAX} characters.`);
  }

  return { authorName, message };
}

export function toApiReply(doc) {
  const raw = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(raw._id),
    letterId: String(raw.letterId),
    authorName: raw.authorName,
    message: raw.message,
    createdAt: new Date(raw.createdAt).toISOString()
  };
}
