import test from "node:test";
import assert from "node:assert/strict";
import {
  getLetters,
  getReplies,
  postReply,
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
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

test("getLetters requests the public list", async (t) => {
  const calls = stubFetch(
    t,
    () =>
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
  const calls = stubFetch(
    t,
    () =>
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
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    title: "Hi",
    content: "There"
  });
});

test("deleteLetter resolves to null on 204", async (t) => {
  stubFetch(t, () => new Response(null, { status: 204 }));
  assert.equal(await deleteLetter("abc", "secret"), null);
});

test("non-2xx responses throw ApiError with the server message", async (t) => {
  stubFetch(
    t,
    () =>
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
  stubFetch(t, () => {
    throw new TypeError("offline");
  });

  await assert.rejects(getLetters(), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 0);
    return true;
  });
});

test('getReplies and postReply use the letter reply endpoints', async (t) => {
  const calls = stubFetch(t, (url, options) => new Response(JSON.stringify({ url, method: options.method }), {
    status: 201,
    headers: { 'content-type': 'application/json' }
  }));
  await getReplies('letter/1');
  await postReply('letter/1', { authorName: 'Mary', message: 'Hello' });
  assert.equal(calls[0].url, '/api/letters/letter%2F1/replies');
  assert.equal(calls[1].url, '/api/letters/letter%2F1/replies');
  assert.equal(calls[1].options.method, 'POST');
});
