import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const fromRoot = (...parts) => join(root, ...parts);

const frozenFixturePaths = {
  sourceBaseline: 'tests/fixtures/source-baseline.json',
  publicBaseline: 'tests/fixtures/public-baseline.json',
  migrationBaseline: 'tests/fixtures/post-migration-baseline.json',
  networkContract: 'tests/fixtures/u3-network-contract.json',
  renderedBodyContract: 'tests/fixtures/u3-rendered-body-contract.json',
};
const frozenFixtureSources = Object.fromEntries(await Promise.all(
  Object.entries(frozenFixturePaths).map(async ([key, path]) => [key, await readFile(fromRoot(path), 'utf8')]),
));
const sourceBaseline = JSON.parse(frozenFixtureSources.sourceBaseline);
const migrationBaseline = JSON.parse(frozenFixtureSources.migrationBaseline);
const networkContract = JSON.parse(frozenFixtureSources.networkContract);
const u7Contract = JSON.parse(await readFile(fromRoot('tests/fixtures/u7-publication-voice-contract.json'), 'utf8'));
const invalidNetworkFixtures = JSON.parse(await readFile(fromRoot('tests/fixtures/editorial-network-invalid.json'), 'utf8'));
const {
  editorialForms,
  inquiryTrails,
  staticEditorialTargets,
} = await import('../src/data/editorial-network.ts');
const {
  referenceKey,
  validateEditorialNetwork,
} = await import('../src/lib/editorial-network-contract.ts');
const {
  assertRenderedEditorialBody,
  assertRenderedRelatedPaths,
  orderedSemanticAtoms,
  renderedEditorialBodyFingerprint,
} = await import('../scripts/lib/rendered-editorial-body.mjs');

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertExactKeys(value, expected, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} has an unexpected shape`);
}

function u7Key(kind, slug) {
  return `${kind === 'reading-annotation' ? 'annotation' : kind}:${slug}`;
}

function reviewedMetadata(expected, kind) {
  const key = u7Key(kind, expected.slug);
  const metadata = structuredClone(expected.metadata);
  for (const revision of networkContract.metadataRevisions.filter(({ key: revisedKey }) => revisedKey === key)) {
    const path = revision.field.split('.');
    const field = path.pop();
    const container = path.reduce((value, segment) => value[segment], metadata);
    assert.equal(container[field], revision.removed, `${revision.key}.${revision.field} lacks its reviewed U2 prior value`);
    container[field] = revision.replacement;
  }
  for (const removal of u7Contract.removedMetadataFields.filter(({ key: removedKey }) => removedKey === key)) {
    assert.deepEqual(metadata[removal.field], removal.removed, `${key}.${removal.field} lacks its reviewed pre-U7 value`);
    delete metadata[removal.field];
  }
  for (const revision of u7Contract.metadataRevisions.filter(({ key: revisedKey }) => revisedKey === key)) {
    assert.deepEqual(metadata[revision.field], revision.removed, `${key}.${revision.field} lacks its reviewed pre-U7 value`);
    metadata[revision.field] = revision.replacement;
  }
  const transition = u7Contract.publicationTransitions.find(({ key: transitionKey }) => transitionKey === key);
  if (transition) {
    assert.equal(metadata.publicationStatus, transition.from, `${key} lacks its reviewed pre-U7 publication state`);
    metadata.publicationStatus = transition.to;
  }
  return metadata;
}

function baselineBodyEvidence(expected, kind) {
  if (kind === 'note') return { kind: 'raw-note-body', sha256: expected.rawNoteBodySha256 };
  return {
    kind: 'ordered-semantic-atoms',
    sha256: expected.semanticAtomsSha256,
    atomCount: expected.semanticAtomCount,
  };
}

function currentBodyEvidence(entry, kind) {
  if (kind === 'note') return { kind: 'raw-note-body', sha256: sha256(entry.body) };
  const atoms = orderedSemanticAtoms(entry.body.trim());
  return {
    kind: 'ordered-semantic-atoms',
    sha256: sha256(JSON.stringify(atoms)),
    atomCount: atoms.length,
  };
}

function parseEntry(source, label) {
  const match = source.match(/^---\n([\s\S]*?)\n---(\n[\s\S]*)$/);
  assert.ok(match, `${label} needs frontmatter`);
  const data = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    assert.ok(separator > 0, `${label} has unsupported frontmatter: ${line}`);
    const key = line.slice(0, separator).trim();
    assert.ok(!(key in data), `${label} duplicates ${key}`);
    data[key] = JSON.parse(line.slice(separator + 1).trim());
  }
  return { data, body: match[2] };
}

async function canonicalEntries(directory) {
  const files = (await readdir(fromRoot(directory))).filter((file) => file.endsWith('.md')).sort();
  return Promise.all(files.map(async (file) => {
    const slug = basename(file, '.md');
    const source = await readFile(fromRoot(directory, file), 'utf8');
    return { slug, source, ...parseEntry(source, `${directory}/${file}`) };
  }));
}

async function staticPageRoutes(directory = fromRoot('src/pages'), segments = []) {
  const routes = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...await staticPageRoutes(join(directory, entry.name), [...segments, entry.name]));
      continue;
    }
    if (!entry.name.endsWith('.astro') || entry.name.includes('[')) continue;
    const stem = basename(entry.name, '.astro');
    const routeSegments = stem === 'index' ? segments : [...segments, stem];
    routes.push(routeSegments.length === 0 ? '/' : `/${routeSegments.join('/')}`);
  }
  return routes;
}

function expectedSlugs(entries, status = 'published') {
  return entries.filter((entry) => entry.publicationStatus === status).map((entry) => entry.slug).sort();
}

function assertEvidence(entry, expected, kind) {
  assert.equal(entry.slug, entry.data.slug, `${kind}:${entry.slug} slug must equal its file ID`);
  const { continuations: actualContinuations, ...actualMetadata } = entry.data;
  const key = u7Key(kind, entry.slug);
  const revisedExpected = reviewedMetadata(expected, kind);
  const { continuations: expectedContinuations, ...expectedMetadata } = revisedExpected;
  assert.ok(Array.isArray(actualContinuations), `${kind}:${entry.slug} needs typed continuations`);
  assert.ok(Array.isArray(expectedContinuations), `${kind}:${entry.slug} needs a U2 continuation baseline`);
  assert.deepEqual(actualMetadata, expectedMetadata, `${kind}:${entry.slug} canonical metadata or card order drifted`);
  assert.equal(entry.data.publicationStatus, expectedMetadata.publicationStatus);
  assert.equal(entry.data.sortOrder, expected.sortOrder);
  const from = baselineBodyEvidence(expected, kind);
  const to = currentBodyEvidence(entry, kind);
  const revision = u7Contract.bodyRevisions.find(({ key: revisedKey }) => revisedKey === key);
  if (revision) {
    assert.deepEqual(revision.from.source, from, `${key} U7 source revision does not bind the frozen U2 evidence`);
    assert.deepEqual(to, revision.to.source, `${key} differs from its reviewed U7 source evidence`);
    assert.notDeepEqual(revision.from.source, revision.to.source, `${key} U7 source revision must not be a no-op`);
  } else {
    assert.deepEqual(to, from, `${key} body drifted without a reviewed U7 revision`);
  }
  if (kind !== 'note') {
    assert.match(expected.sourceBodySha256, /^[a-f0-9]{64}$/, `${key} needs an authoritative U2 source-body hash`);
    assert.doesNotMatch(entry.body.trim(), /^ {4,}</m, `${key} must not contain Markdown code indentation`);
  }
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
  return undefined;
}

function continuationConnection(label) {
  const match = label.match(/ — ([\s\S]+) →$/);
  assert.ok(match, `Legacy continuation label has no separable connection: ${label}`);
  return match[1];
}

function editorialRecords(essays, notes, annotations) {
  const record = (kind, entry) => ({
    ref: { kind, slug: entry.data.slug },
    title: entry.data.title,
    path: `${kind === 'essay' ? '/essays' : kind === 'note' ? '/blog' : '/library'}/${entry.data.slug}`,
    publicationStatus: entry.data.publicationStatus,
    context: kind === 'essay' ? entry.data.summary ?? '' : kind === 'note' ? entry.data.description ?? '' : entry.data.teaser ?? '',
    form: editorialForms[kind],
    continuations: entry.data.continuations,
  });
  return [
    ...essays.map((entry) => record('essay', entry)),
    ...notes.map((entry) => record('note', entry)),
    ...annotations.map((entry) => record('annotation', entry)),
    ...staticEditorialTargets.map((target) => ({ ...target, continuations: [] })),
  ];
}

test('U7 overlays current publication state without relabeling the frozen U1-U3 evidence', async () => {
  assertExactKeys(u7Contract, [
    'schemaVersion',
    'intent',
    'review',
    'frozenFixtureSha256',
    'currentPublication',
    'retiredNoncanonicalSources',
    'publicationTransitions',
    'draftReviews',
    'removedMetadataFields',
    'metadataRevisions',
    'addedConnections',
    'revisedConnections',
    'bodyRevisions',
  ], 'U7 contract');
  assert.equal(u7Contract.schemaVersion, 1);
  assert.equal(
    u7Contract.intent,
    'U7 records reviewed publication, voice, and factual changes without rewriting the immutable U1 source, U2 migration, or U3 network evidence.',
  );
  assert.equal(
    u7Contract.review,
    'Whole-site writeastoj, voice-match, Altitude Check, factual, and publication audit on 2026-08-23–24.',
  );
  assertExactKeys(u7Contract.frozenFixtureSha256, Object.keys(frozenFixturePaths), 'U7 frozen-fixture evidence');
  assert.deepEqual(
    Object.fromEntries(Object.entries(frozenFixtureSources).map(([key, source]) => [key, sha256(source)])),
    u7Contract.frozenFixtureSha256,
    'A frozen U1-U3 fixture changed bytes instead of receiving an explicit U7 transition',
  );
  assert.equal(migrationBaseline.sourceBaselineCommit, sourceBaseline.branchPointCommit);
  assert.match(migrationBaseline.u1CheckpointCommit, /^[a-f0-9]{40}$/);

  assert.deepEqual(u7Contract.retiredNoncanonicalSources, [
    'content-source/photography-captions.md',
    'content-source/work-projects.md',
    'content-source/yoga-offerings.md',
  ]);
  assert.equal(u7Contract.publicationTransitions.length, 1, 'U7 needs exactly one publication transition');
  const [publicationTransition] = u7Contract.publicationTransitions;
  assertExactKeys(publicationTransition, [
    'key', 'from', 'to', 'canonicalSource', 'removedContinuation', 'redirect', 'reason',
  ], 'U7 publication transition');
  assert.deepEqual({
    key: publicationTransition.key,
    from: publicationTransition.from,
    to: publicationTransition.to,
    canonicalSource: publicationTransition.canonicalSource,
    removedContinuation: publicationTransition.removedContinuation,
    redirect: publicationTransition.redirect,
  }, {
    key: 'note:the-third-enlightenment',
    from: 'published',
    to: 'draft',
    canonicalSource: 'src/content/notes/the-third-enlightenment.md',
    removedContinuation: 'static:third-enlightenment',
    redirect: {
      source: '/blog/the-third-enlightenment',
      destination: '/third-enlightenment',
      permanent: true,
    },
  });
  assert.ok(publicationTransition.reason.trim().length > 0);

  assert.equal(u7Contract.draftReviews.length, 1, 'U7 needs exactly one explicit draft review');
  const [draftReview] = u7Contract.draftReviews;
  assertExactKeys(draftReview, [
    'key', 'verdict', 'metadata', 'bodySha256', 'publicReferences', 'reason',
  ], 'U7 draft review');
  assert.deepEqual({
    key: draftReview.key,
    verdict: draftReview.verdict,
    metadata: draftReview.metadata,
    bodySha256: draftReview.bodySha256,
    publicReferences: draftReview.publicReferences,
  }, {
    key: 'essay:where-you-are',
    verdict: 'remain-draft',
    metadata: migrationBaseline.drafts[0].metadata,
    bodySha256: migrationBaseline.drafts[0].bodySha256,
    publicReferences: 0,
  });
  assert.ok(draftReview.reason.trim().length > 0);

  assert.deepEqual(u7Contract.addedConnections, [
    {
      key: 'annotation:the-embodied-mind->static:third-enlightenment',
      connection: 'embodied attention complicates any account of delegable cognition',
    },
    {
      key: 'annotation:the-passion-of-the-western-mind->static:third-enlightenment',
      connection: 'Tarnas’s participatory knowing as one precursor to the working theory',
    },
  ]);
  assert.deepEqual(u7Contract.revisedConnections, [
    {
      key: 'annotation:radical-wholeness->annotation:breath',
      removed: 'how breathing changes nervous-system regulation',
      connection: 'breathing as an embodied practice to examine cautiously',
      reason: 'The earlier bridge repeated a medical mechanism the bounded Breath annotation no longer endorses.',
    },
  ]);

  for (const removal of u7Contract.removedMetadataFields) {
    assertExactKeys(removal, ['key', 'field', 'removed', 'reason'], `${removal.key}.${removal.field} removal`);
    assert.ok(removal.reason.trim().length > 0, `${removal.key}.${removal.field} removal needs a reason`);
  }
  assert.equal(
    new Set(u7Contract.removedMetadataFields.map(({ key, field }) => `${key}.${field}`)).size,
    u7Contract.removedMetadataFields.length,
    'U7 removed metadata fields must be unique',
  );
  for (const revision of u7Contract.metadataRevisions) {
    assertExactKeys(revision, [
      'key', 'field', 'removed', 'replacement', 'renderedRoutes', 'reason',
    ], `${revision.key}.${revision.field} metadata revision`);
    assert.equal(new Set(revision.renderedRoutes).size, revision.renderedRoutes.length, `${revision.key}.${revision.field} rendered scope must be unique`);
  }
  for (const revision of u7Contract.bodyRevisions) {
    assertExactKeys(revision, ['key', 'route', 'from', 'to', 'reason'], `${revision.key} body revision`);
    const [kind, slug, ...extraKeySegments] = revision.key.split(':');
    assert.equal(extraKeySegments.length, 0, `${revision.key} body revision has an invalid key`);
    const routePrefix = kind === 'essay' ? '/essays' : kind === 'note' ? '/blog' : kind === 'annotation' ? '/library' : undefined;
    assert.ok(routePrefix, `${revision.key} body revision has an unsupported kind`);
    assert.equal(revision.route, `${routePrefix}/${slug}`, `${revision.key} body revision is bound to the wrong route`);
    assertExactKeys(revision.from, ['source', 'rendered'], `${revision.key} prior body evidence`);
    assertExactKeys(revision.to, ['source', 'rendered'], `${revision.key} current body evidence`);
    for (const [side, evidence] of [['from', revision.from], ['to', revision.to]]) {
      const sourceKeys = evidence.source.kind === 'raw-note-body'
        ? ['kind', 'sha256']
        : ['kind', 'sha256', 'atomCount'];
      assertExactKeys(evidence.source, sourceKeys, `${revision.key} ${side} source evidence`);
      assertExactKeys(
        evidence.rendered,
        ['orderedSemanticSha256', 'semanticAtomCount', 'normalizedTextLength'],
        `${revision.key} ${side} rendered evidence`,
      );
    }
  }
  assert.equal(
    new Set(u7Contract.bodyRevisions.map(({ route }) => route)).size,
    u7Contract.bodyRevisions.length,
    'U7 body revision routes must be unique',
  );

  const [essays, notes, annotations] = await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
  ]);

  assert.deepEqual(essays.filter(({ data }) => data.publicationStatus === 'published').map(({ slug }) => slug).sort(), sourceBaseline.essays);
  const retiredNoteSlug = u7Contract.publicationTransitions[0].key.split(':')[1];
  const currentPublishedNotes = sourceBaseline.notes.filter((slug) => slug !== retiredNoteSlug);
  assert.deepEqual(notes.filter(({ data }) => data.publicationStatus === 'published').map(({ slug }) => slug).sort(), currentPublishedNotes);
  assert.deepEqual(annotations.filter(({ data }) => data.publicationStatus === 'published').map(({ slug }) => slug).sort(), sourceBaseline.readingAnnotations);
  assert.deepEqual(essays.filter(({ data }) => data.publicationStatus === 'draft').map(({ slug }) => slug), ['where-you-are']);
  assert.deepEqual(notes.filter(({ data }) => data.publicationStatus === 'draft').map(({ slug }) => slug), [retiredNoteSlug]);
  assert.equal(annotations.filter(({ data }) => data.publicationStatus === 'draft').length, 0);

  assert.deepEqual(expectedSlugs(migrationBaseline.essays), sourceBaseline.essays);
  assert.deepEqual(expectedSlugs(migrationBaseline.notes), sourceBaseline.notes);
  assert.deepEqual(expectedSlugs(migrationBaseline.readingAnnotations), sourceBaseline.readingAnnotations);
  assert.deepEqual(expectedSlugs(migrationBaseline.drafts, 'draft'), ['where-you-are']);
  assert.deepEqual(u7Contract.currentPublication, {
    publishedEssays: 4,
    publishedNotes: 5,
    draftNotes: ['the-third-enlightenment'],
    publishedAnnotations: 38,
    publicEditorialDetails: 47,
  });

  assert.equal(new Set([...essays, ...notes, ...annotations].map(({ data }) =>
    `${data.publicationStatus}:${data.slug}`,
  )).size, essays.length + notes.length + annotations.length, 'Collection slugs must be unique within publication state');
});

test('canonical metadata and bodies equal the frozen U2/U3 evidence plus only reviewed U7 transitions', async () => {
  const groups = [
    ['essay', await canonicalEntries('src/content/essays'), [...migrationBaseline.essays, ...migrationBaseline.drafts]],
    ['note', await canonicalEntries('src/content/notes'), migrationBaseline.notes],
    ['reading-annotation', await canonicalEntries('src/content/reading-annotations'), migrationBaseline.readingAnnotations],
  ];

  const changedBodyKeys = [];
  const changedMetadataKeys = [];
  for (const [kind, entries, expectedEntries] of groups) {
    const expectedBySlug = new Map(expectedEntries.map((entry) => [entry.slug, entry]));
    for (const entry of entries) {
      const expected = expectedBySlug.get(entry.slug);
      assert.ok(expected, `Unreviewed ${kind}:${entry.slug}`);
      const key = u7Key(kind, entry.slug);
      const preU7Metadata = structuredClone(expected.metadata);
      for (const revision of networkContract.metadataRevisions.filter(({ key: revisedKey }) => revisedKey === key)) {
        const path = revision.field.split('.');
        const field = path.pop();
        const container = path.reduce((value, segment) => value[segment], preU7Metadata);
        assert.deepEqual(container[field], revision.removed, `${key}.${revision.field} lacks its pre-U3 value`);
        container[field] = revision.replacement;
      }
      const currentMetadata = structuredClone(entry.data);
      delete preU7Metadata.continuations;
      delete currentMetadata.continuations;
      for (const field of new Set([...Object.keys(preU7Metadata), ...Object.keys(currentMetadata)])) {
        if (
          JSON.stringify(preU7Metadata[field]) !== JSON.stringify(currentMetadata[field])
          && field !== 'cta'
          && !(key === 'note:the-third-enlightenment' && field === 'publicationStatus')
        ) changedMetadataKeys.push(`${key}.${field}`);
      }
      if (entry.slug === 'where-you-are') {
        const draftReview = u7Contract.draftReviews.find(({ key }) => key === 'essay:where-you-are');
        assert.ok(draftReview, 'Where You Are needs an explicit U7 publication review');
        assert.equal(draftReview.verdict, 'remain-draft');
        assert.equal(entry.slug, entry.data.slug);
        assert.deepEqual(entry.data, draftReview.metadata, 'Where You Are draft metadata drifted');
        assert.equal(entry.data.publicationStatus, 'draft');
        assert.equal(draftReview.bodySha256, expected.bodySha256, 'Where You Are review must bind frozen U2 evidence');
        assert.equal(sha256(entry.body), draftReview.bodySha256, 'Where You Are draft body drifted');
        assert.equal(draftReview.publicReferences, 0);
      } else {
        assertEvidence(entry, expected, kind);
        if (JSON.stringify(currentBodyEvidence(entry, kind)) !== JSON.stringify(baselineBodyEvidence(expected, kind))) {
          changedBodyKeys.push(u7Key(kind, entry.slug));
        }
      }
    }
  }

  const currentEntries = groups.flatMap(([kind, entries]) => entries.map((entry) => ({
    kind: kind === 'reading-annotation' ? 'annotation' : kind,
    entry,
  })));
  const routeForEntry = (kind, slug) => `/${kind === 'essay' ? 'essays' : kind === 'note' ? 'blog' : 'library'}/${slug}`;
  const publicEntriesByKey = new Map(currentEntries
    .filter(({ entry }) => entry.data.publicationStatus === 'published')
    .map(({ kind, entry }) => [`${kind}:${entry.slug}`, { kind, entry }]));
  const inboundContextRoutes = new Map();
  for (const { kind, entry } of publicEntriesByKey.values()) {
    for (const continuation of entry.data.continuations) {
      if (continuation.connection) continue;
      const targetKey = referenceKey(continuation.target);
      const routes = inboundContextRoutes.get(targetKey) ?? [];
      routes.push(routeForEntry(kind, entry.slug));
      inboundContextRoutes.set(targetKey, routes);
    }
  }
  const trailKeys = new Set(inquiryTrails.flatMap(({ objects }) => objects.map(referenceKey)));
  const researchNoteKeys = new Set([
    'note:where-you-want-variance',
    'note:from-org-theory-to-ai',
    'note:the-dot-collector',
  ]);
  for (const revision of u7Contract.metadataRevisions) {
    const current = publicEntriesByKey.get(revision.key);
    assert.ok(current, `${revision.key}.${revision.field} must resolve to one current public entry`);
    const route = routeForEntry(current.kind, current.entry.slug);
    const routes = new Set();
    if (revision.field === 'homeFeature') {
      assert.equal(current.kind, 'essay', `${revision.key}.homeFeature is only supported for Essays`);
      routes.add('/');
    } else if (revision.field === 'description') {
      routes.add(route);
      if (current.kind === 'note') {
        routes.add('/writing');
        if (researchNoteKeys.has(revision.key)) routes.add('/research');
      }
    } else if (revision.field === 'summary') {
      assert.equal(current.kind, 'essay', `${revision.key}.summary is only supported for Essays`);
      routes.add(route);
      routes.add('/writing');
      routes.add('/research');
    } else if (revision.field === 'teaser') {
      assert.equal(current.kind, 'annotation', `${revision.key}.teaser is only supported for annotations`);
      routes.add(route);
      routes.add('/library');
    } else {
      assert.fail(`${revision.key}.${revision.field} needs an explicit rendered-surface rule`);
    }

    const contextField = current.kind === 'essay'
      ? 'summary'
      : current.kind === 'note'
        ? 'description'
        : 'teaser';
    if (revision.field === contextField) {
      for (const inboundRoute of inboundContextRoutes.get(revision.key) ?? []) routes.add(inboundRoute);
      if (trailKeys.has(revision.key)) routes.add('/writing');
    }
    assert.deepEqual(
      revision.renderedRoutes,
      [...routes].sort(),
      `${revision.key}.${revision.field} must bind every and only rendered metadata surface`,
    );
  }

  assert.deepEqual(
    changedBodyKeys.sort(),
    u7Contract.bodyRevisions.map(({ key }) => key).sort(),
    'U7 body revisions must be an exact set: no unreviewed drift and no blanket exemptions',
  );
  assert.equal(new Set(u7Contract.bodyRevisions.map(({ key }) => key)).size, u7Contract.bodyRevisions.length);
  assert.ok(u7Contract.bodyRevisions.every(({ reason }) => reason.trim().length > 0));
  assert.deepEqual(
    changedMetadataKeys.sort(),
    u7Contract.metadataRevisions.map(({ key, field }) => `${key}.${field}`).sort(),
    'U7 metadata revisions must be an exact set: no unreviewed drift and no blanket exemptions',
  );
  assert.equal(
    new Set(u7Contract.metadataRevisions.map(({ key, field }) => `${key}.${field}`)).size,
    u7Contract.metadataRevisions.length,
    'U7 metadata revisions must be unique',
  );
  for (const revision of u7Contract.metadataRevisions) {
    assert.notDeepEqual(revision.removed, revision.replacement, `${revision.key}.${revision.field} must not be a no-op`);
    assert.ok(revision.reason.trim().length > 0, `${revision.key}.${revision.field} needs a reason`);
    assert.ok(revision.renderedRoutes.length > 0, `${revision.key}.${revision.field} needs rendered scope`);
  }

  assert.equal(migrationBaseline.migrationExceptions.length, 0, 'Every migration exception needs an explicit reviewed record');
  assert.deepEqual(migrationBaseline.formattingNormalization, {
    scope: 'All four published Essays and 38 Reading Annotations',
    change: 'Removed source-only leading indentation from raw HTML lines so Markdown renders the preserved HTML instead of code blocks.',
    editorialImpact: 'None; ordered semantic atoms and metadata remain exact.',
  });
  assert.equal(migrationBaseline.essays.flatMap((entry) => entry.metadata.continuations).length, 8);
  assert.equal(migrationBaseline.readingAnnotations.flatMap((entry) => entry.metadata.continuations).length, 15);

  for (const entry of migrationBaseline.readingAnnotations) {
    assert.deepEqual(entry.requiredHeadings, [
      'Why I Recommend This',
      'The Book',
      'Passages That Stayed With Me',
      'Read This If...',
      'Skip This If...',
    ], `${entry.slug} lost the five-section annotation form`);
    assert.equal(entry.semanticAtomCounts.h2, 5, `${entry.slug} must have exactly five H2 sections`);
  }
});

test('typed continuations preserve reviewed bridges and add only the explicit U3 connections', async () => {
  const [essays, notes, annotations] = await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
  ]);
  const groups = [
    ['essay', essays, migrationBaseline.essays],
    ['note', notes, migrationBaseline.notes],
    ['annotation', annotations, migrationBaseline.readingAnnotations],
  ];
  const appliedAddedConnections = [];
  const appliedRevisedConnections = [];
  const appliedPublicationTransitions = [];

  for (const [kind, entries, baselineEntries] of groups) {
    const entriesBySlug = new Map(entries.map((entry) => [entry.slug, entry]));
    for (const baselineEntry of baselineEntries) {
      const entry = entriesBySlug.get(baselineEntry.slug);
      assert.ok(entry, `Missing ${kind}:${baselineEntry.slug}`);
      const sourceKey = `${kind}:${entry.slug}`;
      const expected = [];

      for (const legacy of baselineEntry.metadata.continuations) {
        if (legacy.href === networkContract.replacedContinuations[sourceKey]?.removedPath) {
          expected.push({ target: refFromKey(networkContract.replacedContinuations[sourceKey].target) });
          continue;
        }
        const targetKey = keyFromLegacyPath(legacy.href);
        assert.ok(targetKey, `${sourceKey} has an unregistered legacy destination ${legacy.href}`);
        const legacyConnection = continuationConnection(legacy.label);
        const revision = networkContract.revisedConnections[`${sourceKey}->${targetKey}`];
        if (revision) assert.equal(revision.removed, legacyConnection, `${sourceKey}->${targetKey} changed from an unreviewed bridge`);
        expected.push({
          target: refFromKey(targetKey),
          connection: revision?.connection ?? legacyConnection,
        });
      }

      if (networkContract.addedContinuations[sourceKey]) {
        assert.equal(expected.length, 0, `${sourceKey} already had a reviewed continuation`);
        expected.push({ target: refFromKey(networkContract.addedContinuations[sourceKey]) });
      }
      for (const addition of u7Contract.addedConnections.filter(({ key }) => key.startsWith(`${sourceKey}->`))) {
        const targetKey = addition.key.slice(`${sourceKey}->`.length);
        const continuation = expected.find(({ target }) => referenceKey(target) === targetKey);
        assert.ok(continuation, `${addition.key} needs an existing U3 continuation`);
        assert.equal(continuation.connection, undefined, `${addition.key} must add, not overwrite, a bridge`);
        continuation.connection = addition.connection;
        appliedAddedConnections.push(addition.key);
      }
      for (const revision of u7Contract.revisedConnections.filter(({ key }) => key.startsWith(`${sourceKey}->`))) {
        const targetKey = revision.key.slice(`${sourceKey}->`.length);
        const continuation = expected.find(({ target }) => referenceKey(target) === targetKey);
        assert.ok(continuation, `${revision.key} needs an existing U3 continuation`);
        assert.equal(continuation.connection, revision.removed, `${revision.key} lacks its reviewed pre-U7 bridge`);
        continuation.connection = revision.connection;
        appliedRevisedConnections.push(revision.key);
      }
      if (u7Contract.publicationTransitions.some(({ key }) => key === sourceKey)) {
        expected.splice(0);
        appliedPublicationTransitions.push(sourceKey);
      }
      assert.deepEqual(entry.data.continuations, expected, `${sourceKey} differs from the explicit U3 relation contract`);
    }
  }

  assert.deepEqual(appliedAddedConnections.sort(), u7Contract.addedConnections.map(({ key }) => key).sort());
  assert.deepEqual(appliedRevisedConnections.sort(), u7Contract.revisedConnections.map(({ key }) => key).sort());
  assert.deepEqual(appliedPublicationTransitions.sort(), u7Contract.publicationTransitions.map(({ key }) => key).sort());
  assert.equal(new Set(appliedAddedConnections).size, appliedAddedConnections.length);
  assert.equal(new Set(appliedRevisedConnections).size, appliedRevisedConnections.length);
  assert.equal(new Set(appliedPublicationTransitions).size, appliedPublicationTransitions.length);

  assert.equal(Object.keys(networkContract.addedContinuations).length, 34);
  assert.equal(Object.keys(networkContract.replacedContinuations).length, 1);
  assert.equal(Object.keys(networkContract.revisedConnections).length, 7);
  assert.equal(networkContract.metadataRevisions.length, 6);
  assert.equal(essays.filter(({ data }) => data.publicationStatus === 'published').flatMap(({ data }) => data.continuations).length, 8);
  assert.equal(notes.filter(({ data }) => data.publicationStatus === 'published').flatMap(({ data }) => data.continuations).length, 5);
  assert.deepEqual(notes.find(({ slug }) => slug === 'the-third-enlightenment').data.continuations, []);
  assert.equal(annotations.flatMap(({ data }) => data.continuations).length, 43);
});

test('every public relation resolves and no draft or exception can enter the network', async () => {
  const [essays, notes, annotations, staticRoutes] = await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
    staticPageRoutes(),
  ]);
  const records = editorialRecords(essays, notes, annotations);
  const recordsByKey = validateEditorialNetwork(records, inquiryTrails);
  const publicRecords = records.filter((record) => record.publicationStatus === 'published' && record.ref.kind !== 'static');

  assert.equal(publicRecords.length, u7Contract.currentPublication.publicEditorialDetails);
  assert.ok(publicRecords.every((record) => record.form && record.context && record.continuations.length > 0));
  assert.equal(recordsByKey.get('essay:where-you-are').publicationStatus, 'draft');
  assert.deepEqual(recordsByKey.get('essay:where-you-are').continuations, []);
  assert.equal(recordsByKey.get('note:the-third-enlightenment').publicationStatus, 'draft');
  assert.deepEqual(recordsByKey.get('note:the-third-enlightenment').continuations, []);
  assert.deepEqual(migrationBaseline.preservedKnownIssues, []);
  assert.ok(staticRoutes.includes('/third-enlightenment'));
  assert.ok(staticRoutes.includes('/yoga'));
  assert.equal(recordsByKey.has('static:research'), false);

  for (const record of publicRecords) {
    for (const continuation of record.continuations) {
      const target = recordsByKey.get(referenceKey(continuation.target));
      assert.equal(target?.publicationStatus, 'published', `${referenceKey(record.ref)} has a non-public continuation`);
    }
  }

  const publicRelations = publicRecords.flatMap((record) => record.continuations);
  assert.doesNotMatch(JSON.stringify(publicRelations), /\/research|where-you-are/);
});

test('the three inquiry trails have their exact reviewed questions, order, length, and form mix', async () => {
  const actual = inquiryTrails.map((trail) => ({
    id: trail.id,
    question: trail.question,
    objects: trail.objects.map(referenceKey),
  }));
  assert.deepEqual(actual, networkContract.trails);
  assert.deepEqual(actual.map(({ objects }) => objects.length), [5, 6, 5]);

  const [essays, notes, annotations] = await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
  ]);
  const recordsByKey = validateEditorialNetwork(editorialRecords(essays, notes, annotations), inquiryTrails);
  for (const trail of actual) {
    assert.ok(new Set(trail.objects.map((key) => recordsByKey.get(key).form)).size >= 2, `${trail.id} needs a form mix`);
  }
});

test('negative fixtures fail closed for every editorial network invariant', async () => {
  const [essays, notes, annotations] = await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
  ]);
  const baseRecords = editorialRecords(essays, notes, annotations);
  const baseTrails = inquiryTrails;
  const clone = (value) => structuredClone(value);

  function invalidCase(mutation) {
    const records = clone(baseRecords);
    const trails = clone(baseTrails);
    const source = records.find(({ ref }) => referenceKey(ref) === 'essay:architecture-of-commitment');
    const draft = records.find(({ ref }) => referenceKey(ref) === 'essay:where-you-are');
    assert.ok(source && draft);
    const existingTarget = clone(source.continuations[0].target);
    const targetRecord = records.find(({ ref }) => referenceKey(ref) === referenceKey(existingTarget));
    assert.ok(targetRecord);

    switch (mutation) {
      case 'missing-target':
        source.continuations = [{ target: { kind: 'essay', slug: 'missing-entry' } }];
        break;
      case 'unregistered-static':
        source.continuations = [{ target: { kind: 'static', slug: 'research' } }];
        break;
      case 'draft-target':
        source.continuations = [{ target: clone(draft.ref) }];
        break;
      case 'draft-source-continuation':
        draft.continuations = [{ target: existingTarget }];
        break;
      case 'missing-context':
        source.context = '';
        break;
      case 'missing-continuation':
        source.continuations = [];
        break;
      case 'self-reference':
        source.continuations = [{ target: clone(source.ref) }];
        break;
      case 'duplicate-reference':
        source.continuations = [{ target: existingTarget }, { target: clone(existingTarget) }];
        break;
      case 'copied-title-field':
        source.continuations = [{ target: { ...existingTarget, title: targetRecord.title } }];
        break;
      case 'copied-path-field':
        source.continuations = [{ target: existingTarget, connection: 'A reviewed bridge', path: targetRecord.path }];
        break;
      case 'copied-title-copy':
        source.continuations = [{ target: existingTarget, connection: targetRecord.title }];
        break;
      case 'copied-path-copy':
        source.continuations = [{ target: existingTarget, connection: targetRecord.path }];
        break;
      case 'duplicate-trail-id':
        trails.push({ ...clone(trails[0]), question: 'A distinct question?' });
        break;
      case 'duplicate-trail-question':
        trails.push({ ...clone(trails[0]), id: 'distinct-id' });
        break;
      case 'fewer-than-three-trails':
        trails.splice(2);
        break;
      case 'blank-trail-question':
        trails[0].question = '   ';
        break;
      case 'duplicate-trail-target':
        trails[0].objects.push(clone(trails[0].objects[0]));
        break;
      case 'single-form-trail':
        trails[0].objects = [
          { kind: 'essay', slug: 'what-rules-cant-capture' },
          { kind: 'essay', slug: 'strategic-time' },
        ];
        break;
      case 'trail-without-essay':
        trails[0].objects = [
          { kind: 'note', slug: 'teaching-ai-to-think-like-you' },
          { kind: 'annotation', slug: 'rules' },
          { kind: 'annotation', slug: 'seeing-like-a-state' },
        ];
        break;
      case 'trail-without-note-or-theory':
        trails[0].objects = [
          { kind: 'essay', slug: 'what-rules-cant-capture' },
          { kind: 'annotation', slug: 'rules' },
          { kind: 'annotation', slug: 'seeing-like-a-state' },
        ];
        break;
      case 'trail-with-one-annotation':
        trails[0].objects = [
          { kind: 'essay', slug: 'what-rules-cant-capture' },
          { kind: 'note', slug: 'teaching-ai-to-think-like-you' },
          { kind: 'annotation', slug: 'rules' },
        ];
        break;
      case 'draft-trail-target':
        trails[0].objects[0] = clone(draft.ref);
        break;
      case 'extra-trail-key':
        trails[0].path = '/copied-path';
        break;
      default:
        assert.fail(`Unknown negative fixture mutation: ${mutation}`);
    }
    return { records, trails };
  }

  for (const fixture of invalidNetworkFixtures) {
    const { records, trails } = invalidCase(fixture.mutation);
    assert.throws(
      () => validateEditorialNetwork(records, trails),
      (error) => error instanceof Error && error.message.includes(fixture.message),
      fixture.name,
    );
  }
});

test('published entries satisfy their form-specific contract and explicit order', async () => {
  const [essays, notes, annotations] = await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
  ]);
  const contracts = [
    ['Essay', essays.filter(({ data }) => data.publicationStatus === 'published'), ['description', 'summary', 'publishedLabel', 'cardPublishedLabel']],
    ['Note', notes.filter(({ data }) => data.publicationStatus === 'published'), ['description', 'pubDate', 'tags']],
    ['Reading Annotation', annotations.filter(({ data }) => data.publicationStatus === 'published'), [
      'pageTitle', 'description', 'author', 'cardTitle', 'cardAuthor', 'cardReadingTime',
      'cardDifficulty', 'cardTags', 'teaser', 'detailReadingTime', 'detailDifficulty', 'detailTags',
    ]],
  ];

  for (const [label, entries, requiredFields] of contracts) {
    const sortOrders = entries.map(({ data }) => data.sortOrder);
    assert.equal(new Set(sortOrders).size, sortOrders.length, `${label} sortOrder must be unique`);
    assert.ok(sortOrders.every((value) => Number.isInteger(value) && value > 0), `${label} sortOrder must be positive`);
    for (const entry of entries) {
      assert.equal(entry.data.publicationStatus, 'published');
      for (const field of requiredFields) {
        assert.ok(entry.data[field] !== undefined && entry.data[field] !== '', `${label}:${entry.slug} missing ${field}`);
      }
    }
  }

  assert.ok(migrationBaseline.essays.every(({ metadata }) => metadata.cta), 'Frozen U2 must retain historical Essay CTAs');
  assert.deepEqual(u7Contract.removedMetadataFields.map(({ key, field }) => ({ key, field })), migrationBaseline.essays.map(({ slug }) => ({
    key: `essay:${slug}`,
    field: 'cta',
  })));

  const homeFeatures = migrationBaseline.essays
    .filter((entry) => entry.metadata.homeFeature)
    .map((entry) => entry.metadata.homeFeature.sortOrder)
    .sort((left, right) => left - right);
  assert.deepEqual(homeFeatures, [1, 2, 3], 'Home Essay features need one canonical, explicit order');
});

test('cutover is atomic, draft-safe, and free of parallel authoring sources', async () => {
  for (const stalePath of ['src/content/blog', 'content-source/essays', 'content-source/library']) {
    const remainingFiles = existsSync(fromRoot(stalePath)) ? await readdir(fromRoot(stalePath)) : [];
    assert.deepEqual(remainingFiles, [], `${stalePath} must contain no parallel authoring sources`);
  }

  const nonArchiveContentSources = [];
  async function walkContentSource(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walkContentSource(path);
      else if (entry.name.endsWith('.md')) {
        const pathFromContentSource = relative(fromRoot('content-source'), path).replaceAll('\\', '/');
        if (!pathFromContentSource.startsWith('_archive/')) nonArchiveContentSources.push(pathFromContentSource);
      }
    }
  }
  if (existsSync(fromRoot('content-source'))) await walkContentSource(fromRoot('content-source'));
  assert.deepEqual(nonArchiveContentSources.sort(), [], 'Only content-source/_archive/** may contain noncanonical Markdown');
  for (const retiredSource of u7Contract.retiredNoncanonicalSources) {
    assert.equal(existsSync(fromRoot(retiredSource)), false, `${retiredSource} must remain retired`);
  }

  const sourceFiles = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else sourceFiles.push(path);
    }
  }
  await walk(fromRoot('src'));
  const sourceEntries = await Promise.all(sourceFiles.map(async (path) => ({
    path,
    text: await readFile(path, 'utf8'),
  })));
  const sourceText = sourceEntries.map(({ text }) => text).join('\n');
  assert.doesNotMatch(sourceText, /getCollection\(['"]blog['"]\)|src\/content\/blog|content-source\/(?:essays|library)/);

  const whereYouAreReferences = [];
  for (const { path, text } of sourceEntries) {
    if (path.endsWith(join('src', 'content', 'essays', 'where-you-are.md'))) continue;
    if (text.includes('where-you-are')) whereYouAreReferences.push(path);
  }
  assert.deepEqual(whereYouAreReferences, [], 'Where You Are must have no route, index, feed, or relation reference');

  const staticEssayFiles = (await readdir(fromRoot('src/pages/essays'))).filter((file) => file.endsWith('.astro'));
  const staticLibraryFiles = (await readdir(fromRoot('src/pages/library'))).filter((file) => file.endsWith('.astro') && file !== 'index.astro');
  assert.deepEqual(staticEssayFiles, ['[...slug].astro']);
  assert.deepEqual(staticLibraryFiles, ['[...slug].astro']);
  assert.equal(existsSync(fromRoot('src/pages/essays.astro')), false, 'Legacy /essays page must be removed with its redirect');

  const [readme, ci, referenceChecker, mobilePreview] = await Promise.all([
    readFile(fromRoot('README.md'), 'utf8'),
    readFile(fromRoot('.github/workflows/ci.yml'), 'utf8'),
    readFile(fromRoot('scripts/check-essay-refs.sh'), 'utf8'),
    readFile(fromRoot('scripts/mobile-preview.mjs'), 'utf8'),
  ]);
  assert.doesNotMatch(readme, /src\/content\/blog|Create markdown files in `src\/content\/blog/);
  for (const directory of ['essays', 'notes', 'reading-annotations']) {
    assert.match(readme, new RegExp(`src/content/${directory}/`));
  }
  assert.match(readme, /human go\/no-go/i);
  assert.doesNotMatch(readme, /Joth|consulting offer|yoga offerings|content-source\/(?:work-projects|yoga-offerings|photography-captions)/i);
  const verificationCommands = [
    'npm run check',
    'npm run build',
    'npm run verify:baseline',
    'npm run verify:migration',
    'npm run verify:content',
    'npm run verify:metadata',
    'npm run verify:photography',
    'npm run test:browser',
  ];
  for (const [label, source] of [['README', readme], ['CI', ci]]) {
    let previousPosition = -1;
    for (const command of verificationCommands) {
      const position = source.indexOf(command);
      assert.ok(position > previousPosition, `${label} must document the clean verification sequence through ${command}`);
      previousPosition = position;
    }
  }
  assert.match(referenceChecker, /npm run verify:content/);
  assert.doesNotMatch(referenceChecker, /src\/pages\/essays\.astro/);
  assert.match(mobilePreview, /'\/writing'/);
  assert.doesNotMatch(mobilePreview, /'\/essays'/);
});

test('renderers, indexes, schemas, and redirect consume the canonical content and network contracts', async () => {
  const files = Object.fromEntries(await Promise.all([
    'src/content.config.ts',
    'src/lib/content.ts',
    'src/pages/index.astro',
    'src/pages/writing.astro',
    'src/pages/library/index.astro',
    'src/pages/essays/[...slug].astro',
    'src/pages/blog/[...slug].astro',
    'src/pages/library/[...slug].astro',
    'src/components/EssayArticle.astro',
    'src/components/NoteArticle.astro',
    'src/components/ReadingAnnotation.astro',
    'src/components/EditorialLabel.astro',
    'src/components/InquiryTrail.astro',
    'src/components/RelatedPaths.astro',
    'src/data/editorial-network.ts',
    'src/lib/editorial-network-contract.ts',
  ].map(async (path) => [path, await readFile(fromRoot(path), 'utf8')])));

  for (const name of ['essays', 'notes', 'readingAnnotations']) {
    assert.match(files['src/content.config.ts'], new RegExp(`const ${name} = defineCollection`));
    assert.match(files['src/lib/content.ts'], new RegExp(`getCollection\\('${name}'\\)`));
  }
  assert.match(files['src/content.config.ts'], /publicationStatus[\s\S]*\.default\('draft'\)/);
  assert.equal((files['src/content.config.ts'].match(/pattern: '\*\.md'/g) ?? []).length, 3, 'Collection loaders must be root-only and Markdown-only');
  assert.doesNotMatch(files['src/content.config.ts'], /pattern: '\*\*\//, 'Collection loaders must not sweep nested archives');
  assert.match(files['src/content.config.ts'], /requirePublishedFields/);
  assert.doesNotMatch(files['src/content.config.ts'], /\bcta\b/, 'CTA must not remain in the canonical Essay schema');
  assert.match(files['src/content.config.ts'], /discriminatedUnion\('kind'/);
  assert.match(files['src/pages/writing.astro'], /getEditorialNetwork[\s\S]*getPublishedEssays[\s\S]*getPublishedNotes/);
  assert.match(files['src/pages/writing.astro'], /InquiryTrail/);
  assert.match(files['src/pages/index.astro'], /getPublishedEssays/);
  assert.doesNotMatch(files['src/pages/index.astro'], /const featuredEssays\s*=\s*\[/, 'Home must not duplicate Essay metadata');
  assert.match(files['src/pages/library/index.astro'], /getEditorialNetwork[\s\S]*getPublishedReadingAnnotations/);
  assert.match(files['src/pages/library/index.astro'], /type="button"/);
  assert.match(files['src/pages/library/index.astro'], /aria-pressed/);
  assert.match(files['src/pages/library/index.astro'], /aria-live="polite"/);
  assert.match(files['src/pages/library/index.astro'], /bookTags\.includes\(tag\)/);
  assert.doesNotMatch(files['src/pages/library/index.astro'], /bookTags\.includes\(tag\)[\s\S]*includes\(tag\)/, 'The filter must use one exact-token comparison');
  assert.match(files['src/pages/essays/[...slug].astro'], /EssayArticle/);
  assert.match(files['src/pages/blog/[...slug].astro'], /NoteArticle/);
  assert.match(files['src/pages/library/[...slug].astro'], /ReadingAnnotation/);
  for (const renderer of ['EssayArticle.astro', 'NoteArticle.astro', 'ReadingAnnotation.astro']) {
    assert.match(files[`src/components/${renderer}`], /EditorialLabel/);
    assert.match(files[`src/components/${renderer}`], /RelatedPaths/);
    assert.match(files[`src/components/${renderer}`], /resolveEditorialView/);
    assert.equal(
      (files[`src/components/${renderer}`].match(/data-editorial-body/g) ?? []).length,
      1,
      `${renderer} needs exactly one canonical rendered-body boundary`,
    );
  }
  assert.doesNotMatch(files['src/components/EssayArticle.astro'], /data\.cta|href=.*\/contact|Continue the conversation/);
  assert.doesNotMatch(files['src/components/NoteArticle.astro'], /href=.*\/contact|Get in touch|Continue the conversation/);
  assert.match(files['src/lib/content.ts'], /validateEditorialNetwork\(records, inquiryTrails\)/, 'Every build must execute the fail-closed network validator');
  for (const getter of ['getPublishedEssays', 'getPublishedNotes', 'getPublishedReadingAnnotations']) {
    assert.match(
      files['src/lib/content.ts'],
      new RegExp(`function ${getter}\\([\\s\\S]*?await getEditorialNetwork\\(\\)`),
      `${getter} must not bypass cross-collection validation`,
    );
  }
  assert.doesNotMatch(files['src/data/editorial-network.ts'], /\/research|where-you-are/);
  assert.doesNotMatch(files['src/data/editorial-network.ts'], /href:|label:/, 'Network data must not copy resolved target paths or titles');

  const vercel = JSON.parse(await readFile(fromRoot('vercel.json'), 'utf8'));
  const redirect = vercel.redirects?.find(({ source }) => source === '/essays');
  assert.deepEqual(redirect, { source: '/essays', destination: '/writing', permanent: true });
  const retiredNoteRedirect = u7Contract.publicationTransitions[0].redirect;
  assert.deepEqual(
    vercel.redirects?.find(({ source }) => source === retiredNoteRedirect.source),
    retiredNoteRedirect,
  );
  assert.equal(vercel.redirects?.filter(({ source }) => source === retiredNoteRedirect.source).length, 1);
  assert.equal(vercel.redirects?.some(({ source }) => source === retiredNoteRedirect.destination), false);
});

test('rendered editorial body fingerprints ignore network chrome and fail on omitted or reordered body content', () => {
  const canonical = `
    <main>
      <p data-editorial-context>New context outside the frozen body.</p>
      <div data-editorial-body>
        <p>First canonical paragraph.</p>
        <h2>A canonical turn</h2>
        <p>Second canonical paragraph with <a href="/library/rules">a path</a>.</p>
      </div>
      <aside data-related-path="annotation:rules">New relation outside the frozen body.</aside>
    </main>
  `;
  const expected = renderedEditorialBodyFingerprint(canonical);

  assert.doesNotThrow(() => assertRenderedEditorialBody(canonical, expected, 'synthetic editorial route'));
  assert.deepEqual(
    renderedEditorialBodyFingerprint(canonical.replace('New context', 'Changed context').replace('New relation', 'Changed relation')),
    expected,
    'Context and related-path chrome must stay outside the frozen body contract',
  );
  assert.throws(
    () => assertRenderedEditorialBody(
      canonical.replace('<p>Second canonical paragraph with <a href="/library/rules">a path</a>.</p>', ''),
      expected,
      'synthetic editorial route',
    ),
    /canonical rendered body content or order drifted/,
  );
  assert.throws(
    () => assertRenderedEditorialBody(
      canonical.replace(
        '<p>First canonical paragraph.</p>\n        <h2>A canonical turn</h2>',
        '<h2>A canonical turn</h2>\n        <p>First canonical paragraph.</p>',
      ),
      expected,
      'synthetic editorial route',
    ),
    /canonical rendered body content or order drifted/,
  );

  const relationHtml = `
    <aside data-related-paths>
      <a href="/library/rules" data-related-path="annotation:rules">
        <span>Rules</span>
        <span data-related-connection="true">A precise reviewed bridge.</span>
      </a>
      <a href="/third-enlightenment" data-related-path="static:third-enlightenment">
        <span>The Third Enlightenment</span>
        <span data-related-connection="true">A second reviewed bridge.</span>
      </a>
    </aside>
  `;
  const expectedRelations = [
    { key: 'annotation:rules', text: 'A precise reviewed bridge.' },
    { key: 'static:third-enlightenment', text: 'A second reviewed bridge.' },
  ];
  assert.doesNotThrow(() => assertRenderedRelatedPaths(relationHtml, expectedRelations, 'synthetic relations'));
  assert.throws(
    () => assertRenderedRelatedPaths(
      relationHtml.replace('A precise reviewed bridge.', 'A drifted generic context.'),
      expectedRelations,
      'synthetic relations',
    ),
    /rendered connection text drifted/,
  );
});

test('U5-U7 keep narrow typed claim registries and omit unverified public claims', async () => {
  const { practiceClaims, siteFacts, theoryClaims } = await import('../src/data/site-facts.ts');
  const facts = await readFile(fromRoot('src/data/site-facts.ts'), 'utf8');
  const home = await readFile(fromRoot('src/pages/index.astro'), 'utf8');
  const about = await readFile(fromRoot('src/pages/about.astro'), 'utf8');
  const research = await readFile(fromRoot('src/pages/research.astro'), 'utf8');
  const theory = await readFile(fromRoot('src/pages/third-enlightenment.astro'), 'utf8');
  const principles = await readFile(fromRoot('src/pages/principles.astro'), 'utf8');
  const practices = await readFile(fromRoot('src/pages/practices.astro'), 'utf8');
  const coaching = await readFile(fromRoot('src/pages/coaching.astro'), 'utf8');
  const yoga = await readFile(fromRoot('src/pages/yoga.astro'), 'utf8');
  const photography = await readFile(fromRoot('src/pages/photography.astro'), 'utf8');
  const contact = await readFile(fromRoot('src/pages/contact.astro'), 'utf8');
  const contactForm = await readFile(fromRoot('src/components/ContactForm.astro'), 'utf8');
  const contactThanks = await readFile(fromRoot('src/pages/contact/thanks.astro'), 'utf8');
  const navigation = await readFile(fromRoot('src/data/navigation.ts'), 'utf8');
  const mobilePreview = await readFile(fromRoot('scripts/mobile-preview.mjs'), 'utf8');
  const vercel = JSON.parse(await readFile(fromRoot('vercel.json'), 'utf8'));

  assert.deepEqual(siteFacts, {
    professionalHistory: 'fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge fund',
    education: 'Wharton and M&T combined management and computer science',
    researchFocus: 'how people and organizations notice what matters, choose direction, and preserve judgment as cognition becomes delegable',
    yogaPractice: 'over a decade',
  });
  assert.deepEqual(practiceClaims.availability, { yoga: null, coaching: null });
  assert.deepEqual(practiceClaims.router, {
    research: {
      label: 'Organizational attention',
      title: 'Research',
      href: '/research',
      summary: 'Study how organizations allocate attention and find direction.',
    },
    yoga: {
      label: 'Embodied attention',
      title: 'Yoga',
      href: '/yoga',
      summary: 'Use effort and release to make attention visible through the body.',
    },
    coaching: {
      label: 'Decision practice',
      title: 'Coaching',
      href: '/coaching',
      summary: 'Separate what happened from the explanation already attached to it.',
    },
    organizational: {
      label: 'Judgment under delegation',
      title: 'Organizational work',
      href: '/research#organizational-work',
      summary: 'Ask who may revise the objective and what evidence can interrupt it.',
    },
  });
  assert.equal(
    practiceClaims.coachingMethod,
    'A difficult decision often arrives already explained: the market changed, the team failed, the timing was wrong. Coaching slows that explanation down. What happened? Which part is inference? What choice remains? The aim is not certainty. It is a decision someone can own, together with the evidence that should make them revise it.',
  );
  assert.equal(
    practiceClaims.organizationalMethod,
    'A system can store more than any one person remembers and still preserve an old premise at greater speed. Whether that makes an organization less intelligent depends on how disagreement and revision are handled. The organizational question is where judgment lives—who may revise the objective, how disagreement survives synthesis, and what evidence is allowed to interrupt direction.',
  );
  assert.equal(
    theoryClaims.homeEvidence,
    'In my use, a system can retrieve a forgotten note quickly. Whether that note deserves another month of work remains my decision. That division is where the working theory begins.',
  );
  assert.doesNotMatch(facts, /currentAcademicRole|yogaTeaching|Harvard|HBS|Boston/);
  assert.match(home, /siteFacts\.(?:professionalHistory|researchFocus)/);
  assert.match(home, /theoryClaims\.homeEvidence/);
  for (const routeKey of ['research', 'yoga', 'coaching', 'organizational']) {
    assert.match(home, new RegExp(`practiceClaims\\.router\\.${routeKey}`));
    assert.match(practices, new RegExp(`practiceClaims\\.router\\.${routeKey}`));
  }
  assert.match(about, /siteFacts\.(?:professionalHistory|education|researchFocus|yogaPractice)/);
  assert.match(research, /siteFacts\.professionalHistory/);
  assert.match(yoga, /siteFacts\.yogaPractice/);
  assert.match(yoga, /practiceClaims\.yogaMethod/);
  assert.match(yoga, /practiceClaims\.router\.yoga\.label/);
  assert.match(coaching, /practiceClaims\.coachingMethod/);
  assert.match(coaching, /practiceClaims\.router\.coaching\.label/);
  assert.doesNotMatch(practices, /practiceClaims\.(?:researchMethod|yogaMethod|coachingMethod|organizationalMethod)/);
  assert.match(theory, /theoryClaims\.summary/g);

  const staticPages = [
    home,
    about,
    research,
    theory,
    principles,
    practices,
    coaching,
    yoga,
    photography,
    contact,
    contactForm,
    contactThanks,
  ].join('\n');
  const collectionSources = (await Promise.all([
    canonicalEntries('src/content/essays'),
    canonicalEntries('src/content/notes'),
    canonicalEntries('src/content/reading-annotations'),
  ])).flat()
    .filter(({ data }) => data.publicationStatus === 'published')
    .map(({ source }) => source)
    .join('\n');
  assert.doesNotMatch(
    staticPages,
    /Harvard Business|\bHBS\b|\bBoston\b|teaching yoga|private sessions|group classes|workshops|contact for details|twelve sessions|respond within|within a few days|now accepting|currently available|nervous system|cognitive and emotional clarity|resilience|prints or collaboration|Yoga Alliance RYT/i,
  );
  assert.doesNotMatch(
    staticPages
      .replace('open to revision', ''),
    /\bopen to\b/i,
    'Only the reviewed U5 theory sentence may use “open to”',
  );
  assert.equal(
    (staticPages.match(/open to revision/g) ?? []).length,
    1,
    'The reviewed U5 theory sentence must retain its exact revision-qualified language',
  );
  assert.doesNotMatch(staticPages, /teach yoga|intelligence transformation/i);
  assert.doesNotMatch(
    collectionSources,
    /I teach yoga at a business school|I'm a PhD student|I use this for most of my theoretical work now|I'm still working on this part|student last semester|perfect memory|superhuman pattern recognition|measurement problem is largely solved|clinical discovery|where you actually operate/i,
    'Canonical collection bodies must not bypass the reviewed current-status gate',
  );
  assert.doesNotMatch(
    collectionSources,
    /A student asked what to do when the work stops meaning anything|spending a semester teaching business ethics|teaching organizational change to MBA students|within six months|teaching consciousness|A student saying ["“]I'm not religious|A moment in yoga when a student|No exceptions, no metaphor/i,
    'Published collection copy must not reintroduce unregistered teaching or student anecdotes',
  );
  const retiredPublicClaims = [
    'provides rigorous philological, archaeological, and anthropological evidence for every claim',
    'Physics provides direction; genetics provides mechanism.',
    'Barenboim on music. Applies everywhere.',
    'Truth emerges from dialogue, not from accurate representation.',
    'True enough when the wanting is real.',
    "I've never seen understanding arrive any other way.",
    'The anticipation breaks you. The thing itself rarely does.',
    'Alchemy worked this way',
    'The contemplative finding and the scientific one converge',
    'it finds the same: distributed processes without central control',
    'The counterintuitive result holds across domains',
    'Why measurement culture constrains novelty.',
    'I spent two years at Stanford',
    'The platform optimized driver utilization',
    'Morning Pages work through accumulation.',
    'work whether you believe in them or not',
    'The left hemisphere builds dashboards.',
    'all converge on similar ground',
    'the same basic dynamics operate at every scale',
    'the book shows what becomes possible at that intersection',
    'unfinished dialectic of Western consciousness',
    'this is what all of it has been for',
    'the ultimate subjective projection',
    'The current crisis as emergence into higher consciousness.',
    'Abram explains what happened',
    'indigenous peoples often live sustainably',
    'I find these failure modes more common than they should be',
    'beliefs converge toward averages that no one firmly holds',
    'underappreciated argument for why centralized authority',
    'I find this inversion more often than any other single failure',
    'In practice, I see organizations skip straight',
    'Shareholder value became the de facto purpose',
    'I find this kind of temporal misalignment in a lot',
    'Legitimacy operates as a temporal buffer.',
    'The ones that avoid both failure modes do so',
    'Each increment of precision makes the underlying choice',
    'Within a decade, the rankings increasingly measure',
    'Once something becomes measurable, it tends to become salient',
    "If you don't settle what you're optimizing for",
    'There is no algorithm for determining what the algorithm should maximize.',
    'A room full of executives falling silent',
    "Try it. He's right.",
    'I watched a restructuring fall apart six months after launch.',
    'reproduce colonial patterns',
    'I watched a boardroom where both sides claimed victory',
    'Training closes possibilities; education opens them.',
    'Reading the Iliad carefully, you notice the characters never deliberate.',
    'Someone gave me this at twenty.',
    'Five words that name what the meaning crisis is missing.',
    'recycled philosophy dressed in hoodies',
    'An organization that doubled its quality controls',
    'The intervention caused the problem.',
    'creates two hypothesized risks',
    'It is a coordination hypothesis',
    'The model predicts a tradeoff.',
    'This essay does not establish',
    'The narrower implication is conditional',
    'The proposed mechanism is temporal',
  ];
  for (const retiredClaim of retiredPublicClaims) {
    assert.ok(
      !collectionSources.includes(retiredClaim),
      `Published collection copy reintroduced a retired claim: ${retiredClaim}`,
    );
  }
  for (const retiredLabel of [
    'Awareness · Person',
    'Awareness · Organization',
    'Agency · Person',
    'Agency · Organization',
    'Practice · Awareness at the scale of a person',
    'Practice · Agency at the scale of a person',
  ]) {
    assert.ok(!staticPages.includes(retiredLabel), `Practice router reintroduced the consulting-matrix label: ${retiredLabel}`);
  }
  assert.doesNotMatch(staticPages, /href=["']\/work(?:["'#?])/);

  assert.match(research, /getPublishedEssays/);
  assert.match(research, /getPublishedNotes/);
  for (const slug of ['where-you-want-variance', 'from-org-theory-to-ai', 'the-dot-collector']) {
    assert.match(research, new RegExp(slug));
  }
  assert.match(research, /id=["']organizational-work["']/);
  assert.match(research, /Slides · 27 pages/);
  assert.equal(
    sha256(await readFile(fromRoot('public/managing-interns.pdf'))),
    '0797bf780d1acacc17883e5dfe205cdd9e9b71950b642c39b2549c2ebc7e4517',
    'The reviewed 27-page Managing Interns deck must remain the linked artifact',
  );
  assert.match(theory, /Working theory/);
  assert.doesNotMatch(theory, /The Three Modes|The Formula|<blockquote|Hegel|Spinoza|Buddha|Descartes/);
  assert.match(principles, /A personal Sikh mapping/);
  assert.match(principles, /This is my mapping, not a definition of the tradition\./);
  assert.equal((principles.match(/In this mapping/g) ?? []).length, 3);
  let previousPrinciple = -1;
  for (const heading of [
    'First: Values set direction. Evidence sets method.',
    'From there: Capabilities are discovered, not declared.',
    'Then: Codify what works.',
    "But always: Protect what matters from what's measurable.",
    "Therefore: Earn autonomy. Don't gamble for it.",
  ]) {
    const position = principles.indexOf(heading);
    assert.ok(position > previousPrinciple, `${heading} must retain its reviewed place in the five personal distinctions`);
    previousPrinciple = position;
  }

  assert.match(navigation, /label: 'Research'[\s\S]*href: '\/research'/);
  assert.match(mobilePreview, /'\/research'/);
  assert.doesNotMatch(mobilePreview, /'\/work'/);
  assert.equal(existsSync(fromRoot('src/pages/work.astro')), false);
  for (const source of [
    'content-source/pages/home.md',
    'content-source/pages/about.md',
    'content-source/pages/third-enlightenment.md',
  ]) {
    assert.equal(existsSync(fromRoot(source)), false, `${source} must not remain as a parallel authoring source`);
  }

  assert.deepEqual(
    vercel.redirects?.find(({ source }) => source === '/work'),
    { source: '/work', destination: '/research', permanent: true },
  );
  assert.equal(vercel.redirects?.filter(({ source }) => source === '/work').length, 1);
});
