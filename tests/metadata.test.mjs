import assert from 'node:assert/strict';
import { glob, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const productionOrigin = 'https://www.amitoj.co';
const ogImage = `${productionOrigin}/images/profile.jpeg`;
const ogImageAlt = 'Amitoj Singh smiling while seated beside the water, with a city skyline behind him.';
const migration = JSON.parse(await readFile(join(root, 'tests/fixtures/post-migration-baseline.json'), 'utf8'));
const u7 = JSON.parse(await readFile(join(root, 'tests/fixtures/u7-publication-voice-contract.json'), 'utf8'));
const retiredNoteRoutes = new Set(u7.publicationTransitions.map(({ redirect }) => redirect.source));
const currentNotes = migration.notes.filter(({ route }) => !retiredNoteRoutes.has(route));

function decode(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attributes(tag) {
  const result = {};
  const body = tag.replace(/^<\/?[\w:-]+\s*/, '').replace(/\/?\s*>$/, '');
  for (const match of body.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return result;
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map((match) => ({
    raw: match[0],
    attrs: attributes(match[0]),
  }));
}

function exactlyOne(items, predicate, label) {
  const matches = items.filter(predicate);
  assert.equal(matches.length, 1, `${label} must appear exactly once`);
  return matches[0];
}

function routeForOutput(file) {
  const output = relative(dist, file).replaceAll('\\', '/');
  if (output === 'index.html') return '/';
  if (output.endsWith('/index.html')) return `/${output.slice(0, -'/index.html'.length)}`;
  return `/${output.replace(/\.html$/, '')}`;
}

function canonicalFor(pathname) {
  return pathname === '/' ? `${productionOrigin}/` : `${productionOrigin}${pathname}`;
}

function assertNoPreviewHost(value, label) {
  assert.doesNotMatch(value, /https?:\/\/[^\s"'<]*\.vercel\.app/i, `${label} must not expose a Preview hostname`);
}

function jpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'profile.jpeg must remain a JPEG');
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;

  while (offset < buffer.length) {
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = buffer.readUInt16BE(offset);
    if (startOfFrameMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }

  throw new Error('profile.jpeg has no readable dimensions');
}

test('every generated HTML page has one complete production metadata contract', async () => {
  const files = (await Array.fromAsync(glob('**/*.html', { cwd: dist })))
    .map((file) => join(dist, file))
    .sort();
  const routes = files.map(routeForOutput);

  assert.ok(routes.includes('/404'), 'dist/404.html must be included in metadata verification');
  assert.equal(new Set(routes).size, routes.length, 'Generated HTML routes must be unique');
  const profile = await readFile(join(dist, 'images/profile.jpeg'));
  assert.deepEqual(jpegDimensions(profile), { width: 768, height: 1024 }, 'The shared OG image asset and declared dimensions must agree');

  for (const [index, file] of files.entries()) {
    const route = routes[index];
    const html = await readFile(file, 'utf8');
    const meta = tags(html, 'meta');
    const links = tags(html, 'link');
    const titles = [...html.matchAll(/<title\b[^>]*>[\s\S]*?<\/title>/gi)];
    assert.equal(titles.length, 1, `${route} needs exactly one title`);
    assertNoPreviewHost(html, route);

    for (const name of ['description', 'robots', 'author']) {
      exactlyOne(meta, ({ attrs }) => attrs.name === name, `${route} meta[name=${name}]`);
    }
    const robots = exactlyOne(meta, ({ attrs }) => attrs.name === 'robots', `${route} robots`);
    assert.equal(
      robots.attrs.content,
      ['/404', '/contact/thanks'].includes(route) ? 'noindex, nofollow' : 'index, follow',
      `${route} must have its deliberate indexing policy`,
    );
    const canonical = exactlyOne(links, ({ attrs }) => attrs.rel === 'canonical', `${route} canonical`);
    assert.equal(canonical.attrs.href, canonicalFor(route), `${route} canonical must use its production pathname`);
    assert.ok(route === '/' || !canonical.attrs.href.endsWith('/'), `${route} canonical must not have a trailing slash`);

    const expectedOg = {
      'og:title': undefined,
      'og:description': undefined,
      'og:type': route.startsWith('/essays/') || route.startsWith('/blog/') || route.startsWith('/library/')
        ? 'article'
        : 'website',
      'og:url': canonicalFor(route),
      'og:image': ogImage,
      'og:image:width': '768',
      'og:image:height': '1024',
      'og:image:alt': ogImageAlt,
    };
    for (const [property, expected] of Object.entries(expectedOg)) {
      const element = exactlyOne(meta, ({ attrs }) => attrs.property === property, `${route} ${property}`);
      if (expected !== undefined) assert.equal(element.attrs.content, expected, `${route} ${property}`);
    }

    const expectedTwitter = {
      'twitter:card': 'summary',
      'twitter:title': undefined,
      'twitter:description': undefined,
      'twitter:image': ogImage,
      'twitter:image:alt': ogImageAlt,
    };
    for (const [name, expected] of Object.entries(expectedTwitter)) {
      const element = exactlyOne(meta, ({ attrs }) => attrs.name === name, `${route} ${name}`);
      if (expected !== undefined) assert.equal(element.attrs.content, expected, `${route} ${name}`);
    }

    const description = exactlyOne(meta, ({ attrs }) => attrs.name === 'description', `${route} description`);
    assert.equal(
      exactlyOne(meta, ({ attrs }) => attrs.property === 'og:description', `${route} og:description`).attrs.content,
      description.attrs.content,
    );
    assert.equal(
      exactlyOne(meta, ({ attrs }) => attrs.name === 'twitter:description', `${route} twitter:description`).attrs.content,
      description.attrs.content,
    );

    const rss = exactlyOne(
      links,
      ({ attrs }) => attrs.rel === 'alternate' && attrs.type === 'application/rss+xml',
      `${route} RSS discovery`,
    );
    assert.equal(rss.attrs.href, `${productionOrigin}/rss.xml`);
    const sitemap = exactlyOne(links, ({ attrs }) => attrs.rel === 'sitemap', `${route} sitemap discovery`);
    assert.equal(sitemap.attrs.href, `${productionOrigin}/sitemap-index.xml`);
  }
});

test('article metadata uses only verified dates and tags for the five current Notes', async () => {
  for (const note of currentNotes) {
    const html = await readFile(join(dist, 'blog', note.slug, 'index.html'), 'utf8');
    const meta = tags(html, 'meta');
    const published = exactlyOne(meta, ({ attrs }) => attrs.property === 'article:published_time', `${note.route} published time`);
    assert.equal(published.attrs.content, new Date(note.metadata.pubDate).toISOString());
    assert.deepEqual(
      meta.filter(({ attrs }) => attrs.property === 'article:tag').map(({ attrs }) => attrs.content),
      note.metadata.tags,
      `${note.route} tags must preserve canonical order`,
    );
  }
  for (const route of retiredNoteRoutes) {
    await assert.rejects(readFile(join(dist, route.slice(1), 'index.html'), 'utf8'), { code: 'ENOENT' });
  }

  for (const entry of [...migration.essays, ...migration.readingAnnotations]) {
    const html = await readFile(join(dist, entry.route.slice(1), 'index.html'), 'utf8');
    const meta = tags(html, 'meta');
    assert.equal(meta.filter(({ attrs }) => attrs.property === 'article:published_time').length, 0, `${entry.route} must not invent a date`);
    assert.equal(meta.filter(({ attrs }) => attrs.property === 'article:modified_time').length, 0, `${entry.route} must not invent an update date`);
  }
});

test('identity and practice routes publish their exact reviewed metadata', async () => {
  const contracts = [
    {
      route: '/',
      file: join(dist, 'index.html'),
      title: 'Amitoj Singh | Research, writing, and practices of attention',
      description: 'Amitoj Singh researches how people and organizations notice what matters, choose direction, and preserve judgment as cognition becomes delegable.',
    },
    {
      route: '/research',
      file: join(dist, 'research', 'index.html'),
      title: 'Research | Amitoj Singh',
      description: 'Questions and public work on organizational attention, direction, judgment, and delegable cognition.',
    },
    {
      route: '/practices',
      file: join(dist, 'practices', 'index.html'),
      title: 'Practices | Amitoj Singh',
      description: 'Research, organizational work, yoga, coaching, and photography as practices of attention and agency.',
    },
    {
      route: '/coaching',
      file: join(dist, 'coaching', 'index.html'),
      title: 'Coaching | Amitoj Singh',
      description: 'A practice of seeing a situation clearly, locating the choice that remains, and taking responsibility for it.',
    },
    {
      route: '/yoga',
      file: join(dist, 'yoga', 'index.html'),
      title: 'Yoga | Amitoj Singh',
      description: 'A personal practice of attention, effort, and release through the body.',
    },
    {
      route: '/photography',
      file: join(dist, 'photography', 'index.html'),
      title: 'Photography | Amitoj Singh',
      description: 'A contact sheet: seeing as a form of attention.',
    },
    {
      route: '/contact',
      file: join(dist, 'contact', 'index.html'),
      title: 'Contact | Amitoj Singh',
      description: 'Send Amitoj Singh a response, question, or connection prompted by the work on this site.',
    },
    {
      route: '/contact/thanks',
      file: join(dist, 'contact', 'thanks', 'index.html'),
      title: 'Message submitted | Amitoj Singh',
      description: 'Confirmation that a message was submitted through amitoj.co.',
    },
  ];

  for (const contract of contracts) {
    const html = await readFile(contract.file, 'utf8');
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const description = exactlyOne(
      tags(html, 'meta'),
      ({ attrs }) => attrs.name === 'description',
      `${contract.route} description`,
    );
    assert.equal(decode(title), contract.title);
    assert.equal(description.attrs.content, contract.description);
  }
});

test('RSS, sitemap, and robots expose the deliberate public discovery surface', async () => {
  const rss = await readFile(join(dist, 'rss.xml'), 'utf8');
  assertNoPreviewHost(rss, 'RSS');
  const items = [...rss.matchAll(/<item>[\s\S]*?<\/item>/g)].map((match) => match[0]);
  assert.equal(items.length, 9, 'RSS must contain the 4 published Essays and 5 current published Notes');
  assert.deepEqual(
    items.map((item) => item.match(/<link>([^<]+)<\/link>/)?.[1]),
    [
      ...currentNotes.toSorted((left, right) => left.metadata.sortOrder - right.metadata.sortOrder),
      ...migration.essays.toSorted((left, right) => left.metadata.sortOrder - right.metadata.sortOrder),
    ].map((entry) => canonicalFor(entry.route)),
    'RSS ordering and no-trailing-slash URLs must be deterministic',
  );
  for (const entry of migration.essays) {
    const item = items.find((value) => value.includes(`<link>${canonicalFor(entry.route)}</link>`));
    assert.ok(item, `RSS is missing ${entry.route}`);
    assert.doesNotMatch(item, /<pubDate>/, `${entry.route} must remain undated in RSS`);
  }
  for (const entry of currentNotes) {
    const item = items.find((value) => value.includes(`<link>${canonicalFor(entry.route)}</link>`));
    assert.ok(item, `RSS is missing ${entry.route}`);
    assert.match(item, new RegExp(`<pubDate>${new Date(entry.metadata.pubDate).toUTCString()}</pubDate>`));
  }
  assert.doesNotMatch(rss, /where-you-are/, 'Draft Essays must stay out of RSS');
  assert.doesNotMatch(rss, /blog\/the-third-enlightenment/, 'The retired Note must stay out of RSS');

  const sitemapIndex = await readFile(join(dist, 'sitemap-index.xml'), 'utf8');
  const sitemap = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
  assertNoPreviewHost(sitemapIndex, 'Sitemap index');
  assertNoPreviewHost(sitemap, 'Sitemap');
  assert.match(sitemapIndex, new RegExp(`<loc>${productionOrigin}/sitemap-0\\.xml</loc>`));

  const htmlFiles = (await Array.fromAsync(glob('**/*.html', { cwd: dist }))).map((file) => join(dist, file));
  const expectedLocations = htmlFiles
    .map(routeForOutput)
    .filter((route) => !['/404', '/contact', '/contact/thanks'].includes(route) && !/\.(?:xml|txt)$/i.test(route))
    .map((route) => route === '/' ? productionOrigin : canonicalFor(route))
    .sort();
  const actualLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decode(match[1])).sort();
  assert.deepEqual(actualLocations, expectedLocations, 'Sitemap membership must match the generated public HTML surface');
  assert.ok(!actualLocations.includes(canonicalFor('/contact/thanks')), 'The noindex thanks fallback must stay out of the sitemap');
  assert.ok(!actualLocations.includes(canonicalFor('/blog/the-third-enlightenment')), 'The retired Note must stay out of the sitemap');
  for (const route of ['/practices', '/coaching', '/yoga', '/photography']) {
    assert.ok(actualLocations.includes(canonicalFor(route)), `${route} must be discoverable through the sitemap`);
  }

  const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
  assertNoPreviewHost(robots, 'robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/www\.amitoj\.co\/sitemap-index\.xml$/m);
});

test('Vercel redirect and security policy preserve the reviewed production contract', async () => {
  const vercel = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
  assert.deepEqual(
    vercel.redirects?.find(({ source }) => source === '/essays'),
    { source: '/essays', destination: '/writing', permanent: true },
  );
  assert.deepEqual(
    vercel.redirects?.find(({ source }) => source === '/work'),
    { source: '/work', destination: '/research', permanent: true },
  );
  const retiredNoteRedirect = u7.publicationTransitions[0].redirect;
  assert.deepEqual(
    vercel.redirects?.find(({ source }) => source === retiredNoteRedirect.source),
    retiredNoteRedirect,
  );
  assert.equal(vercel.redirects?.filter(({ source }) => source === retiredNoteRedirect.source).length, 1);
  assert.equal(vercel.redirects?.some(({ source }) => source === retiredNoteRedirect.destination), false);
  const removedPhotoPath = '/images/photography-optimized/IMG_2056.webp';
  assert.deepEqual(
    vercel.redirects?.find(({ source }) => source === removedPhotoPath),
    {
      source: removedPhotoPath,
      destination: '/images/photography-optimized/IMG_2056_rotated.webp',
      permanent: true,
    },
  );
  assert.equal(vercel.redirects?.filter(({ source }) => source === removedPhotoPath).length, 1);
  assert.equal(
    vercel.redirects?.some(({ source }) => source === '/images/photography-optimized/IMG_2056_rotated.webp'),
    false,
    'The retained photograph must be the terminal one-hop destination',
  );

  const allRoutes = vercel.headers?.find(({ source }) => source === '/(.*)');
  assert.ok(allRoutes, 'Security headers must apply to every route');
  const headers = new Map(allRoutes.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(headers.get('strict-transport-security'), 'max-age=63072000');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');

  const csp = headers.get('content-security-policy');
  assert.ok(csp, 'Content-Security-Policy is required');
  const directives = new Map(csp.split(';').map((directive) => directive.trim()).filter(Boolean).map((directive) => {
    const [name, ...values] = directive.split(/\s+/);
    return [name, values];
  }));
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('script-src'), ["'self'", "'unsafe-inline'", 'https://va.vercel-scripts.com']);
  assert.deepEqual(directives.get('style-src'), ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']);
  assert.deepEqual(directives.get('font-src'), ["'self'", 'https://fonts.gstatic.com']);
  assert.deepEqual(directives.get('img-src'), ["'self'", 'data:']);
  assert.deepEqual(directives.get('form-action'), ['https://formspree.io']);
  assert.deepEqual(directives.get('frame-ancestors'), ["'none'"]);
  assert.deepEqual(directives.get('connect-src'), ["'self'", 'https://vitals.vercel-insights.com', 'https://formspree.io']);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
});
