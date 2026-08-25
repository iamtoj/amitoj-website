import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const publicationStatus = z.enum(['draft', 'published']).default('draft');
const publicSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const contentReference = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('essay'), slug: publicSlug }).strict(),
  z.object({ kind: z.literal('note'), slug: publicSlug }).strict(),
  z.object({ kind: z.literal('annotation'), slug: publicSlug }).strict(),
  z.object({ kind: z.literal('static'), slug: publicSlug }).strict(),
]);

const continuation = z.object({
  target: contentReference,
  connection: z.string().min(1).optional(),
}).strict();

const sharedEditorialFields = {
  slug: publicSlug,
  publicationStatus,
  title: z.string().min(1),
  sortOrder: z.number().int().positive(),
  continuations: z.array(continuation).default([]),
};

function requirePublishedFields(
  data: Record<string, unknown>,
  context: z.RefinementCtx,
  fields: string[],
) {
  if (data.publicationStatus !== 'published') return;

  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      context.addIssue({
        code: 'custom',
        path: [field],
        message: `${field} is required when publicationStatus is published`,
      });
    }
  }
}

const essays = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/essays' }),
  schema: z.object({
    ...sharedEditorialFields,
    description: z.string().min(1).optional(),
    summary: z.string().min(1).optional(),
    publishedLabel: z.string().min(1).optional(),
    cardPublishedLabel: z.string().min(1).optional(),
    homeFeature: z.object({
      sortOrder: z.number().int().positive(),
      summary: z.string().min(1),
    }).optional(),
  }).superRefine((data, context) => {
    requirePublishedFields(data, context, [
      'description',
      'summary',
      'publishedLabel',
      'cardPublishedLabel',
    ]);
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: z.object({
    ...sharedEditorialFields,
    description: z.string().min(1).optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().startsWith('/').optional(),
    tags: z.array(z.string().min(1)).default([]),
  }).superRefine((data, context) => {
    requirePublishedFields(data, context, ['description', 'pubDate']);
  }),
});

const readingAnnotations = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/reading-annotations' }),
  schema: z.object({
    ...sharedEditorialFields,
    pageTitle: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    author: z.string().min(1).optional(),
    cardTitle: z.string().min(1).optional(),
    cardAuthor: z.string().min(1).optional(),
    cardReadingTime: z.string().min(1).optional(),
    cardDifficulty: z.string().min(1).optional(),
    cardTags: z.array(z.string().min(1)).optional(),
    teaser: z.string().min(1).optional(),
    detailReadingTime: z.string().min(1).optional(),
    detailDifficulty: z.string().min(1).optional(),
    detailTags: z.array(z.string().min(1)).optional(),
    continuationLabel: z.string().min(1).optional(),
  }).superRefine((data, context) => {
    requirePublishedFields(data, context, [
      'pageTitle',
      'description',
      'author',
      'cardTitle',
      'cardAuthor',
      'cardReadingTime',
      'cardDifficulty',
      'cardTags',
      'teaser',
      'detailReadingTime',
      'detailDifficulty',
      'detailTags',
    ]);
  }),
});

export const collections = { essays, notes, readingAnnotations };
