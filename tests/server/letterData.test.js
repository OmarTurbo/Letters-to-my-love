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
  assert.equal(
    parseDisplayDate("not a date", new Date("2026-01-02T05:00:00Z")).toISOString(),
    "2026-01-02T00:00:00.000Z"
  );
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
