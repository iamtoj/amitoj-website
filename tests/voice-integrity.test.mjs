import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const fromRoot = (...parts) => join(root, ...parts);

async function markdownSources(directory) {
  const files = (await readdir(fromRoot(directory)))
    .filter((file) => file.endsWith('.md'))
    .sort();

  return Promise.all(files.map(async (file) => ({
    file,
    source: await readFile(fromRoot(directory, file), 'utf8'),
  })));
}

test('public writing does not expose a shared claim-audit dialect', async () => {
  const collections = [
    ...(await markdownSources('src/content/notes')),
    ...(await markdownSources('src/content/reading-annotations')),
  ];

  const auditDialect = [
    /\bdoes not establish\b/i,
    /\bnot evidence\b/i,
    /\bnot a fact (?:this|the)\b/i,
    /\bnarrower (?:question|claim|distinction|implication)\b/i,
    /\bI (?:have not|haven't) (?:measured|counted)[^.]*systematically\b/i,
  ];

  for (const { file, source } of collections) {
    for (const phrase of auditDialect) {
      assert.doesNotMatch(source, phrase, `${file} exposes shared audit diction instead of a local bound`);
    }
  }
});

test('Library annotations use exactly the reviewed two-part form with no orphaned template content', async () => {
  for (const { file, source } of await markdownSources('src/content/reading-annotations')) {
    const body = source.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
    const sections = [...body.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map((match) => match[0]);
    const headings = sections.map((section) => section.match(/<h2\b[^>]*>([^<]+)<\/h2>/)?.[1]);

    assert.deepEqual(headings, ['What Stayed', 'The Argument'], `${file} drifts from the reviewed two-part form`);
    assert.equal(sections.length, 2, `${file} must contain exactly two annotation sections`);
    assert.equal(body, sections.join('\n\n'), `${file} leaves content outside the two reviewed sections`);
    assert.doesNotMatch(body, /<blockquote\b/i, `${file} restores an unverified quotation block`);
    assert.doesNotMatch(source, /Read This If\.\.\.|Skip This If\.\.\./, `${file} retains a generic recommendation tail`);
  }
});

test('static identity copy avoids the retired principles ladder and repeated synthesis template', async () => {
  const principles = await readFile(fromRoot('src/pages/principles.astro'), 'utf8');
  const staticSources = await Promise.all([
    'src/pages/index.astro',
    'src/pages/about.astro',
    'src/pages/practices.astro',
    'src/pages/principles.astro',
    'src/pages/third-enlightenment.astro',
    'src/pages/yoga.astro',
    'src/data/site-facts.ts',
  ].map((path) => readFile(fromRoot(path), 'utf8')));
  const staticCopy = staticSources.join('\n');

  for (const heading of [
    'First: Values set direction. Evidence sets method.',
    'From there: Capabilities are discovered, not declared.',
    'Then: Codify what works.',
    "But always: Protect what matters from what's measurable.",
    "Therefore: Earn autonomy. Don't gamble for it.",
  ]) {
    assert.ok(!principles.includes(heading), `Principles retains generated ladder heading: ${heading}`);
  }

  assert.ok((principles.match(/In this mapping/g) ?? []).length <= 1, 'The Sikh mapping repeats its scaffold');
  assert.ok((staticCopy.match(/as more cognition becomes delegable/g) ?? []).length <= 1, 'Static pages refire the same positioning phrase');
  assert.ok((staticCopy.match(/the same (?:inquiry|question|problem)/gi) ?? []).length <= 1, 'Static pages explain coherence through a repeated template');
});

test('website prose clears banned generated intensifiers', async () => {
  const sources = [
    ...(await markdownSources('src/content/essays')),
    ...(await markdownSources('src/content/notes')),
    ...(await markdownSources('src/content/reading-annotations')),
  ].map(({ source }) => source.replace(/<blockquote\b[\s\S]*?<\/blockquote>/g, '')).join('\n');

  assert.doesNotMatch(sources, /\b(?:obviously|interestingly|indeed)\b/i);
});
