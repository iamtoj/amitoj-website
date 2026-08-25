import type {
  EditorialContinuation,
  EditorialForm,
  EditorialReference,
  InquiryTrailDefinition,
} from '../data/editorial-network';

export interface EditorialRecord {
  ref: EditorialReference;
  title: string;
  path: string;
  publicationStatus: 'draft' | 'published';
  context: string;
  form: EditorialForm;
  continuations: EditorialContinuation[];
}

export function referenceKey(ref: EditorialReference): string {
  return `${ref.kind}:${ref.slug}`;
}

function assertExactKeys(value: object, expected: string[], label: string) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} may contain only ${wanted.join(' and ')}`);
  }
}

function assertReferenceShape(ref: EditorialReference, label: string) {
  assertExactKeys(ref, ['kind', 'slug'], label);
  if (!['essay', 'note', 'annotation', 'static'].includes(ref.kind)) {
    throw new Error(`${label} has an unknown kind`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref.slug)) {
    throw new Error(`${label} has an invalid slug`);
  }
}

export function validateEditorialNetwork(
  records: EditorialRecord[],
  trails: InquiryTrailDefinition[],
): Map<string, EditorialRecord> {
  const recordsByKey = new Map<string, EditorialRecord>();

  for (const record of records) {
    assertReferenceShape(record.ref, `Record ${referenceKey(record.ref)}`);
    const key = referenceKey(record.ref);
    if (recordsByKey.has(key)) throw new Error(`Duplicate editorial record: ${key}`);
    if (!record.title.trim()) throw new Error(`${key} is missing a title`);
    if (!record.path.startsWith('/')) throw new Error(`${key} has an invalid path`);
    recordsByKey.set(key, record);
  }

  for (const record of records) {
    const sourceKey = referenceKey(record.ref);
    if (record.publicationStatus === 'draft') {
      if (record.continuations.length > 0) {
        throw new Error(`${sourceKey} is a draft and cannot declare public continuations`);
      }
      continue;
    }
    if (!record.context.trim()) throw new Error(`${sourceKey} is missing grounded context`);
    if (record.ref.kind !== 'static' && record.continuations.length === 0) {
      throw new Error(`${sourceKey} is missing a continuation`);
    }

    const targets = new Set<string>();
    for (const [index, continuation] of record.continuations.entries()) {
      const allowedKeys = continuation.connection === undefined
        ? ['target']
        : ['target', 'connection'];
      assertExactKeys(continuation, allowedKeys, `${sourceKey} continuation ${index + 1}`);
      assertReferenceShape(continuation.target, `${sourceKey} continuation ${index + 1} target`);
      const targetKey = referenceKey(continuation.target);
      if (targetKey === sourceKey) throw new Error(`${sourceKey} cannot continue to itself`);
      if (targets.has(targetKey)) throw new Error(`${sourceKey} duplicates continuation ${targetKey}`);
      targets.add(targetKey);

      const target = recordsByKey.get(targetKey);
      if (!target) throw new Error(`${sourceKey} targets missing or unregistered ${targetKey}`);
      if (target.publicationStatus !== 'published') throw new Error(`${sourceKey} targets draft ${targetKey}`);

      if (continuation.connection !== undefined) {
        const connection = continuation.connection.trim();
        if (!connection) throw new Error(`${sourceKey}->${targetKey} has an empty connection`);
        const escapedTitle = target.title
          .toLowerCase()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escapedTitle}\\b`, 'i').test(connection)) {
          throw new Error(`${sourceKey}->${targetKey} copies its resolved title into relation data`);
        }
        if (connection.includes(target.path)) {
          throw new Error(`${sourceKey}->${targetKey} copies its resolved path into relation data`);
        }
      }
    }
  }

  const trailIds = new Set<string>();
  const trailQuestions = new Set<string>();
  if (trails.length < 3) throw new Error('The public network must contain at least three inquiry trails');
  for (const trail of trails) {
    assertExactKeys(trail, ['id', 'question', 'objects'], `Trail ${trail.id}`);
    if (!trail.question.trim()) throw new Error(`Trail ${trail.id} must state a question`);
    if (trailIds.has(trail.id)) throw new Error(`Duplicate inquiry trail id: ${trail.id}`);
    if (trailQuestions.has(trail.question)) throw new Error(`Duplicate inquiry trail question: ${trail.question}`);
    trailIds.add(trail.id);
    trailQuestions.add(trail.question);

    const objects = new Set<string>();
    const forms = new Set<EditorialForm>();
    let essayCount = 0;
    let noteOrTheoryCount = 0;
    let annotationCount = 0;
    for (const ref of trail.objects) {
      assertReferenceShape(ref, `Trail ${trail.id} reference`);
      const key = referenceKey(ref);
      if (objects.has(key)) throw new Error(`Trail ${trail.id} duplicates ${key}`);
      objects.add(key);
      const record = recordsByKey.get(key);
      if (!record) throw new Error(`Trail ${trail.id} targets missing or unregistered ${key}`);
      if (record.publicationStatus !== 'published') throw new Error(`Trail ${trail.id} targets draft ${key}`);
      forms.add(record.form);
      if (ref.kind === 'essay') essayCount += 1;
      if (ref.kind === 'note' || record.form === 'Working theory') noteOrTheoryCount += 1;
      if (ref.kind === 'annotation') annotationCount += 1;
    }
    if (forms.size < 2) throw new Error(`Trail ${trail.id} must mix editorial forms`);
    if (essayCount < 1) throw new Error(`Trail ${trail.id} must include at least one Essay`);
    if (noteOrTheoryCount < 1) throw new Error(`Trail ${trail.id} must include at least one Note or working theory`);
    if (annotationCount < 2) throw new Error(`Trail ${trail.id} must include at least two Reading Annotations`);
  }

  return recordsByKey;
}
