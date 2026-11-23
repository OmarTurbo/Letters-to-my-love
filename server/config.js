export function loadConfig(env = process.env) {
  const mongoUri = env.MONGODB_URI?.trim();
  const adminPassword = env.ADMIN_PASSWORD?.trim();

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is required. Copy .env.example to .env and paste your MongoDB Atlas connection string."
    );
  }

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is required. Set it in .env.");
  }

  const rawPort = env.PORT?.trim() || "4000";
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `PORT must be an integer between 1 and 65535 (received "${rawPort}").`
    );
  }

  return {
    mongoUri,
    mongoDb: env.MONGODB_DB?.trim() || undefined,
    port,
    adminPassword
  };
}
