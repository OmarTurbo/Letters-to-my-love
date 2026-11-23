import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../../server/config.js";

const base = {
  MONGODB_URI: "mongodb://localhost:27017/test",
  ADMIN_PASSWORD: "secret"
};

test("loadConfig returns validated values", () => {
  assert.deepEqual(loadConfig({ ...base, PORT: "5000", MONGODB_DB: "letters" }), {
    mongoUri: "mongodb://localhost:27017/test",
    mongoDb: "letters",
    port: 5000,
    adminPassword: "secret"
  });
});

test("loadConfig defaults the port to 4000", () => {
  assert.equal(loadConfig(base).port, 4000);
  assert.equal(loadConfig(base).mongoDb, undefined);
});

test("loadConfig rejects a missing MONGODB_URI", () => {
  assert.throws(() => loadConfig({ ADMIN_PASSWORD: "x" }), /MONGODB_URI is required/);
});

test("loadConfig rejects a missing ADMIN_PASSWORD", () => {
  assert.throws(() => loadConfig({ MONGODB_URI: "mongodb://x" }), /ADMIN_PASSWORD is required/);
});

test("loadConfig rejects an invalid PORT", () => {
  assert.throws(() => loadConfig({ ...base, PORT: "abc" }), /PORT must be an integer/);
  assert.throws(() => loadConfig({ ...base, PORT: "70000" }), /PORT must be an integer/);
});
