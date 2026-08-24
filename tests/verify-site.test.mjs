import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { verifySite } from '../scripts/verify-site.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');

test('the generated-site report is deterministic and binds the complete route surface', async () => {
  const first = await verifySite({ root, dist });
  const second = await verifySite({ root, dist });

  assert.deepEqual(second, first);
  assert.equal(first.status, 'PASS');
  assert.equal(first.counts.htmlRoutes, 61);
  assert.equal(first.counts.rssItems, 9);
  assert.equal(first.redirects.length, 4);
  assert.match(first.distTreeSha256, /^[a-f0-9]{64}$/);
  assert.match(first.evidenceSha256, /^[a-f0-9]{64}$/);
  const { evidenceSha256, ...evidence } = first;
  assert.equal(
    evidenceSha256,
    createHash('sha256').update(JSON.stringify(evidence)).digest('hex'),
    'The evidence hash must cover the deterministic report payload',
  );
});

test('the generated-site crawl rejects an unexpected public route', { concurrency: false }, async () => {
  const extra = join(dist, '__unexpected-release-route__');
  await mkdir(extra, { recursive: true });
  await writeFile(join(extra, 'index.html'), '<!doctype html><title>Unexpected</title>');

  try {
    await assert.rejects(
      verifySite({ root, dist }),
      /Generated HTML route set.*unexpected-release-route/s,
    );
  } finally {
    await rm(extra, { recursive: true, force: true });
  }
});

test('the generated-site crawl rejects an unresolved fragment', { concurrency: false }, async () => {
  const home = join(dist, 'index.html');
  const original = await readFile(home, 'utf8');
  await writeFile(home, original.replace('</main>', '<a href="#missing-release-fragment">Broken</a></main>'));

  try {
    await assert.rejects(
      verifySite({ root, dist }),
      /Unresolved fragment.*missing-release-fragment/s,
    );
  } finally {
    await writeFile(home, original);
  }
});

test('the generated-site crawl rejects duplicate fragment identifiers', { concurrency: false }, async () => {
  const home = join(dist, 'index.html');
  const original = await readFile(home, 'utf8');
  await writeFile(home, original.replace('</main>', '<span id="main-content"></span></main>'));

  try {
    await assert.rejects(
      verifySite({ root, dist }),
      /Duplicate HTML fragment.*main-content/s,
    );
  } finally {
    await writeFile(home, original);
  }
});

test('the generated-site crawl rejects a bare Vercel hostname leak', { concurrency: false }, async () => {
  const home = join(dist, 'index.html');
  const original = await readFile(home, 'utf8');
  await writeFile(home, original.replace('</main>', '<p>candidate-leak.vercel.app</p></main>'));

  try {
    await assert.rejects(
      verifySite({ root, dist }),
      /Preview hostname.*candidate-leak\.vercel\.app|candidate-leak\.vercel\.app.*Preview hostname/s,
    );
  } finally {
    await writeFile(home, original);
  }
});
