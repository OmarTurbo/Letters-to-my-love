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
      const _id = `665f1c2a9b1e4c0012a34${String(next++).padStart(3, "0")}`;
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
    },
    async removeRepliesByLetter() {}
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

test("non-canonical twelve-character ids return 400", async () => {
  await withApp(async (base) => {
    const response = await fetch(`${base}/api/letters/123456789012`, {
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
