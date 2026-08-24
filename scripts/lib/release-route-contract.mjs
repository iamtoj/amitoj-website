import assert from 'node:assert/strict';

export const STATIC_HTML_ROUTES = Object.freeze([
  '/',
  '/404',
  '/about',
  '/coaching',
  '/contact',
  '/contact/thanks',
  '/library',
  '/photography',
  '/practices',
  '/principles',
  '/research',
  '/third-enlightenment',
  '/writing',
  '/yoga',
]);

function sortedUnique(values, label) {
  const sorted = values.toSorted();
  assert.equal(new Set(sorted).size, sorted.length, `${label} must not contain duplicates`);
  return sorted;
}

function orderedUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must not contain duplicates`);
  return values;
}

export function releaseRouteContract(migration, publication) {
  const retiredNotes = new Set(
    publication.publicationTransitions.map(({ redirect }) => redirect.source),
  );
  const currentNotes = migration.notes.filter(({ route }) => !retiredNotes.has(route));
  const htmlRoutes = sortedUnique([
    ...STATIC_HTML_ROUTES,
    ...migration.essays.map(({ route }) => route),
    ...currentNotes.map(({ route }) => route),
    ...migration.readingAnnotations.map(({ route }) => route),
  ], 'Expected HTML routes');

  assert.equal(migration.essays.length, publication.currentPublication.publishedEssays);
  assert.equal(currentNotes.length, publication.currentPublication.publishedNotes);
  assert.equal(migration.readingAnnotations.length, publication.currentPublication.publishedAnnotations);
  assert.equal(
    migration.essays.length + currentNotes.length + migration.readingAnnotations.length,
    publication.currentPublication.publicEditorialDetails,
  );

  const rssRoutes = orderedUnique([
    ...currentNotes.toSorted((left, right) => left.metadata.sortOrder - right.metadata.sortOrder),
    ...migration.essays.toSorted((left, right) => left.metadata.sortOrder - right.metadata.sortOrder),
  ].map(({ route }) => route), 'Expected RSS routes');

  return { htmlRoutes, rssRoutes };
}
