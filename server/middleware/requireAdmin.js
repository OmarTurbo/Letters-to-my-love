import { timingSafeEqual } from "node:crypto";

export function createRequireAdmin(adminPassword) {
  const expected = Buffer.from(adminPassword);

  return function requireAdmin(req, res, next) {
    const provided = Buffer.from(req.get("x-admin-password") ?? "");

    const matches =
      provided.length === expected.length && timingSafeEqual(provided, expected);

    if (!matches) {
      return res.status(401).json({ error: "Invalid or missing admin password." });
    }

    return next();
  };
}
