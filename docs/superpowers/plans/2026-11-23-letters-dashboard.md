# Letters Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-protected dashboard that creates, edits, and deletes love letters stored in MongoDB Atlas, and make the public site read those letters live through an Express API.

**Architecture:** A single Express (ESM) server exposes a small JSON API and, in production, serves the Vite build. Development runs Vite on `:5173` with `/api` proxied to Express on `:4000`. The dashboard is a third Vite page at `/dashboard.html`, written in vanilla JS. Mongoose stores letters with `title`, `content`, `date`, and timestamps; API responses expose an ObjectId string plus display and ISO dates.

**Tech Stack:** Node 24 (ESM), Express, Mongoose, MongoDB Atlas, dotenv, Vite, vanilla JS/CSS, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-23-letters-dashboard-design.md`

## Global Constraints

- Node 22+; the machine currently has Node 24.
- ESM everywhere; `package.json` already has `"type": "module"`.
- No frontend framework and no build-time letter imports on the public site.
- Secrets live only in `.env`; never import `.env` values into client code.
- Dates are stored as UTC midnight `Date` values.
- API letter shape: `{ id, title, content, date, dateISO, createdAt, updatedAt }`.
- `date` display format: `Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })`.
- Limits: title 200 chars, content 50,000 chars, JSON body 100 kB.
- Admin auth header: `x-admin-password`, compared in constant time.
- All API errors return `{ "error": "message" }`.
- Public reads are unauthenticated; writes require the admin password.
- Letter content is rendered as text, never as HTML.
- Git is not installed in this environment and the directory is not a working repo: **skip every commit step**; do not initialize a repo.
- PowerShell blocks `npm.ps1`; run npm commands as `npm.cmd`.
- Existing envelope design, fonts, and animations must not change visually.

## Review Focus

These are the inputs and failure modes most likely to hurt a real user. Each has a test in the task that owns the code.

1. **API unreachable** — main page, letter page, and dashboard show a clear load error with retry, never a blank page or "Letter not found".
2. **Empty database** — main page shows "No letters yet.", not an error.
3. **Wrong or expired password** — writes return `401`, the dashboard returns to the password gate, and no letter data is exposed.
4. **Oversized or empty fields** — empty title/content, >200-char title, >50,000-char content return `400` with a readable message.
5. **Unknown or malformed letter id** — malformed → `400`, valid-but-missing → `404`; the letter page distinguishes this from a network failure.
6. **HTML in letter content** — `<script>` and tags appear as literal text on the public letter page.

---

### Task 1: Environment configuration and dependencies

**Files:**
- Create: `server/config.js`
- Create: `tests/server/config.test.js`
- Create: `.env.example`
- Create: `.env` (empty values, gitignored)
- Modify: `.gitignore`
- Modify: `package.json` (dependencies and scripts)

**Interfaces:**
- Consumes: nothing.
- Produces: `loadConfig(env = process.env) -> { mongoUri: string, mongoDb: string | undefined, port: number, adminPassword: string }`. Throws `Error` with a readable message when `MONGODB_URI` or `ADMIN_PASSWORD` is missing or `PORT` is invalid.

- [ ] **Step 1: Write the failing tests**

`tests/server/config.test.js`:

```js
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/server/config.test.js`
Expected: FAIL because `server/config.js` does not exist.

- [ ] **Step 3: Implement `server/config.js`**

```js
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
```

- [ ] **Step 4: Add dependencies, scripts, env files, and ignore rule**

Run: `npm.cmd install express mongoose dotenv`
Run: `npm.cmd install -D concurrently`

Add to `package.json` scripts:

```json
"server": "node --watch server/index.js",
"dev:all": "concurrently -k -n api,web -c blue,magenta \"npm:server\" \"npm:dev\"",
"start": "node server/index.js",
"seed": "node server/scripts/seed.js"
```

`.env.example`:

```dotenv
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
MONGODB_DB=letters
PORT=4000
ADMIN_PASSWORD=change-me
```

`.env` (local only; leave values blank for the user to fill):

```dotenv
MONGODB_URI=
MONGODB_DB=letters
PORT=4000
ADMIN_PASSWORD=
```

Append `.env` to `.gitignore`.

- [ ] **Step 5: Run the test and confirm it passes**

Run: `node --test tests/server/config.test.js`
Expected: 5 passing tests.

---

### Task 2: Letter data helpers and Mongoose model

**Files:**
- Create: `server/lib/letterData.js`
- Create: `server/models/Letter.js`
- Create: `tests/server/letterData.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `TITLE_MAX = 200`, `CONTENT_MAX = 50000`.
  - `class ValidationError extends Error` with `status = 400`.
  - `toUtcMidnight(value: Date | string | number) -> Date`.
  - `parseDisplayDate(value: string, fallback = new Date()) -> Date` — parses `"Aug 28, 2026"` into UTC midnight; invalid input falls back.
  - `parseLetterInput(body, { partial = false, now = new Date() } = {}) -> { title?, content?, date? }` — throws `ValidationError`.
  - `formatDisplayDate(date) -> string`, `formatDateISO(date) -> string`.
  - `toApiLetter(doc) -> { id, title, content, date, dateISO, createdAt, updatedAt }`.
  - `Letter` Mongoose model.

- [ ] **Step 1: Write the failing tests**

`tests/server/letterData.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseLetterInput,
  parseDisplayDate,
  toApiLetter,
  ValidationError
} from "../../server/lib/letterData.js";

test("parseLetterInput trims fields and defaults date to UTC midnight", () => {
  const now = new Date("2026-11-23T15:30:00.000Z");
  const result = parseLetterInput({ title: "  Hello  ", content: "  Body  " }, { now });
  assert.equal(result.title, "Hello");
  assert.equal(result.content, "Body");
  assert.equal(result.date.toISOString(), "2026-11-23T00:00:00.000Z");
});

test("parseLetterInput parses date-only strings as UTC midnight", () => {
  const result = parseLetterInput({ title: "a", content: "b", date: "2026-08-28" });
  assert.equal(result.date.toISOString(), "2026-08-28T00:00:00.000Z");
});

test("parseLetterInput rejects empty title and content", () => {
  assert.throws(() => parseLetterInput({ title: "  ", content: "b" }), /Title is required/);
  assert.throws(() => parseLetterInput({ title: "a", content: "  " }), /Content is required/);
});

test("parseLetterInput rejects oversized title and content", () => {
  assert.throws(
    () => parseLetterInput({ title: "x".repeat(201), content: "b" }),
    /Title must be at most 200/
  );
  assert.throws(
    () => parseLetterInput({ title: "a", content: "x".repeat(50001) }),
    /Content must be at most 50000/
  );
});

test("parseLetterInput rejects an invalid date", () => {
  assert.throws(
    () => parseLetterInput({ title: "a", content: "b", date: "2026-02-31" }),
    /Date must be a valid YYYY-MM-DD date/
  );
  assert.throws(
    () => parseLetterInput({ title: "a", content: "b", date: "tomorrow" }),
    /Date must be a valid YYYY-MM-DD date/
  );
});

test("parseLetterInput on update omits an absent date and rejects an empty update", () => {
  assert.deepEqual(parseLetterInput({ title: "New" }, { partial: true }), { title: "New" });
  assert.throws(() => parseLetterInput({}, { partial: true }), /No fields to update/);
});

test("parseDisplayDate keeps the calendar day", () => {
  assert.equal(parseDisplayDate("Aug 28, 2026").toISOString(), "2026-08-28T00:00:00.000Z");
  assert.equal(parseDisplayDate("not a date", new Date("2026-01-02T05:00:00Z")).toISOString(), "2026-01-02T00:00:00.000Z");
});

test("toApiLetter returns display and ISO dates", () => {
  const result = toApiLetter({
    _id: "665f1c2a9b1e4c0012a34560",
    title: "Hello",
    content: "Body",
    date: new Date("2026-08-28T00:00:00.000Z"),
    createdAt: new Date("2026-08-28T10:00:00.000Z"),
    updatedAt: new Date("2026-08-29T10:00:00.000Z")
  });

  assert.deepEqual(result, {
    id: "665f1c2a9b1e4c0012a34560",
    title: "Hello",
    content: "Body",
    date: "Aug 28, 2026",
    dateISO: "2026-08-28",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-29T10:00:00.000Z"
  });
});

test("ValidationError carries status 400", () => {
  assert.equal(new ValidationError("bad").status, 400);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/server/letterData.test.js`
Expected: FAIL because `server/lib/letterData.js` does not exist.

- [ ] **Step 3: Implement `server/lib/letterData.js`**

Implementation notes:

- `toUtcMidnight(value)` copies the UTC year/month/day of the parsed date into `Date.UTC(...)`.
- `parseDateInput(value)` accepts only `^\d{4}-\d{2}-\d{2}$`; construct with `Date.UTC` and reject when the round-trip components differ (this catches `2026-02-31`).
- `parseDisplayDate` uses a three-letter month map and the same round-trip check; any failure returns `toUtcMidnight(fallback)`.
- `parseLetterInput` trims `title` and `content`, enforces the limits, and treats an absent/empty date on create as `toUtcMidnight(now)` and on update as "leave untouched". It throws `ValidationError("No fields to update.")` when a partial body produces no keys.
- `toApiLetter` accepts a Mongoose document or plain object (`doc.toObject ? doc.toObject() : doc`), uses `String(raw._id)`, and formats dates with the exact `Intl` options from Global Constraints.

- [ ] **Step 4: Create the Mongoose model**

`server/models/Letter.js`:

```js
import mongoose from "mongoose";

const letterSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 50000 },
    date: { type: Date, required: true, default: () => new Date() }
  },
  { timestamps: true }
);

letterSchema.index({ date: 1, createdAt: 1 });

export const Letter =
  mongoose.models.Letter ?? mongoose.model("Letter", letterSchema);
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `node --test tests/server/letterData.test.js`
Expected: 9 passing tests.

---

### Task 3: Admin password middleware

**Files:**
- Create: `server/middleware/requireAdmin.js`
- Create: `tests/server/requireAdmin.test.js`

**Interfaces:**
- Consumes: `node:crypto`.
- Produces: `createRequireAdmin(adminPassword: string) -> (req, res, next) => void`. Reads `req.get("x-admin-password")`; calls `next()` on a constant-time match, otherwise responds `401` with `{ error: "Invalid or missing admin password." }`.

- [ ] **Step 1: Write the failing tests**

`tests/server/requireAdmin.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createRequireAdmin } from "../../server/middleware/requireAdmin.js";

function fakeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("requireAdmin calls next for the correct password", () => {
  let called = false;
  const req = { get: () => "secret" };
  createRequireAdmin("secret")(req, fakeResponse(), () => { called = true; });
  assert.equal(called, true);
});

test("requireAdmin rejects a missing password", () => {
  const res = fakeResponse();
  let called = false;
  createRequireAdmin("secret")({ get: () => undefined }, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /password/i);
});

test("requireAdmin rejects a wrong password", () => {
  const res = fakeResponse();
  let called = false;
  createRequireAdmin("secret")({ get: () => "nope" }, res, () => { called = true; });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/server/requireAdmin.test.js`
Expected: FAIL because the middleware does not exist.

- [ ] **Step 3: Implement `server/middleware/requireAdmin.js`**

Use `timingSafeEqual` from `node:crypto`. Compare `Buffer.byteLength` first; call `timingSafeEqual` only when lengths match.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test tests/server/requireAdmin.test.js`
Expected: 3 passing tests.

---

### Task 4: Express app, letters routes, and API tests

**Files:**
- Create: `server/middleware/errorHandler.js`
- Create: `server/routes/letters.js`
- Create: `server/app.js`
- Create: `tests/server/app.test.js`

**Interfaces:**
- Consumes: `parseLetterInput`, `toApiLetter`, `ValidationError` from Task 2; `createRequireAdmin` from Task 3.
- Produces:
  - `createLettersRouter({ repo, requireAdmin }) -> express.Router`.
  - `errorHandler(err, req, res, next) -> void`.
  - `createApp({ repo, config, distDir = resolve(process.cwd(), "dist") }) -> express.Express`.
  - Repository interface expected by the router:
    - `list() -> Promise<doc[]>`
    - `get(id) -> Promise<doc | null>`
    - `create(data) -> Promise<doc>`
    - `update(id, data) -> Promise<doc | null>`
    - `remove(id) -> Promise<doc | null>`

- [ ] **Step 1: Write the failing API tests**

`tests/server/app.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../../server/app.js";

const PASSWORD = "secret";
const ID_A = "665f1c2a9b1e4c0012a34560";
const ID_B = "665f1c2a9b1e4c0012a34561";

function seed() {
  return [
    {
      _id: ID_A,
      title: "First",
      content: "Body one",
      date: new Date("2026-08-28T00:00:00.000Z"),
      createdAt: new Date("2026-08-28T00:00:00.000Z"),
      updatedAt: new Date("2026-08-28T00:00:00.000Z")
    },
    {
      _id: ID_B,
      title: "Second",
      content: "Body two",
      date: new Date("2026-08-31T00:00:00.000Z"),
      createdAt: new Date("2026-08-31T00:00:00.000Z"),
      updatedAt: new Date("2026-08-31T00:00:00.000Z")
    }
  ];
}

function createFakeRepo(items = seed()) {
  const store = new Map(items.map((item) => [String(item._id), { ...item }]));
  let next = 99;

  return {
    async list() {
      return [...store.values()].sort(
        (a, b) => a.date - b.date || a.createdAt - b.createdAt
      );
    },
    async get(id) {
      return store.get(String(id)) ?? null;
    },
    async create(data) {
      const _id = `665f1c2a9b1e4c0012a345${next++}`;
      const now = new Date("2026-11-23T00:00:00.000Z");
      const doc = { _id, ...data, createdAt: now, updatedAt: now };
      store.set(_id, doc);
      return doc;
    },
    async update(id, data) {
      const doc = store.get(String(id));
      if (!doc) return null;
      Object.assign(doc, data, { updatedAt: new Date("2026-11-24T00:00:00.000Z") });
      return doc;
    },
    async remove(id) {
      const doc = store.get(String(id));
      store.delete(String(id));
      return doc ?? null;
    }
  };
}

async function withApp(fn, repo = createFakeRepo()) {
  const app = createApp({
    repo,
    config: { adminPassword: PASSWORD },
    distDir: "dist-does-not-exist"
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base, repo);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const admin = { "x-admin-password": PASSWORD };

test("GET /api/health returns ok", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test("GET /api/letters returns letters in API shape", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.length, 2);
    assert.equal(body[0].id, ID_A);
    assert.equal(body[0].date, "Aug 28, 2026");
    assert.equal(body[0].dateISO, "2026-08-28");
    assert.equal(body[0].title, "First");
  });
});

test("writes require the admin password", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New", content: "Body" })
    });
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /password/i);
  });
});

test("POST /api/letters creates a letter", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters`, {
      method: "POST",
      headers: { ...admin, "content-type": "application/json" },
      body: JSON.stringify({ title: "  New  ", content: " Body ", date: "2026-09-01" })
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.title, "New");
    assert.equal(body.content, "Body");
    assert.equal(body.dateISO, "2026-09-01");
    assert.ok(body.id);
  });
});

test("POST /api/letters validates fields", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters`, {
      method: "POST",
      headers: { ...admin, "content-type": "application/json" },
      body: JSON.stringify({ title: "", content: "" })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Title is required/);
  });
});

test("PUT /api/letters/:id preserves the date when omitted", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters/${ID_A}`, {
      method: "PUT",
      headers: { ...admin, "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated" })
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.title, "Updated");
    assert.equal(body.dateISO, "2026-08-28");
  });
});

test("PUT and DELETE return 404 for a missing letter", async () => {
  await withApp(async (base) => {
    const update = await fetch(`${base}/api/letters/665f1c2a9b1e4c0012a34599`, {
      method: "PUT",
      headers: { ...admin, "content-type": "application/json" },
      body: JSON.stringify({ title: "Nope" })
    });
    assert.equal(update.status, 404);

    const remove = await fetch(`${base}/api/letters/665f1c2a9b1e4c0012a34599`, {
      method: "DELETE",
      headers: admin
    });
    assert.equal(remove.status, 404);
  });
});

test("malformed ids return 400", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters/not-an-id`, {
      method: "DELETE",
      headers: admin
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Invalid letter id/);
  });
});

test("DELETE removes a letter and returns 204", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters/${ID_A}`, {
      method: "DELETE",
      headers: admin
    });
    assert.equal(response.status, 204);

    const missing = await fetch(`${base}/api/letters/${ID_A}`);
    assert.equal(missing.status, 404);
  });
});

test("POST /api/auth/verify accepts the password", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/auth/verify`, {
      method: "POST",
      headers: admin
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test("unknown API routes return JSON 404", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/nope`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found." });
  });
});

test("malformed JSON returns 400 JSON", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters`, {
      method: "POST",
      headers: { ...admin, "content-type": "application/json" },
      body: "{"
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Invalid JSON body/);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/server/app.test.js`
Expected: FAIL because `server/app.js` does not exist.

- [ ] **Step 3: Implement `server/middleware/errorHandler.js`**

Behavior:

- `err.status` if it is a 4xx; otherwise `500`.
- Map `err.type === "entity.parse.failed"` or `err instanceof SyntaxError && err.status === 400` to `400` with `"Invalid JSON body."`.
- `ValidationError` uses its `status`.
- For `>= 500`, log the error and return `"Internal server error."`; otherwise return `err.message`.

- [ ] **Step 4: Implement `server/routes/letters.js`**

Behavior:

- `GET /` → `repo.list()` mapped through `toApiLetter`.
- `GET /:id` → validate with `mongoose.isValidObjectId`; `400 "Invalid letter id."` when malformed; `404 "Letter not found."` when missing.
- `POST /` → `requireAdmin`, `parseLetterInput(req.body)`, `repo.create(data)`, `201`.
- `PUT /:id` → `requireAdmin`, validate id, `parseLetterInput(req.body, { partial: true })`, `repo.update`, `404` when missing.
- `DELETE /:id` → `requireAdmin`, validate id, `repo.remove`, `204` when found, `404` when missing.
- Wrap async handlers so rejected promises reach `next(error)`.

- [ ] **Step 5: Implement `server/app.js`**

Behavior:

- `app.disable("x-powered-by")`.
- `app.use(express.json({ limit: "100kb" }))`.
- `GET /api/health` → `{ ok: true }`.
- `POST /api/auth/verify` with `requireAdmin` → `{ ok: true }`.
- Mount the letters router at `/api/letters`.
- `app.use("/api", ...)` → `404 { error: "Not found." }`.
- If `distDir` exists: `app.use(express.static(distDir))`; otherwise `GET /` returns a plain-text hint to run `npm run build`.
- Mount `errorHandler` last.
- `requireAdmin` is created once with `config.adminPassword`.

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `node --test tests/server/app.test.js`
Expected: 12 passing tests.

---

### Task 5: Mongo repository, connection, server entry, and seed script

**Files:**
- Create: `server/repositories/letterRepository.js`
- Create: `server/db.js`
- Create: `server/index.js`
- Create: `server/scripts/seed.js`
- Create: `tests/server/startup.test.js`

**Interfaces:**
- Consumes: `loadConfig` (Task 1), `Letter` (Task 2), `createApp` (Task 4), `parseDisplayDate` (Task 2).
- Produces:
  - `createLetterRepository(Letter) -> { list, get, create, update, remove }`.
  - `connectDatabase({ mongoUri, mongoDb }) -> Promise<Connection>`.
  - `disconnectDatabase() -> Promise<void>`.
  - `node server/index.js` starts the app; `node server/scripts/seed.js [--force]` seeds example letters.

- [ ] **Step 1: Write the failing startup test**

`tests/server/startup.test.js`:

```js
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
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/server/startup.test.js`
Expected: FAIL because `server/index.js` does not exist.

- [ ] **Step 3: Implement the repository**

`createLetterRepository(Letter)` methods:

- `list()` → `Letter.find().sort({ date: 1, createdAt: 1 }).lean().exec()`.
- `get(id)` → `Letter.findById(id).lean().exec()`.
- `create(data)` → `const doc = await Letter.create(data); return doc.toObject();`.
- `update(id, data)` → `Letter.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean().exec()`.
- `remove(id)` → `Letter.findByIdAndDelete(id).lean().exec()`.

- [ ] **Step 4: Implement the connection helper**

`connectDatabase({ mongoUri, mongoDb })`:

- `mongoose.set("strictQuery", true)`.
- `await mongoose.connect(mongoUri, { dbName: mongoDb, serverSelectionTimeoutMS: 10000 })`.
- Return `mongoose.connection`.

`disconnectDatabase()` → `mongoose.disconnect()`.

- [ ] **Step 5: Implement `server/index.js`**

Behavior:

- Import `"dotenv/config"` first.
- `loadConfig()`.
- Connect; on failure print the error plus: `Check that your Atlas cluster is running and that this machine's IP is allowed in Atlas Network Access.` then `process.exit(1)`.
- Build the repo and app, then listen on `config.port` and print `API listening on http://localhost:${port}`.
- On `SIGINT`/`SIGTERM`, close the HTTP server, disconnect, and exit 0.

- [ ] **Step 6: Implement the seed script**

Behavior:

- Import `"dotenv/config"`, `loadConfig`, `connectDatabase`, `disconnectDatabase`, `Letter`, `parseDisplayDate`, and `letters` from `../../src/content/letters.example.js`.
- `const force = process.argv.includes("--force")`.
- If `Letter.countDocuments()` is greater than 0 and `!force`: print `Skipping: N letters already exist. Use --force to replace.` and exit 0.
- If `force`: `Letter.deleteMany({})`.
- Insert `letters.map(({ title, content, date }) => ({ title, content, date: parseDisplayDate(date) }))` with `insertMany`.
- Print `Seeded N letters.` and exit 0; on error print and exit 1.
- Always disconnect in a `finally`.

- [ ] **Step 7: Run the test and confirm it passes**

Run: `node --test tests/server/startup.test.js`
Expected: 1 passing test.

- [ ] **Step 8: Confirm the real startup path once `.env` is filled**

Run: `npm.cmd run seed`
Expected: either "Seeded 5 letters." or "Skipping: ...".

Run: `npm.cmd run server`
Expected: `API listening on http://localhost:4000`.

---

### Task 6: Frontend text helpers

**Files:**
- Create: `src/scripts/letterText.js`
- Create: `tests/letterText.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `splitParagraphs(content: string) -> string[]` — split on blank lines, trim end of each, drop empty entries.
  - `escapeHtml(value: unknown) -> string` — escape `& < > " '`.

- [ ] **Step 1: Write the failing tests**

`tests/letterText.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { splitParagraphs, escapeHtml } from "../src/scripts/letterText.js";

test("splitParagraphs splits on blank lines and keeps inner newlines", () => {
  assert.deepEqual(splitParagraphs("One\nline\n\nTwo\n\n\n"), ["One\nline", "Two"]);
  assert.deepEqual(splitParagraphs(""), []);
  assert.deepEqual(splitParagraphs(undefined), []);
});

test("escapeHtml escapes markup characters", () => {
  assert.equal(escapeHtml(`<script>"&'`), "&lt;script&gt;&quot;&amp;&#39;");
  assert.equal(escapeHtml(undefined), "");
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/letterText.test.js`
Expected: FAIL because `src/scripts/letterText.js` does not exist.

- [ ] **Step 3: Implement `src/scripts/letterText.js`**

`splitParagraphs` uses `String(content ?? "").split(/\n\s*\n/).map((part) => part.trimEnd()).filter((part) => part.trim())`.

`escapeHtml` replaces each character through a lookup object.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `node --test tests/letterText.test.js`
Expected: 2 passing tests.

---

### Task 7: Frontend API client

**Files:**
- Create: `src/services/lettersApi.js`
- Create: `tests/lettersApi.test.js`

**Interfaces:**
- Consumes: `fetch`, `import.meta.env?.VITE_API_URL`.
- Produces:
  - `class ApiError extends Error` with `status: number`.
  - `getLetters()`, `getLetter(id)`.
  - `verifyPassword(password)`, `createLetter(data, password)`, `updateLetter(id, data, password)`, `deleteLetter(id, password)`.
  - All admin calls send `x-admin-password`; delete resolves to `null` on `204`; non-2xx throws `ApiError` with the server message; network failure throws `ApiError` with `status: 0`.

- [ ] **Step 1: Write the failing tests**

`tests/lettersApi.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  getLetters,
  createLetter,
  deleteLetter,
  ApiError
} from "../src/services/lettersApi.js";

function stubFetch(t, handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  t.after(() => { globalThis.fetch = original; });
  return calls;
}

test("getLetters requests the public list", async (t) => {
  const calls = stubFetch(t, () =>
    new Response(JSON.stringify([{ id: "1" }]), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  );

  assert.deepEqual(await getLetters(), [{ id: "1" }]);
  assert.equal(calls[0].url, "/api/letters");
  assert.equal(calls[0].options.method, "GET");
});

test("createLetter sends the admin password and JSON body", async (t) => {
  const calls = stubFetch(t, () =>
    new Response(JSON.stringify({ id: "1" }), {
      status: 201,
      headers: { "content-type": "application/json" }
    })
  );

  await createLetter({ title: "Hi", content: "There" }, "secret");
  assert.equal(calls[0].url, "/api/letters");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["x-admin-password"], "secret");
  assert.equal(calls[0].options.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].options.body), { title: "Hi", content: "There" });
});

test("deleteLetter resolves to null on 204", async (t) => {
  stubFetch(t, () => new Response(null, { status: 204 }));
  assert.equal(await deleteLetter("abc", "secret"), null);
});

test("non-2xx responses throw ApiError with the server message", async (t) => {
  stubFetch(t, () =>
    new Response(JSON.stringify({ error: "Title is required." }), {
      status: 400,
      headers: { "content-type": "application/json" }
    })
  );

  await assert.rejects(createLetter({}, "secret"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.equal(error.message, "Title is required.");
    return true;
  });
});

test("network failures throw ApiError with status 0", async (t) => {
  stubFetch(t, () => { throw new TypeError("offline"); });
  await assert.rejects(getLetters(), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    return true;
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `node --test tests/lettersApi.test.js`
Expected: FAIL because `src/services/lettersApi.js` does not exist.

- [ ] **Step 3: Implement `src/services/lettersApi.js`**

Implementation notes:

- `const API_BASE = (import.meta.env?.VITE_API_URL ?? "").replace(/\/$/, "")`.
- `request(path, { method = "GET", body, password } = {})`:
  - Build headers only when needed.
  - `fetch(`${API_BASE}${path}`, ...)` inside `try/catch`; on network failure throw `new ApiError("Could not reach the server.", 0)`.
  - `204` → `null`.
  - Parse JSON defensively; on `!response.ok` throw `new ApiError(data.error || \`Request failed (${response.status}).\`, response.status)`.
- `getLetter(id)` and admin calls encode the id with `encodeURIComponent`.
- `verifyPassword` posts to `/api/auth/verify` with the password header.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `node --test tests/lettersApi.test.js`
Expected: 5 passing tests.

---

### Task 8: Public pages read from the API

**Files:**
- Modify: `src/scripts/main.js`
- Modify: `src/scripts/lettersPage.js`
- Modify: `src/views/letters.html`
- Modify: `src/styles/main.css`
- Modify: `src/styles/letters.css`

**Interfaces:**
- Consumes: `getLetters`, `ApiError` (Task 7); `splitParagraphs`, `escapeHtml` (Task 6); `generatePalette`.
- Produces: browser behavior only.

- [ ] **Step 1: Update `src/scripts/main.js`**

Replace the static import of `letters` with `getLetters()`. Keep the existing envelope markup and `generatePalette`. Requirements:

- Put `Loading letters…` in `#letter-list` before the request.
- Empty array → `No letters yet.` with class `letter-status`.
- Fetch failure → `Could not load letters.` plus a `Retry` button that calls the loader again.
- Success → clear the container and render `[...letters].reverse()`.
- Escape `letter.date` and `letter.title` with `escapeHtml` wherever they are interpolated into `innerHTML`.
- Keep the existing branding footer logic.

- [ ] **Step 2: Update `src/scripts/lettersPage.js`**

Wrap the whole page in `async function init()` and call it. Requirements:

- Read `id` as a string (`params.get("id")`), not an integer.
- If there is no id → show "Letter not found".
- Fetch with `getLetters()`; find `entry.id === requestedId`.
- 404/not found → existing "Letter not found" state.
- Network/API failure (`ApiError.status === 0` or `>= 500`) → "Could not load letter." plus a `Retry` button; hide the envelope, letter, and nav; do not show "not found".
- On success: set the title/date, render paragraphs with `splitParagraphs` and `textContent` (no `innerHTML` for content), apply the palette, and start the existing animation timers.
- Previous/next navigation uses the array order returned by the API.
- Keep the heart animation function unchanged.

- [ ] **Step 3: Add loading and error affordances to `src/views/letters.html`**

- Add `<div id="letter-loading" class="letter-status">Loading letter…</div>` before the envelope.
- Keep `#error-message`; the script sets its text and optionally appends a retry button.
- Do not change the envelope, letter, or nav markup.

- [ ] **Step 4: Add status styles**

In `src/styles/main.css` and `src/styles/letters.css`, add a `.letter-status` rule matching the site's serif body text and muted color, plus a simple retry button style. Keep the existing visual language; no layout redesign.

- [ ] **Step 5: Verify the build**

Run: `npm.cmd run build`
Expected: success; `dist/index.html` and `dist/src/views/letters.html` exist.

---

### Task 9: Dashboard page

**Files:**
- Create: `dashboard.html`
- Create: `src/scripts/dashboard.js`
- Create: `src/styles/dashboard.css`

**Interfaces:**
- Consumes: `getLetters`, `verifyPassword`, `createLetter`, `updateLetter`, `deleteLetter`, `ApiError` (Task 7).
- Produces: `/dashboard.html` UI.

- [ ] **Step 1: Create `dashboard.html`**

Structure:

- Google Fonts links for `Cormorant Garamond` and `EB Garamond` (same families as the site).
- `<link rel="stylesheet" href="src/styles/dashboard.css">`.
- Header with eyebrow "Letters to my love", `<h1>Letters dashboard</h1>`, and a hidden `New letter` button.
- Login panel (`#login-view`) with a password form, error paragraph, and submit button.
- Dashboard view (`#dashboard-view`, hidden) with:
  - toolbar: letter count, `Lock` button.
  - `#status` with `aria-live="polite"`.
  - `#letter-list`.
  - `#editor` panel (hidden) with a form: hidden id, title input (`maxlength="200"`, required), date input (`type="date"`, required), content textarea (required), Cancel and Save buttons, and a form error paragraph.
- `<script type="module" src="src/scripts/dashboard.js"></script>`.

- [ ] **Step 2: Create `src/scripts/dashboard.js`**

Requirements:

- `PASSWORD_KEY = "letters-admin-password"`.
- On load: if `sessionStorage` has a password, call `verifyPassword`; on success show the dashboard, on failure clear it and show the login.
- Login submit: disable the button, call `verifyPassword`, store the password, show the dashboard, load letters; on failure show the server message.
- `showDashboard()` / `showLogin()` toggle `hidden` and the `New letter` button.
- `loadLetters()`: set status "Loading letters…", call `getLetters()`, render newest first (reverse the API order), update the count, clear status; on failure show the message with a retry button.
- Letter rows: title, display date, a 120-character single-line preview, Edit and Delete buttons. Use `textContent` for all user data.
- `openEditor(letter = null)`: reset or populate the form; default the date to today (`new Date().toISOString().slice(0, 10)`); show the editor and focus the title.
- Save: validate title/content/date client-side; disable the submit button; call `createLetter` or `updateLetter`; on success hide the editor, reload, and show a success status; on failure show the message.
- Delete: `confirm(\`Delete "${title}"? This cannot be undone.\`)`; call `deleteLetter`; reload; show status.
- Any `ApiError` with `status === 401`: clear the password, show the login, and set the login error to "Your session expired. Enter the password again."
- `Lock` button clears the password and returns to the login.
- Empty list → "No letters yet. Write the first one."

- [ ] **Step 3: Create `src/styles/dashboard.css`**

Requirements:

- Warm paper background (`#f7f1e8`), ink (`#3a2a1f`), accent (`#8c3b2e`), muted borders.
- Cormorant Garamond headings, EB Garamond body.
- Centered max-width layout (~960px), cards with soft borders and radius, comfortable spacing.
- Buttons: primary filled accent, ghost outlined; disabled state at 60% opacity.
- Form fields full width, visible focus ring, textarea min-height ~18rem.
- Responsive single-column layout below ~700px.
- Do not add a framework or CSS build step.

- [ ] **Step 4: Verify the page builds**

Run: `npm.cmd run build`
Expected: success; `dist/dashboard.html` exists.

---

### Task 10: Vite wiring, CLI deprecation, and README

**Files:**
- Modify: `vite.config.mjs`
- Modify: `src/commands/add.js`
- Modify: `src/commands/remove.js`
- Modify: `README.md`

**Interfaces:**
- Consumes: the dashboard entry and server scripts from earlier tasks.
- Produces: dev proxy, multi-page build, deprecation messages, run instructions.

- [ ] **Step 1: Update `vite.config.mjs`**

Add:

```js
server: {
  proxy: {
    "/api": "http://localhost:4000"
  }
}
```

Add `dashboard: resolve(import.meta.dirname, "dashboard.html")` to `build.rollupOptions.input`.

- [ ] **Step 2: Add deprecation guards to the CLI**

At the start of the executable path in `src/commands/add.js` and `src/commands/remove.js` (before any prompts or file writes), print:

```
This project now stores letters in MongoDB.
Use the dashboard instead: http://localhost:5173/dashboard.html
(or /dashboard.html when the production server is running)
```

Then `process.exit(1)`. Keep the existing files and exports intact; do not delete `src/content/letters.example.js` or `src/services/googleDocs.js`.

- [ ] **Step 3: Update `README.md`**

Add a "Dashboard and MongoDB" section covering:

- Node 22+ and a MongoDB Atlas cluster; allow this machine's IP in Atlas Network Access.
- Copy `.env.example` to `.env`, paste `MONGODB_URI`, set `ADMIN_PASSWORD`.
- On Windows PowerShell use `npm.cmd` (or fix the execution policy).
- Optional seed: `npm.cmd run seed`; reset with `npm.cmd run seed -- --force`.
- Development: `npm.cmd run dev:all`; site at `http://localhost:5173`, dashboard at `http://localhost:5173/dashboard.html`, API at `http://localhost:4000`.
- Production: `npm.cmd run build` then `npm.cmd start`.
- The old `add`/`remove` commands are deprecated and no longer affect the live site.
- Note that the live site now needs the Node server; static-only deployment no longer shows database letters.

- [ ] **Step 4: Run the full automated suite and build**

Run: `npm.cmd test`
Expected: all tests pass.

Run: `npm.cmd run build`
Expected: success; `dist/index.html`, `dist/dashboard.html`, and `dist/src/views/letters.html` exist.

---

### Task 11: End-to-end verification with Atlas

**Files:** none.

**Interfaces:**
- Consumes: everything above and the user's filled `.env`.

- [ ] **Step 1: Confirm `.env` is filled**

The user fills `MONGODB_URI` and `ADMIN_PASSWORD`. Do not print the values.

- [ ] **Step 2: Seed and start**

Run: `npm.cmd run seed`
Run: `npm.cmd run dev:all`

Expected: API on `:4000`, Vite on `:5173`, no startup errors.

- [ ] **Step 3: Verify the public site**

- Main page lists the seeded letters newest first.
- Opening an envelope shows the correct title, date, and paragraphs; previous/next works.
- A letter whose content contains `<b>text</b>` shows the tags literally.

- [ ] **Step 4: Verify the dashboard**

- Wrong password → error, no dashboard.
- Correct password → dashboard, seeded letters listed.
- Create a letter → appears on the public site after refresh.
- Edit its title/date/content → changes appear.
- Delete it → disappears from both.
- Empty title/content → inline validation, no request.
- Clear the database (or use a temporary empty collection) → public site shows "No letters yet."

- [ ] **Step 5: Verify failure states**

- Stop the API (`Ctrl+C` on the server) → main page shows "Could not load letters." with retry; letter page shows "Could not load letter." with retry, not "not found".
- Restart the API → retry works.

- [ ] **Step 6: Verify production mode**

Run: `npm.cmd run build`
Run: `npm.cmd start`
Expected: `http://localhost:4000/` serves the site, `http://localhost:4000/dashboard.html` serves the dashboard, and CRUD still works.
