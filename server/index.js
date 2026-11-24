import "dotenv/config";
import { loadConfig } from "./config.js";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { Letter } from "./models/Letter.js";
import { createLetterRepository } from "./repositories/letterRepository.js";
import { Reply } from './models/Reply.js';
import { createReplyRepository } from './repositories/replyRepository.js';
import { createApp } from "./app.js";

async function main() {
  const config = loadConfig();

  try {
    await connectDatabase(config);
  } catch (error) {
    console.error(`\n✗ Could not connect to MongoDB: ${error.message}`);
    console.error(
      "Check that your Atlas cluster is running and that this machine's IP is allowed in Atlas Network Access.\n"
    );
    process.exitCode = 1;
    return;
  }

  const app = createApp({
    repo: createLetterRepository(Letter),
    replyRepo: createReplyRepository(Reply),
    config
  });

  const server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}\n`);
  process.exit(1);
});
