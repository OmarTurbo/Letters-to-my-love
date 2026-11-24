import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequireAdmin } from "./middleware/requireAdmin.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createLettersRouter } from "./routes/letters.js";
import { createRepliesRouter, createReplyAdminRouter } from "./routes/replies.js";
import { createRateLimiter } from './middleware/rateLimit.js';
import { createNotificationService } from './services/notifications.js';

export function createApp({
  repo,
  replyRepo,
  config,
  notifications = createNotificationService(),
  distDir = resolve(process.cwd(), "dist")
}) {
  const app = express();

  app.disable("x-powered-by");
  app.set('trust proxy', 1);
  app.use(express.json({ limit: "100kb" }));

  const requireAdmin = createRequireAdmin(config.adminPassword);

  app.get("/api/health", (req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/auth/verify", requireAdmin, (req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/letters", createLettersRouter({ repo, replyRepo, requireAdmin, notifications }));

  if (replyRepo) {
    app.use('/api/letters/:letterId/replies', createRepliesRouter({
      letterRepo: repo,
      replyRepo,
      requireAdmin,
      rateLimiter: createRateLimiter(),
      notifications
    }));
    app.use('/api/letters', createReplyAdminRouter({ letterRepo: repo, replyRepo, requireAdmin }));
  }

  app.use("/api", (req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  if (existsSync(distDir)) {
    app.use(express.static(distDir));
  } else {
    app.get("/", (req, res) => {
      res
        .type("text/plain")
        .send(
          "Run npm run build to create the site, or npm run dev for development."
        );
    });
  }

  app.use(errorHandler);

  return app;
}
