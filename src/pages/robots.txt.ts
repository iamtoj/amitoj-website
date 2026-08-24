import type { APIRoute } from 'astro';

const robots = [
  'User-agent: *',
  'Allow: /',
  'Sitemap: https://www.amitoj.co/sitemap-index.xml',
  '',
].join('\n');

export const GET: APIRoute = () => new Response(robots, {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
