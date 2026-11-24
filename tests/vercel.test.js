import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel configuration sends API requests to the catch-all function', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
  assert.deepEqual(config.rewrites, [
    { source: '/api/:path*', destination: '/api/index.js' }
  ]);
});

test('Vercel function entry point exists', async () => {
  const source = await readFile('api/index.js', 'utf8');
  assert.match(source, /export default async function handler/);
  assert.match(source, /connectDatabase/);
});
