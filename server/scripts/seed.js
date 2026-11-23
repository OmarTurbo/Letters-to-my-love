import "dotenv/config";
import { loadConfig } from "../config.js";
import { connectDatabase, disconnectDatabase } from "../db.js";
import { Letter } from "../models/Letter.js";
import { parseDisplayDate } from "../lib/letterData.js";
import { letters } from "../../src/content/letters.example.js";

async function main() {
  const force = process.argv.includes("--force");
  const config = loadConfig();

  await connectDatabase(config);

  try {
    const existing = await Letter.countDocuments();

    if (existing > 0 && !force) {
      console.log(
        `Skipping: ${existing} letters already exist. Use --force to replace.`
      );
      return;
    }

    if (force) {
      await Letter.deleteMany({});
    }

    const docs = letters.map(({ title, content, date }) => ({
      title,
      content,
      date: parseDisplayDate(date)
    }));

    await Letter.insertMany(docs);
    console.log(`Seeded ${docs.length} letters.`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}\n`);
  process.exit(1);
});
