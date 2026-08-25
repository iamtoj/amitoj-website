import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { glob, readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertRenderedRelatedPaths,
  orderedSemanticAtoms,
  renderedEditorialBodyFingerprint,
} from './lib/rendered-editorial-body.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const checkpoint = process.argv.includes('--checkpoint');
const migrationCheckpoint = process.argv.includes('--migration-checkpoint');
const { staticEditorialTargets } = await import('../src/data/editorial-network.ts');
const { practiceClaims, siteFacts, theoryClaims } = await import('../src/data/site-facts.ts');

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), 'utf8'));
}

async function fixtureSha256(path) {
  return createHash('sha256').update(await readFile(join(root, path))).digest('hex');
}

const AUDITED_U10_PRIOR_EVIDENCE_SHA256 = Object.freeze({
  staticSources: '446a00ce859c58a1573fe73cbfa191c85ea49957b43d77923ddff1906673999f',
  sharedClaims: '07c0a3f5da989c9f49e9c142a4afcbb725be704764a55dbd97ad1cb6f11dad0b',
  renderedRoutes: '0df93d27f82d44d48eeee7856b14a9d3ab49990782ac41e591a1948f1b452e72',
  rss: 'a9a251fc6bc6a2b1ddbb13d60366afc734ea14083d1737cf8862566f4436050a',
});

function sha256Json(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sortedEvidence(items, key) {
  return [...items].sort((left, right) => left[key].localeCompare(right[key]));
}

function u10PriorEvidenceSha256(contract) {
  const staticSources = sortedEvidence(contract.staticSourceRevisions.map(({
    source,
    fromSha256,
    renderedRoutes,
  }) => ({ source, fromSha256, renderedRoutes })), 'source');
  const sharedClaims = sortedEvidence(contract.sharedClaimRevisions.map(({
    field,
    from,
    renderedRoutes,
  }) => ({ field, from, renderedRoutes })), 'field');
  const renderedRoutes = sortedEvidence(contract.renderedRouteRevisions.map(({
    route,
    causes,
    changedFields,
    from,
  }) => ({ route, causes, changedFields, from })), 'route');
  const rss = {
    route: contract.rssRevision.route,
    changedEditorialKeys: contract.rssRevision.changedEditorialKeys,
    from: contract.rssRevision.from,
  };
  return {
    staticSources: sha256Json(staticSources),
    sharedClaims: sha256Json(sharedClaims),
    renderedRoutes: sha256Json(renderedRoutes),
    rss: sha256Json(rss),
  };
}

function valueAtPath(object, path) {
  return path.split('.').reduce((value, segment) => value?.[segment], object);
}

function sortedUnique(values, label) {
  const sorted = [...values].sort();
  assert.deepEqual(values, sorted, `${label} must remain deterministically sorted`);
  assert.equal(new Set(values).size, values.length, `${label} must not contain duplicates`);
}

function normalizedText(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function metadataReplacementIsRendered(html, revision) {
  if (revision.field === 'description') {
    const description = html.match(/<meta\s+name=(["'])description\1\s+content=(["'])([\s\S]*?)\2/i)?.[3] ?? '';
    return normalizedText(description) === normalizedText(revision.replacement)
      || normalizedText(html).includes(normalizedText(revision.replacement));
  }
  const replacement = revision.field === 'homeFeature'
    ? revision.replacement?.summary
    : revision.replacement;
  return typeof replacement === 'string'
    && normalizedText(html).includes(normalizedText(replacement));
}

function semanticDigest(html) {
  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[^]*?-->/g, '');
  const headings = [];

  for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'blockquote']) {
    const expression = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    for (const match of main.matchAll(expression)) headings.push(`${tag}:${normalizedText(match[1])}`);
  }

  const refs = [];
  for (const match of main.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    refs.push(`a:${match[1]}`);
  }
  for (const match of main.matchAll(/<img\b([^>]*)>/gi)) {
    const attributes = match[1];
    const src = attributes.match(/src=["']([^"']+)/i)?.[1] ?? '';
    const alt = attributes.match(/alt=["']([^"']*)/i)?.[1] ?? '';
    refs.push(`img:${src}:${alt}`);
  }

  return createHash('sha256').update(JSON.stringify({ headings, refs })).digest('hex');
}

function renderedPageEvidence(html) {
  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[^]*?-->/g, '');
  const semanticAtoms = [];
  for (const match of main.matchAll(/<(h[1-6]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    semanticAtoms.push(`${match[1].toLowerCase()}:${normalizedText(match[2])}`);
  }
  const linkTargets = [...main.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  return {
    mainMarkupSha256: createHash('sha256').update(main.replace(/\s+/g, ' ').trim()).digest('hex'),
    mainSemanticSha256: createHash('sha256').update(JSON.stringify(semanticAtoms)).digest('hex'),
    semanticAtomCount: semanticAtoms.length,
    normalizedTextLength: normalizedText(main).length,
    linkTargetSha256: createHash('sha256').update(JSON.stringify(linkTargets)).digest('hex'),
    linkCount: linkTargets.length,
    title: normalizedText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    description: normalizedText(
      html.match(/<meta\s+name=(["'])description\1\s+content=(["'])([\s\S]*?)\2/i)?.[3] ?? '',
    ),
  };
}

function rssEvidence(source) {
  const items = [...source.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => normalizedText(match[1]));
  return {
    sha256: createHash('sha256').update(source).digest('hex'),
    itemSha256: createHash('sha256').update(JSON.stringify(items)).digest('hex'),
    itemCount: items.length,
  };
}

function routeFor(file) {
  const outputPath = relative(join(root, 'dist'), file);
  return outputPath === 'index.html' ? '/' : `/${outputPath.replace(/\/index\.html$/, '')}`;
}

function parseEntry(source, label) {
  const match = source.match(/^---\n([\s\S]*?)\n---(\n[\s\S]*)$/);
  assert.ok(match, `${label} needs canonical frontmatter`);
  const metadata = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    assert.ok(separator > 0, `${label} has unsupported canonical frontmatter`);
    const field = line.slice(0, separator).trim();
    assert.ok(!(field in metadata), `${label} duplicates ${field}`);
    metadata[field] = JSON.parse(line.slice(separator + 1).trim());
  }
  return { metadata, body: match[2] };
}

function editorialKey(kind, slug) {
  return `${kind}:${slug}`;
}

function refFromKey(key) {
  const [kind, slug, ...rest] = key.split(':');
  assert.equal(rest.length, 0, `Invalid editorial key: ${key}`);
  return { kind, slug };
}

function keyFromLegacyPath(path) {
  if (path.startsWith('/essays/')) return `essay:${path.slice('/essays/'.length)}`;
  if (path.startsWith('/blog/')) return `note:${path.slice('/blog/'.length)}`;
  if (path.startsWith('/library/')) return `annotation:${path.slice('/library/'.length)}`;
  if (path === '/third-enlightenment') return 'static:third-enlightenment';
  if (path === '/yoga') return 'static:yoga';
  assert.fail(`Unregistered legacy continuation destination: ${path}`);
}

function continuationConnection(label) {
  const match = label.match(/ — ([\s\S]+) →$/);
  assert.ok(match, `Legacy continuation label has no separable connection: ${label}`);
  return match[1];
}

function reviewedContinuations(entry, kind) {
  const sourceKey = editorialKey(kind, entry.slug);
  const continuations = [];
  for (const legacy of entry.metadata.continuations ?? []) {
    if (legacy.href === networkContract.replacedContinuations[sourceKey]?.removedPath) {
      continuations.push({ target: refFromKey(networkContract.replacedContinuations[sourceKey].target) });
      continue;
    }
    const targetKey = keyFromLegacyPath(legacy.href);
    const legacyConnection = continuationConnection(legacy.label);
    const revision = networkContract.revisedConnections[`${sourceKey}->${targetKey}`];
    if (revision) assert.equal(revision.removed, legacyConnection, `${sourceKey}->${targetKey} lacks its pre-U3 bridge`);
    continuations.push({
      target: refFromKey(targetKey),
      connection: revision?.connection ?? legacyConnection,
    });
  }
  if (networkContract.addedContinuations[sourceKey]) {
    assert.equal(continuations.length, 0, `${sourceKey} already had a U2 continuation`);
    continuations.push({ target: refFromKey(networkContract.addedContinuations[sourceKey]) });
  }
  for (const addition of u7Contract.addedConnections.filter(({ key }) => key.startsWith(`${sourceKey}->`))) {
    const targetKey = addition.key.slice(`${sourceKey}->`.length);
    const continuation = continuations.find(({ target }) => editorialKey(target.kind, target.slug) === targetKey);
    assert.ok(continuation, `${addition.key} lacks its U3 continuation`);
    assert.equal(continuation.connection, undefined, `${addition.key} is not an addition`);
    continuation.connection = addition.connection;
  }
  for (const revision of u7Contract.revisedConnections.filter(({ key }) => key.startsWith(`${sourceKey}->`))) {
    const targetKey = revision.key.slice(`${sourceKey}->`.length);
    const continuation = continuations.find(({ target }) => editorialKey(target.kind, target.slug) === targetKey);
    assert.ok(continuation, `${revision.key} lacks its U3 continuation`);
    assert.equal(continuation.connection, revision.removed, `${revision.key} lacks its pre-U7 bridge`);
    continuation.connection = revision.connection;
  }
  if (u7Contract.publicationTransitions.some(({ key }) => key === sourceKey)) continuations.splice(0);
  return continuations;
}

function baselineSourceEvidence(entry, kind) {
  if (kind === 'note') return { kind: 'raw-note-body', sha256: entry.rawNoteBodySha256 };
  return {
    kind: 'ordered-semantic-atoms',
    sha256: entry.semanticAtomsSha256,
    atomCount: entry.semanticAtomCount,
  };
}

function currentSourceEvidence(entry, kind) {
  if (kind === 'note') {
    return { kind: 'raw-note-body', sha256: createHash('sha256').update(entry.body).digest('hex') };
  }
  const atoms = orderedSemanticAtoms(entry.body.trim());
  return {
    kind: 'ordered-semantic-atoms',
    sha256: createHash('sha256').update(JSON.stringify(atoms)).digest('hex'),
    atomCount: atoms.length,
  };
}

const source = await readJson('tests/fixtures/source-baseline.json');
const publicBaseline = await readJson('tests/fixtures/public-baseline.json');
const networkContract = await readJson('tests/fixtures/u3-network-contract.json');
const renderedBodyContract = await readJson('tests/fixtures/u3-rendered-body-contract.json');
const photographyContract = await readJson('tests/fixtures/u6-photography-contract.json');
const u7Contract = await readJson('tests/fixtures/u7-publication-voice-contract.json');
const u9Contract = await readJson('tests/fixtures/u9-third-enlightenment-draft-contract.json');
const u10Contract = await readJson('tests/fixtures/u10-voice-revision-contract.json');

assert.deepEqual(
  Object.fromEntries(await Promise.all(Object.entries({
    sourceBaseline: 'tests/fixtures/source-baseline.json',
    publicBaseline: 'tests/fixtures/public-baseline.json',
    migrationBaseline: 'tests/fixtures/post-migration-baseline.json',
    networkContract: 'tests/fixtures/u3-network-contract.json',
    renderedBodyContract: 'tests/fixtures/u3-rendered-body-contract.json',
  }).map(async ([key, path]) => [key, await fixtureSha256(path)]))),
  u7Contract.frozenFixtureSha256,
  'Frozen U1-U3 fixture bytes changed instead of receiving an explicit U7 overlay',
);

assert.deepEqual(
  Object.fromEntries(await Promise.all(Object.entries({
    sourceBaseline: 'tests/fixtures/source-baseline.json',
    publicBaseline: 'tests/fixtures/public-baseline.json',
    migrationBaseline: 'tests/fixtures/post-migration-baseline.json',
    networkContract: 'tests/fixtures/u3-network-contract.json',
    renderedBodyContract: 'tests/fixtures/u3-rendered-body-contract.json',
    photographyContract: 'tests/fixtures/u6-photography-contract.json',
    u7Contract: 'tests/fixtures/u7-publication-voice-contract.json',
    u9Contract: 'tests/fixtures/u9-third-enlightenment-draft-contract.json',
  }).map(async ([key, path]) => [key, await fixtureSha256(path)]))),
  u10Contract.frozenFixtureSha256,
  'Frozen U1-U3, U6, U7, or U9 fixture bytes changed instead of receiving an explicit U10 overlay',
);

assert.deepEqual(
  u10PriorEvidenceSha256(u10Contract),
  AUDITED_U10_PRIOR_EVIDENCE_SHA256,
  'U10 prior static, shared-claim, rendered-route, or RSS evidence drifted from the independently audited pre-revision build',
);

assert.equal(source.branchPointCommit, publicBaseline.production.sourceCommit);
assert.equal(publicBaseline.production.www.status, 200);
assert.equal(publicBaseline.production.apex.status, 308);
assert.equal(publicBaseline.production.apex.location, publicBaseline.production.www.url);
assert.equal(source.essays.length, 4);
assert.equal(source.notes.length, 6);
assert.equal(source.readingAnnotations.length, 38);
assert.equal(source.photographyPaths.length, 52);
sortedUnique(source.essays, 'Essay baseline');
sortedUnique(source.notes, 'Note baseline');
sortedUnique(source.readingAnnotations, 'Reading Annotation baseline');
sortedUnique(source.photographyPaths, 'Photography baseline');

const routePaths = publicBaseline.routes.map(([path]) => path);
assert.equal(routePaths.length, 59);
sortedUnique(routePaths, 'Public route baseline');
assert.equal(new Set(publicBaseline.routes.map(([, digest]) => digest)).size, 59);

assert.equal(publicBaseline.lighthouse.runsPerRoute, 3);
assert.equal(Object.keys(publicBaseline.lighthouse.routes).length, 8);
for (const [path, evidence] of Object.entries(publicBaseline.lighthouse.routes)) {
  assert.equal(evidence.runs.length, 3, `${path} must retain three Lighthouse runs`);
  const calculatedMedian = evidence.runs[0].map((_, index) =>
    [...evidence.runs.map((scores) => scores[index])].sort((a, b) => a - b)[1]
  );
  assert.deepEqual(evidence.median, calculatedMedian, `${path} Lighthouse median is inconsistent`);
}

assert.equal(photographyContract.original.length, 52, 'The U6 fixture must retain all 52 original photographs');
const originalPhotos = photographyContract.original.map(([path, sha256]) => ({ path, sha256 }));
assert.deepEqual(originalPhotos.map(({ path }) => path), source.photographyPaths, 'The U6 fixture changed the original path order');
const photographyDigest = createHash('sha256').update(JSON.stringify(originalPhotos)).digest('hex');
assert.equal(photographyDigest, source.photographyIdentitySha256, 'The frozen 52-file photography identity drifted');
assert.equal(photographyContract.originalIdentitySha256, source.photographyIdentitySha256);

const visiblePhotographyPaths = photographyContract.visible;
const withheldPhotographyPaths = photographyContract.withheld.map(({ path }) => path);
const removedPhotographyPath = photographyContract.removedDuplicate.path;
const originalPartition = [...visiblePhotographyPaths, ...withheldPhotographyPaths, removedPhotographyPath].sort();
assert.deepEqual(originalPartition, source.photographyPaths, 'The original 52 paths must partition into visible, withheld, and removed files');
assert.equal(new Set(originalPartition).size, 52, 'The photography transition sets must remain disjoint');

if (checkpoint) {
  const expectedSources = [
    ['Essay', 'src/pages/essays', '.astro', source.essays],
    ['Note', 'src/content/blog', '.md', source.notes],
    ['Reading Annotation', 'src/pages/library', '.astro', source.readingAnnotations],
  ];
  for (const [label, directory, extension, expected] of expectedSources) {
    const actual = (await readdir(join(root, directory)))
      .filter((file) => file.endsWith(extension) && file !== `index${extension}`)
      .map((file) => basename(file, extension))
      .sort();
    assert.deepEqual(actual, expected, `${label} source inventory drifted during runtime modernization`);
  }

}

if (checkpoint || migrationCheckpoint) {
  const expectedRoutes = migrationCheckpoint
    ? [
      ...routePaths.filter((path) => !['/essays', '/work', '/blog/the-third-enlightenment'].includes(path)),
      '/research',
      '/practices',
      '/coaching',
      '/contact/thanks',
    ].sort()
    : routePaths;
  const outputFiles = (await Array.fromAsync(glob('**/index.html', { cwd: join(root, 'dist') })))
    .map((file) => join(root, 'dist', file));
  const actualRoutes = outputFiles.map(routeFor).sort();
  assert.deepEqual(actualRoutes, expectedRoutes, 'Generated route set differs from the applicable reconciled baseline');

  const sourceOutputExceptions = new Map(source.branchPointOutputExceptions);
  const migration = migrationCheckpoint
    ? await readJson('tests/fixtures/post-migration-baseline.json')
    : undefined;
  const editorialRoutes = new Set(migrationCheckpoint ? [
    '/writing',
    '/library',
    ...migration.essays.map(({ route }) => route),
    ...migration.notes.map(({ route }) => route),
    ...migration.readingAnnotations.map(({ route }) => route),
    ...networkContract.metadataRevisions.flatMap(({ renderedRoutes }) => renderedRoutes),
  ] : []);
  const reviewedRenderedRoutes = new Set(migrationCheckpoint
    ? [
      '/contact',
      ...u10Contract.renderedRouteRevisions.map(({ route }) => route),
    ]
    : []);
  for (const [path, expectedDigest] of publicBaseline.routes) {
    if (migrationCheckpoint && ['/essays', '/work', '/blog/the-third-enlightenment'].includes(path)) continue;
    const relativePath = path === '/' ? 'index.html' : `${path.slice(1)}/index.html`;
    const html = await readFile(join(root, 'dist', relativePath), 'utf8');
    if (path in source.rendererExceptions) {
      assert.match(html, /http-equiv=["']refresh["']/i, `${path} must remain a static redirect`);
      assert.match(html, /(?:url=|href=["'])https?:\/\/[^"']+\/writing/i, `${path} must still redirect to /writing`);
      continue;
    }
    if (migrationCheckpoint && (editorialRoutes.has(path) || reviewedRenderedRoutes.has(path))) continue;
    const reconciledDigest = sourceOutputExceptions.get(path) ?? expectedDigest;
    assert.equal(semanticDigest(html), reconciledDigest, `${path} differs from its reconciled baseline`);
  }

  if (migrationCheckpoint) {
    const vercel = await readJson('vercel.json');
    assert.deepEqual(
      vercel.redirects?.find(({ source: path }) => path === '/essays'),
      { source: '/essays', destination: '/writing', permanent: true },
      'The removed /essays output needs its one-hop permanent Vercel redirect',
    );
    assert.deepEqual(
      vercel.redirects?.find(({ source: path }) => path === '/work'),
      { source: '/work', destination: '/research', permanent: true },
      'The removed /work output needs its one-hop permanent Vercel redirect',
    );
    const retiredNoteRedirect = u7Contract.publicationTransitions[0].redirect;
    assert.deepEqual(
      vercel.redirects?.find(({ source: path }) => path === retiredNoteRedirect.source),
      retiredNoteRedirect,
      'The retired Third Enlightenment Note needs its one-hop permanent redirect',
    );
    assert.equal(vercel.redirects?.filter(({ source: path }) => path === retiredNoteRedirect.source).length, 1);
    assert.equal(vercel.redirects?.some(({ source: path }) => path === retiredNoteRedirect.destination), false);
    assert.ok(
      actualRoutes.includes('/research') && !actualRoutes.includes('/work'),
      'U5 must atomically replace the generated /work route with /research',
    );
    assert.ok(
      actualRoutes.includes('/third-enlightenment') && !actualRoutes.includes(retiredNoteRedirect.source),
      'U7 must retire the obsolete Note route while retaining the canonical working-theory page',
    );

    const historicalMigratedEntries = [
      ...migration.essays.map((entry) => ({
        ...entry,
        expectedTitle: `${entry.metadata.title} | Amitoj Singh`,
      })),
      ...migration.notes.map((entry) => ({
        ...entry,
        expectedTitle: `${entry.metadata.title} | Amitoj Singh`,
      })),
      ...migration.readingAnnotations.map((entry) => ({
        ...entry,
        expectedTitle: entry.metadata.pageTitle,
      })),
    ];
    const retiredEditorialRoutes = new Set(u7Contract.publicationTransitions.map(({ redirect }) => redirect.source));
    const migratedEntries = historicalMigratedEntries
      .filter(({ route }) => !retiredEditorialRoutes.has(route))
      .map((entry) => {
        const kind = entry.route.startsWith('/essays/')
          ? 'essay'
          : entry.route.startsWith('/blog/')
            ? 'note'
            : 'annotation';
        const key = editorialKey(kind, entry.slug);
        let metadata = structuredClone(entry.metadata);
        for (const revision of networkContract.metadataRevisions.filter(({ key: revisionKey }) => revisionKey === key)) {
          const path = revision.field.split('.');
          const field = path.pop();
          const container = path.reduce((value, segment) => value[segment], metadata);
          assert.deepEqual(container[field], revision.removed, `${key}.${revision.field} lacks pre-U3 metadata`);
          container[field] = revision.replacement;
        }
        for (const revision of u7Contract.metadataRevisions.filter(({ key: revisionKey }) => revisionKey === key)) {
          assert.deepEqual(metadata[revision.field], revision.removed, `${key}.${revision.field} lacks pre-U7 metadata`);
          metadata[revision.field] = revision.replacement;
        }
        for (const removal of u7Contract.removedMetadataFields.filter(({ key: removedKey }) => removedKey === key)) {
          assert.deepEqual(metadata[removal.field], removal.removed, `${key}.${removal.field} lacks pre-U7 metadata`);
          delete metadata[removal.field];
        }
        metadata.continuations = reviewedContinuations(entry, kind);
        if (u9Contract.draftRevision.key === key) {
          assert.deepEqual(u9Contract.draftRevision.from.metadata, metadata, `${key} U9 metadata does not bind U7`);
          metadata = structuredClone(u9Contract.draftRevision.to.metadata);
        }
        const u10Revision = u10Contract.editorialRevisions.find(({ key: revisionKey }) => revisionKey === key);
        if (u10Revision) {
          assert.deepEqual(u10Revision.from.metadata, metadata, `${key} U10 metadata does not bind U9`);
          return {
            ...entry,
            metadata: structuredClone(u10Revision.to.metadata),
            expectedTitle: kind === 'annotation'
              ? u10Revision.to.metadata.pageTitle
              : `${u10Revision.to.metadata.title} | Amitoj Singh`,
          };
        }
        return { ...entry, metadata };
      });
    const relationContextsByKey = new Map([
      ...migratedEntries.map((entry) => {
        const kind = entry.route.startsWith('/essays/')
          ? 'essay'
          : entry.route.startsWith('/blog/')
            ? 'note'
            : 'annotation';
        const context = kind === 'essay'
          ? entry.metadata.summary
          : kind === 'note'
            ? entry.metadata.description
            : entry.metadata.teaser;
        return [`${kind}:${entry.slug}`, context];
      }),
      ...staticEditorialTargets.map((target) => [
        `${target.ref.kind}:${target.ref.slug}`,
        target.context,
      ]),
    ]);

    assert.deepEqual(
      Object.keys(renderedBodyContract).sort(),
      ['authority', 'entries', 'schemaVersion'].sort(),
      'Rendered body contract has an unexpected top-level shape',
    );
    assert.equal(renderedBodyContract.schemaVersion, 1);
    assert.match(renderedBodyContract.authority, /frozen U2/i);
    assert.equal(renderedBodyContract.entries.length, 48, 'Rendered body contract must cover all 48 public editorial details');
    assert.deepEqual(
      renderedBodyContract.entries.map(({ kind, slug, route }) => ({ kind, slug, route })),
      historicalMigratedEntries.map((entry) => ({
        kind: entry.route.startsWith('/essays/') ? 'essay' : entry.route.startsWith('/blog/') ? 'note' : 'annotation',
        slug: entry.slug,
        route: entry.route,
      })),
      'Rendered body contract inventory/order must exactly match the frozen U2 editorial baseline',
    );

    const renderedBodiesByRoute = new Map(renderedBodyContract.entries.map((entry) => {
      assert.deepEqual(
        Object.keys(entry).sort(),
        ['kind', 'normalizedTextLength', 'orderedSemanticSha256', 'route', 'semanticAtomCount', 'slug'].sort(),
        `${entry.route ?? 'Unknown route'} rendered body contract has an unexpected shape`,
      );
      assert.match(entry.orderedSemanticSha256, /^[a-f0-9]{64}$/, `${entry.route} needs a rendered-body digest`);
      assert.ok(entry.semanticAtomCount > 0, `${entry.route} needs rendered semantic atoms`);
      assert.ok(entry.normalizedTextLength > 0, `${entry.route} needs rendered canonical text`);
      return [entry.route, entry];
    }));
    assert.deepEqual(
      u7Contract.bodyRevisions.map(({ route }) => route).sort(),
      migratedEntries
        .filter(({ route }) => {
          const baselineBody = renderedBodiesByRoute.get(route);
          return u7Contract.bodyRevisions.some(({ route: revisedRoute }) => revisedRoute === route)
            && Boolean(baselineBody);
        })
        .map(({ route }) => route)
        .sort(),
      'Every U7 body revision must resolve to one current public editorial route',
    );

    for (const entry of migratedEntries) {
      const html = await readFile(join(root, 'dist', entry.route.slice(1), 'index.html'), 'utf8');
      const frozenRendered = renderedBodiesByRoute.get(entry.route);
      const kind = entry.route.startsWith('/essays/')
        ? 'essay'
        : entry.route.startsWith('/blog/')
          ? 'note'
          : 'annotation';
      const key = editorialKey(kind, entry.slug);
      const sourceDirectory = kind === 'essay' ? 'essays' : kind === 'note' ? 'notes' : 'reading-annotations';
      const sourcePath = join(root, 'src/content', sourceDirectory, `${entry.slug}.md`);
      const source = parseEntry(await readFile(sourcePath, 'utf8'), sourcePath);
      assert.deepEqual(source.metadata, entry.metadata, `${key} source metadata differs from the ordered reducer`);

      const frozenRenderedEvidence = {
        orderedSemanticSha256: frozenRendered.orderedSemanticSha256,
        semanticAtomCount: frozenRendered.semanticAtomCount,
        normalizedTextLength: frozenRendered.normalizedTextLength,
      };
      let priorRendered = frozenRenderedEvidence;
      let priorSource = baselineSourceEvidence(entry, kind);
      const u7Revision = u7Contract.bodyRevisions.find(({ route }) => route === entry.route);
      if (u7Revision) {
        assert.deepEqual(u7Revision.from.rendered, priorRendered, `${entry.route} U7 rendering must bind U3`);
        assert.deepEqual(u7Revision.from.source, priorSource, `${key} U7 source must bind U2`);
        priorRendered = u7Revision.to.rendered;
        priorSource = u7Revision.to.source;
      }
      if (u9Contract.draftRevision.key === key) {
        assert.deepEqual(u9Contract.draftRevision.from.body, priorSource, `${key} U9 source must bind U7`);
        priorSource = u9Contract.draftRevision.to.body;
      }
      const u10Revision = u10Contract.editorialRevisions.find(({ key: revisionKey }) => revisionKey === key);
      const actualRendered = renderedEditorialBodyFingerprint(html);
      const actualSource = currentSourceEvidence(source, kind);
      if (u10Revision) {
        assert.deepEqual(u10Revision.from.rendered, priorRendered, `${entry.route} U10 rendering must bind U7`);
        assert.deepEqual(u10Revision.from.source, priorSource, `${key} U10 source must bind U9`);
        assert.deepEqual(actualRendered, u10Revision.to.rendered, `${entry.route} differs from reviewed U10 rendering`);
        assert.deepEqual(actualSource, u10Revision.to.source, `${key} differs from reviewed U10 source evidence`);
      } else {
        assert.deepEqual(actualRendered, priorRendered, `${entry.route} rendered body drifted without a U10 revision`);
        assert.deepEqual(actualSource, priorSource, `${key} source body drifted without a U10 revision`);
      }
      const actualTitle = normalizedText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
      const descriptionMatch = html.match(
        /<meta\s+name=(["'])description\1\s+content=(["'])([\s\S]*?)\2/i,
      );
      const actualDescription = normalizedText(
        descriptionMatch?.[3],
      );
      assert.equal(actualTitle, entry.expectedTitle, `${entry.route} rendered title differs from canonical metadata`);
      assert.equal(actualDescription, entry.metadata.description, `${entry.route} rendered description differs from canonical metadata`);

      const fields = source.metadata;
      const form = kind === 'essay' ? 'Essay' : kind === 'note' ? 'Note' : 'Reading annotation';
      const context = kind === 'essay' ? fields.summary : kind === 'note' ? fields.description : fields.teaser;
      assert.match(html, new RegExp(`data-editorial-form=["']${form}["']`), `${entry.route} must expose its editorial form`);
      assert.ok(normalizedText(html).includes(normalizedText(context)), `${entry.route} must expose its canonical context`);
      const expectedRelations = fields.continuations.map(({ target, connection }) => {
        const key = `${target.kind}:${target.slug}`;
        const text = connection ?? relationContextsByKey.get(key);
        assert.ok(text, `${entry.route} relation ${key} needs canonical connection or context copy`);
        return { key, text };
      });
      assertRenderedRelatedPaths(html, expectedRelations, entry.route);
    }

    assert.equal(migratedEntries.length, u7Contract.currentPublication.publicEditorialDetails);
    assert.equal(migratedEntries.length, u10Contract.publicationSnapshot.publicEditorialDetails);

    for (const revision of u10Contract.staticSourceRevisions) {
      const source = await readFile(join(root, revision.source), 'utf8');
      assert.equal(
        createHash('sha256').update(source).digest('hex'),
        revision.toSha256,
        `${revision.source} differs from reviewed U10 source evidence`,
      );
      assert.notEqual(revision.fromSha256, revision.toSha256, `${revision.source} U10 source revision must not be a no-op`);
    }
    const currentSharedClaims = { practiceClaims, siteFacts, theoryClaims };
    for (const revision of u10Contract.sharedClaimRevisions) {
      assert.deepEqual(
        valueAtPath(currentSharedClaims, revision.field),
        revision.to ?? undefined,
        `${revision.field} differs from reviewed U10 shared-claim evidence`,
      );
      assert.notDeepEqual(revision.from, revision.to, `${revision.field} U10 claim revision must not be a no-op`);
    }
    for (const revision of u10Contract.renderedRouteRevisions) {
      const relativePath = revision.route === '/' ? 'index.html' : `${revision.route.slice(1)}/index.html`;
      const html = await readFile(join(root, 'dist', relativePath), 'utf8');
      assert.deepEqual(
        renderedPageEvidence(html),
        revision.to,
        `${revision.route} differs from reviewed U10 route evidence`,
      );
      assert.notDeepEqual(revision.from, revision.to, `${revision.route} U10 route revision must not be a no-op`);
    }
    const rssSource = await readFile(join(root, 'dist/rss.xml'), 'utf8');
    assert.deepEqual(rssEvidence(rssSource), u10Contract.rssRevision.to, '/rss.xml differs from reviewed U10 evidence');
    assert.notDeepEqual(u10Contract.rssRevision.from, u10Contract.rssRevision.to, 'U10 RSS revision must not be a no-op');

    const privateDraftRevision = u10Contract.editorialRevisions.find(({ key }) => key === u10Contract.privateDraft.key);
    assert.ok(privateDraftRevision, 'U10 private draft must have one editorial revision');
    const privateDraftBaseline = migration.notes.find(({ slug }) => slug === 'the-third-enlightenment');
    assert.ok(privateDraftBaseline, 'The private Third Enlightenment draft needs U2 evidence');
    let privateDraftPriorMetadata = structuredClone(privateDraftBaseline.metadata);
    for (const revision of networkContract.metadataRevisions.filter(({ key }) => key === u10Contract.privateDraft.key)) {
      const path = revision.field.split('.');
      const field = path.pop();
      const container = path.reduce((value, segment) => value[segment], privateDraftPriorMetadata);
      assert.deepEqual(container[field], revision.removed, `${revision.key}.${revision.field} lacks pre-U3 metadata`);
      container[field] = revision.replacement;
    }
    for (const removal of u7Contract.removedMetadataFields.filter(({ key }) => key === u10Contract.privateDraft.key)) {
      assert.deepEqual(privateDraftPriorMetadata[removal.field], removal.removed, `${removal.key}.${removal.field} lacks pre-U7 metadata`);
      delete privateDraftPriorMetadata[removal.field];
    }
    for (const revision of u7Contract.metadataRevisions.filter(({ key }) => key === u10Contract.privateDraft.key)) {
      assert.deepEqual(privateDraftPriorMetadata[revision.field], revision.removed, `${revision.key}.${revision.field} lacks pre-U7 metadata`);
      privateDraftPriorMetadata[revision.field] = revision.replacement;
    }
    const privatePublicationTransition = u7Contract.publicationTransitions.find(({ key }) => key === u10Contract.privateDraft.key);
    assert.ok(privatePublicationTransition, 'The private Third Enlightenment draft needs its U7 publication transition');
    assert.equal(privateDraftPriorMetadata.publicationStatus, privatePublicationTransition.from);
    privateDraftPriorMetadata.publicationStatus = privatePublicationTransition.to;
    privateDraftPriorMetadata.continuations = reviewedContinuations(privateDraftBaseline, 'note');
    assert.deepEqual(u9Contract.draftRevision.from.metadata, privateDraftPriorMetadata, 'U9 private draft metadata must bind U7');
    let privateDraftPriorSource = baselineSourceEvidence(privateDraftBaseline, 'note');
    const privateU7BodyRevision = u7Contract.bodyRevisions.find(({ key }) => key === u10Contract.privateDraft.key);
    if (privateU7BodyRevision) {
      assert.deepEqual(privateU7BodyRevision.from.source, privateDraftPriorSource, 'U7 private draft body must bind U2');
      privateDraftPriorSource = privateU7BodyRevision.to.source;
    }
    assert.deepEqual(u9Contract.draftRevision.from.body, privateDraftPriorSource, 'U9 private draft body must bind U7');
    const privateDraftSource = parseEntry(
      await readFile(join(root, u10Contract.privateDraft.canonicalSource), 'utf8'),
      u10Contract.privateDraft.canonicalSource,
    );
    assert.deepEqual(privateDraftRevision.from.metadata, u9Contract.draftRevision.to.metadata, 'U10 private draft metadata must bind U9');
    assert.deepEqual(privateDraftRevision.from.source, u9Contract.draftRevision.to.body, 'U10 private draft body must bind U9');
    assert.deepEqual(privateDraftSource.metadata, privateDraftRevision.to.metadata, 'U10 private draft metadata drifted');
    assert.deepEqual(currentSourceEvidence(privateDraftSource, 'note'), privateDraftRevision.to.source, 'U10 private draft body drifted');
    assert.equal(privateDraftSource.metadata.publicationStatus, 'draft');
    assert.deepEqual(privateDraftSource.metadata.continuations, []);
    assert.equal(u10Contract.privateDraft.route, null);
    assert.equal(u10Contract.privateDraft.publicReferences, 0);
    assert.equal(actualRoutes.includes('/blog/the-third-enlightenment'), false);
    const thirdDraftReferences = [];
    for (const path of await Array.fromAsync(glob('src/**/*', { cwd: root }))) {
      if (!/\.(?:astro|md|ts)$/.test(path) || path === u10Contract.privateDraft.canonicalSource) continue;
      const text = await readFile(join(root, path), 'utf8');
      if (text.includes('the-third-enlightenment')) thirdDraftReferences.push(path);
    }
    assert.deepEqual(thirdDraftReferences, [], 'The private Third Enlightenment draft gained a public source reference');

    const writingHtml = await readFile(join(root, 'dist/writing/index.html'), 'utf8');
    assert.equal([...writingHtml.matchAll(/data-writing-essay=/g)].length, 4, '/writing must list four Essays');
    assert.equal([...writingHtml.matchAll(/data-writing-note=/g)].length, 5, '/writing must list five current Notes');
    assert.doesNotMatch(writingHtml, /\/blog\/the-third-enlightenment/, '/writing must omit the retired Note');
    for (const trail of networkContract.trails) {
      const trailStart = writingHtml.indexOf(`data-inquiry-trail="${trail.id}"`);
      assert.ok(trailStart >= 0, `/writing is missing trail ${trail.id}`);
      const trailEnd = writingHtml.indexOf('</article>', trailStart);
      assert.ok(trailEnd > trailStart, `/writing has an unclosed trail ${trail.id}`);
      const renderedTrail = writingHtml.slice(trailStart, trailEnd);
      assert.ok(normalizedText(renderedTrail).includes(trail.question), `/writing changed the question for ${trail.id}`);
      assert.deepEqual(
        [...renderedTrail.matchAll(/data-trail-object=["']([^"']+)["']/g)].map((match) => match[1]),
        trail.objects,
        `/writing changed the object order for ${trail.id}`,
      );
    }

    const libraryHtml = await readFile(join(root, 'dist/library/index.html'), 'utf8');
    assert.equal([...libraryHtml.matchAll(/data-library-slug=/g)].length, 38, '/library must render all 38 annotations');
    assert.match(libraryHtml, /type="button"[^>]*aria-pressed=/, '/library filters need button and pressed-state semantics');
    assert.match(libraryHtml, /role="status"[^>]*aria-live="polite"/, '/library needs a polite result announcement');

    const u10MetadataRevisions = u10Contract.editorialRevisions.flatMap((revision) =>
      revision.changedMetadataFields
        .filter(() => revision.route)
        .map((field) => ({
          key: revision.key,
          field,
          replacement: revision.to.metadata[field],
          renderedRoutes: [revision.route],
          reason: revision.reason,
        })));
    const reviewedMetadataRevisions = [
      ...networkContract.metadataRevisions,
      ...u7Contract.metadataRevisions,
      ...u10MetadataRevisions,
    ]
      .filter((revision, index, revisions) => index === revisions.findLastIndex(
        (candidate) => candidate.key === revision.key && candidate.field === revision.field,
      ));
    for (const revision of reviewedMetadataRevisions) {
      assert.ok(revision.reason && revision.renderedRoutes.length > 0, `${revision.key}.${revision.field} needs current review evidence and rendered scope`);
      for (const route of revision.renderedRoutes) {
        const relativePath = route === '/' ? 'index.html' : `${route.slice(1)}/index.html`;
        const revisedHtml = await readFile(join(root, 'dist', relativePath), 'utf8');
        assert.ok(
          metadataReplacementIsRendered(revisedHtml, revision),
          `${route} does not render the current reviewed ${revision.key}.${revision.field} replacement`,
        );
      }
    }
  }
}

console.log(
  migrationCheckpoint
    ? 'Migration checkpoint passed: immutable U1-U3/U6/U7/U9 evidence remains valid; U10 binds 47 public editorial details, 58 revised routes, RSS, and the private Third Enlightenment draft.'
    : checkpoint
    ? 'Baseline checkpoint passed: 59 routes, 4 Essays, 6 Notes, 38 Reading Annotations, and 52 photographs.'
    : 'Baseline fixture integrity passed: the frozen 52-file identity and reviewed publication partition are intact.',
);
