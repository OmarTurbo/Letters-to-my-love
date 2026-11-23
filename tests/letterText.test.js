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
