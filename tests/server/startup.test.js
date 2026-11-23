import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("server exits with a clear message when required env vars are missing", () => {
  const result = spawnSync(process.execPath, ["server/index.js"], {
    cwd: process.cwd(),
    env: { ...process.env, MONGODB_URI: "", ADMIN_PASSWORD: "", PORT: "4000" },
    encoding: "utf8",
    timeout: 15000
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /MONGODB_URI is required/);
});
