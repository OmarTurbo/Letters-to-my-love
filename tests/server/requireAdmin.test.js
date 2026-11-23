import test from "node:test";
import assert from "node:assert/strict";
import { createRequireAdmin } from "../../server/middleware/requireAdmin.js";

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("requireAdmin calls next for the correct password", () => {
  let called = false;
  const req = { get: () => "secret" };
  createRequireAdmin("secret")(req, fakeResponse(), () => {
    called = true;
  });
  assert.equal(called, true);
});

test("requireAdmin rejects a missing password", () => {
  const res = fakeResponse();
  let called = false;
  createRequireAdmin("secret")({ get: () => undefined }, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /password/i);
});

test("requireAdmin rejects a wrong password", () => {
  const res = fakeResponse();
  let called = false;
  createRequireAdmin("secret")({ get: () => "nope" }, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});
