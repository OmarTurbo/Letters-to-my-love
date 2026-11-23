import test from 'node:test';
import assert from 'node:assert/strict';
import { localDateISO } from '../src/scripts/dashboardDate.js';

test('localDateISO uses the local calendar date', () => {
  const date = new Date(2026, 7, 28, 23, 45);
  assert.equal(localDateISO(date), '2026-08-28');
});
