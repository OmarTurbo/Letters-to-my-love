import 'dotenv/config';
import { loadConfig } from '../server/config.js';
import { connectDatabase } from '../server/db.js';
import { Letter } from '../server/models/Letter.js';
import { createLetterRepository } from '../server/repositories/letterRepository.js';
import { createApp } from '../server/app.js';
import { Reply } from '../server/models/Reply.js';
import { createReplyRepository } from '../server/repositories/replyRepository.js';

const config = loadConfig();
const repo = createLetterRepository(Letter);
const app = createApp({ repo, replyRepo: createReplyRepository(Reply), config });
let databasePromise;

function ensureDatabase() {
  if (!databasePromise) {
    databasePromise = connectDatabase(config).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }

  return databasePromise;
}

export default async function handler(request, response) {
  try {
    await ensureDatabase();
    return app(request, response);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    return response.status(503).json({
      error: 'Database temporarily unavailable.'
    });
  }
}
