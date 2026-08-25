import { getCollection, type CollectionEntry } from 'astro:content';
import {
  editorialForms,
  inquiryTrails,
  staticEditorialTargets,
  type EditorialContinuation,
  type EditorialKind,
  type EditorialReference,
} from '../data/editorial-network';
import {
  referenceKey,
  validateEditorialNetwork,
  type EditorialRecord,
} from './editorial-network-contract';

type OrderedEntry = { data: { sortOrder: number } };

function bySortOrder(left: OrderedEntry, right: OrderedEntry) {
  return left.data.sortOrder - right.data.sortOrder;
}

function isPublished<T extends { data: { publicationStatus: string } }>(entry: T) {
  return entry.data.publicationStatus === 'published';
}

export async function getPublishedEssays(): Promise<CollectionEntry<'essays'>[]> {
  return (await getEditorialNetwork()).publishedEssays;
}

export async function getPublishedNotes(): Promise<CollectionEntry<'notes'>[]> {
  return (await getEditorialNetwork()).publishedNotes;
}

export async function getPublishedReadingAnnotations(): Promise<CollectionEntry<'readingAnnotations'>[]> {
  return (await getEditorialNetwork()).publishedReadingAnnotations;
}

export type ResolvedEditorialTarget = EditorialRecord;

export interface ResolvedContinuation extends ResolvedEditorialTarget {
  connection?: string;
}

export interface ResolvedInquiryTrail {
  id: string;
  question: string;
  objects: ResolvedEditorialTarget[];
}

function collectionRecord(
  kind: Exclude<EditorialKind, 'static'>,
  entry: CollectionEntry<'essays'> | CollectionEntry<'notes'> | CollectionEntry<'readingAnnotations'>,
): EditorialRecord {
  const { data } = entry;
  const context = kind === 'essay'
    ? (data as CollectionEntry<'essays'>['data']).summary ?? ''
    : kind === 'note'
      ? (data as CollectionEntry<'notes'>['data']).description ?? ''
      : (data as CollectionEntry<'readingAnnotations'>['data']).teaser ?? '';
  const pathPrefix = kind === 'essay' ? '/essays' : kind === 'note' ? '/blog' : '/library';

  return {
    ref: { kind, slug: data.slug } as EditorialReference,
    title: data.title,
    path: `${pathPrefix}/${data.slug}`,
    publicationStatus: data.publicationStatus,
    context,
    form: editorialForms[kind],
    continuations: data.continuations as EditorialContinuation[],
  };
}

let networkPromise: Promise<{
  publishedEssays: CollectionEntry<'essays'>[];
  publishedNotes: CollectionEntry<'notes'>[];
  publishedReadingAnnotations: CollectionEntry<'readingAnnotations'>[];
  resolve: (ref: EditorialReference) => ResolvedEditorialTarget;
  trails: ResolvedInquiryTrail[];
}> | undefined;

export function getEditorialNetwork() {
  networkPromise ??= (async () => {
    const [essays, notes, annotations] = await Promise.all([
      getCollection('essays'),
      getCollection('notes'),
      getCollection('readingAnnotations'),
    ]);
    const records: EditorialRecord[] = [
      ...essays.map((entry) => collectionRecord('essay', entry)),
      ...notes.map((entry) => collectionRecord('note', entry)),
      ...annotations.map((entry) => collectionRecord('annotation', entry)),
      ...staticEditorialTargets.map((target) => ({ ...target, continuations: [] })),
    ];
    const recordsByKey = validateEditorialNetwork(records, inquiryTrails);
    const resolve = (ref: EditorialReference) => {
      const record = recordsByKey.get(referenceKey(ref));
      if (!record || record.publicationStatus !== 'published') {
        throw new Error(`Editorial target is not public: ${referenceKey(ref)}`);
      }
      return record;
    };

    return {
      publishedEssays: essays.filter(isPublished).sort(bySortOrder),
      publishedNotes: notes.filter(isPublished).sort(bySortOrder),
      publishedReadingAnnotations: annotations.filter(isPublished).sort(bySortOrder),
      resolve,
      trails: inquiryTrails.map((trail) => ({
        ...trail,
        objects: trail.objects.map(resolve),
      })),
    };
  })();

  return networkPromise;
}

export async function resolveEditorialView(
  ref: EditorialReference,
  continuations: EditorialContinuation[],
) {
  const network = await getEditorialNetwork();
  return {
    current: network.resolve(ref),
    continuations: continuations.map(({ target, connection }) => ({
      ...network.resolve(target),
      connection,
    })),
  };
}
