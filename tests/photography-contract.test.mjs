import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { photographs } from '../src/data/photography.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const gallery = join(root, 'public/images/photography-optimized');
const contract = JSON.parse(await readFile(join(root, 'tests/fixtures/u6-photography-contract.json'), 'utf8'));
const source = JSON.parse(await readFile(join(root, 'tests/fixtures/source-baseline.json'), 'utf8'));
const publicPath = (filename) => `/images/photography-optimized/${filename}`;
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString(), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString(), 'WEBP');
  const chunk = buffer.subarray(12, 16).toString();
  const data = 20;
  if (chunk === 'VP8 ') {
    assert.deepEqual([...buffer.subarray(data + 3, data + 6)], [0x9d, 0x01, 0x2a]);
    return {
      width: buffer.readUInt16LE(data + 6) & 0x3fff,
      height: buffer.readUInt16LE(data + 8) & 0x3fff,
    };
  }
  if (chunk === 'VP8X') {
    return {
      width: buffer.readUIntLE(data + 4, 3) + 1,
      height: buffer.readUIntLE(data + 7, 3) + 1,
    };
  }
  if (chunk === 'VP8L') {
    assert.equal(buffer[data], 0x2f);
    const bits = buffer.readUInt32LE(data + 1);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

test('the typed manifest is the exact reviewed 49-image public contact sheet', () => {
  assert.equal(photographs.length, 49);
  assert.equal(
    sha256(Buffer.from(JSON.stringify(photographs))),
    '57125c6727edd12238e269b211e3c80ffdaabd20f03f1a45ab0e7c5b835d6ee5',
    'Array order, filenames, literal alts, and dimensions must match the reviewed U6 manifest',
  );
  assert.equal(new Set(photographs.map(({ filename }) => filename)).size, 49);
  assert.deepEqual(photographs.map(({ filename }) => publicPath(filename)), contract.visible);

  for (const photo of photographs) {
    assert.ok(photo.alt.trim(), `${photo.filename} needs literal alternative text`);
    assert.ok(Number.isInteger(photo.width) && photo.width > 0, `${photo.filename} needs a positive integer width`);
    assert.ok(Number.isInteger(photo.height) && photo.height > 0, `${photo.filename} needs a positive integer height`);
    assert.doesNotMatch(photo.alt, /(?:DSCF|IMG_|rotated|^library$)/i, `${photo.filename} has a filename-derived alternative`);
  }
});

test('the frozen U1 inventory partitions into visible, withheld, and removed paths', () => {
  assert.equal(contract.original.length, 52);
  assert.deepEqual(contract.original.map(([path]) => path), source.photographyPaths);
  const originalDigest = sha256(Buffer.from(JSON.stringify(contract.original.map(([path, digest]) => ({ path, sha256: digest })))));
  assert.equal(originalDigest, source.photographyIdentitySha256);

  const partition = [
    ...contract.visible,
    ...contract.withheld.map(({ path }) => path),
    contract.removedDuplicate.path,
  ].sort();
  assert.deepEqual(partition, source.photographyPaths);
  assert.equal(new Set(partition).size, 52);
});

test('the source and built galleries publish exactly the 49 reviewed files', async () => {
  assert.deepEqual(contract.target.map(([path]) => path), contract.visible);
  const expected = contract.target.map(([path]) => path.split('/').at(-1)).sort();
  const files = (await readdir(gallery)).sort();
  assert.deepEqual(files, expected);
  assert.equal(files.length, 49);
  assert.ok(!files.includes('IMG_2056.webp'));
  for (const filename of ['DSCF1900.webp', 'DSCF4700.webp']) {
    assert.ok(!files.includes(filename));
    assert.ok(!photographs.some((photo) => photo.filename === filename));
  }

  const builtFiles = (await readdir(join(root, 'dist/images/photography-optimized'))).sort();
  assert.deepEqual(builtFiles, expected);
  for (const filename of ['DSCF1900.webp', 'DSCF4700.webp', 'IMG_2056.webp']) {
    assert.ok(!builtFiles.includes(filename), `${filename} must not enter the built publication tree`);
  }
});

test('every current target preserves its reviewed RIFF/WebP identity', async () => {
  for (const [path, expectedHash] of contract.target) {
    const filename = path.split('/').at(-1);
    const bytes = await readFile(join(gallery, filename));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${filename} is not RIFF`);
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `${filename} is not WebP`);
    assert.equal(sha256(bytes), expectedHash, `${filename} identity drifted`);
  }
});

test('every rendered photograph preserves its reviewed dimensions', async () => {
  for (const photo of photographs) {
    const bytes = await readFile(join(gallery, photo.filename));
    assert.deepEqual(
      webpDimensions(bytes),
      { width: photo.width, height: photo.height },
      `${photo.filename} dimensions differ from the reviewed manifest`,
    );
  }

  for (const transform of contract.transforms) {
    const filename = transform.path.split('/').at(-1);
    const bytes = await readFile(join(gallery, filename));
    assert.equal(sha256(bytes), transform.replacementSha256);
    assert.deepEqual(webpDimensions(bytes), { width: transform.width, height: transform.height });
  }
});
