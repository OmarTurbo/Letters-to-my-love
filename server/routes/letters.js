import { Router } from "express";
import mongoose from "mongoose";
import {
  parseLetterInput,
  toApiLetter,
  ValidationError
} from "../lib/letterData.js";

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function assertValidId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ValidationError("Invalid letter id.");
  }
}

export function createLettersRouter({ repo, requireAdmin, notifications, replyRepo }) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const letters = await repo.list();
      res.json(letters.map(toApiLetter));
    })
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      assertValidId(req.params.id);

      const letter = await repo.get(req.params.id);

      if (!letter) {
        return res.status(404).json({ error: "Letter not found." });
      }

      return res.json(toApiLetter(letter));
    })
  );

  router.post(
    "/",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const data = parseLetterInput(req.body);
      const letter = await repo.create(data);
      const apiLetter = toApiLetter(letter);
      let notification = { status: 'skipped' };
      try {
        const result = await notifications.sendLetterCreated(apiLetter);
        notification = { status: result?.sent ? 'sent' : 'skipped' };
      } catch (error) {
        console.error(`Letter notification failed: ${error.message}`);
        notification = { status: 'failed' };
      }
      res.status(201).json({ ...apiLetter, notification });
    })
  );

  router.put(
    "/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      assertValidId(req.params.id);

      const data = parseLetterInput(req.body, { partial: true });
      const letter = await repo.update(req.params.id, data);

      if (!letter) {
        return res.status(404).json({ error: "Letter not found." });
      }

      return res.json(toApiLetter(letter));
    })
  );

  router.delete(
    "/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      assertValidId(req.params.id);

      const letter = await repo.remove(req.params.id);

      if (!letter) {
        return res.status(404).json({ error: "Letter not found." });
      }

      if (replyRepo) {
        await replyRepo.removeByLetter(req.params.id);
      }

      return res.status(204).end();
    })
  );

  return router;
}
