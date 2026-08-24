import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPublishedEssays, getPublishedNotes } from '../lib/content';

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('RSS requires the production site origin');

  const [essays, notes] = await Promise.all([
    getPublishedEssays(),
    getPublishedNotes(),
  ]);

  return rss({
    title: 'Amitoj Singh — Writing',
    description: 'Essays and notes on organizations, strategy, intelligence, and human flourishing.',
    site,
    trailingSlash: false,
    customData: '<language>en-us</language>',
    items: [
      ...notes.map((note) => ({
        title: note.data.title,
        description: note.data.description,
        link: `/blog/${note.data.slug}`,
        pubDate: note.data.pubDate,
        categories: note.data.tags,
      })),
      ...essays.map((essay) => ({
        title: essay.data.title,
        description: essay.data.description,
        link: `/essays/${essay.data.slug}`,
      })),
    ],
  });
};
