#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseRouteContract } from './lib/release-route-contract.mjs';

const productionOrigin = 'https://www.amitoj.co';
const previewHostnamePattern = /\b(?:[a-z0-9-]+\.)+vercel\.app\b/i;

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const namedEntities = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['gt', '>'],
  ['lt', '<'],
  ['nbsp', '\u00a0'],
  ['quot', '"'],
]);

function decodeEntities(value = '') {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi, (entity, token) => {
    if (token.startsWith('#x') || token.startsWith('#X')) {
      return String.fromCodePoint(Number.parseInt(token.slice(2), 16));
    }
    if (token.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(token.slice(1), 10));
    }
    return namedEntities.get(token.toLowerCase()) ?? entity;
  });
}

function attributes(tag) {
  const result = {};
  const body = tag.replace(/^<\/?[\w:-]+\s*/, '').replace(/\/?\s*>$/, '');
  for (const match of body.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = match[1].toLowerCase();
    assert.equal(result[name], undefined, `Duplicate ${name} attribute in ${tag}`);
    result[name] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
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

function elementText(html, name, label) {
  const matches = [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi'))];
  assert.equal(matches.length, 1, `${label} must appear exactly once`);
  return decodeEntities(matches[0][1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function canonicalForRoute(route) {
  return route === '/' ? `${productionOrigin}/` : `${productionOrigin}${route}`;
}

function routeForHtmlFile(file) {
  const normalized = file.replaceAll('\\', '/');
  if (normalized === 'index.html') return '/';
  if (normalized === '404.html') return '/404';
  if (normalized.endsWith('/index.html')) return `/${normalized.slice(0, -'/index.html'.length)}`;
  return `/${normalized.slice(0, -'.html'.length)}`;
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(join(directory, prefix), { withFileTypes: true });
  const files = [];
  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    const child = prefix ? join(prefix, entry.name) : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listFiles(directory, child));
    } else if (entry.isFile()) {
      files.push(child.replaceAll('\\', '/'));
    } else {
      throw new Error(`dist must not contain non-file output: ${child}`);
    }
  }
  return files;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function sortedUnique(values, label) {
  const sorted = values.toSorted();
  assert.equal(new Set(sorted).size, sorted.length, `${label} must not contain duplicates`);
  return sorted;
}

function assertExactSet(actual, expected, label) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value)).toSorted();
  const unexpected = [...actualSet].filter((value) => !expectedSet.has(value)).toSorted();
  if (missing.length || unexpected.length) {
    throw new Error(
      `${label} mismatch. Missing: ${missing.join(', ') || 'none'}. Unexpected: ${unexpected.join(', ') || 'none'}.`,
    );
  }
}

function assertNoPreviewHost(value, label) {
  const leakedHostname = value.match(previewHostnamePattern)?.[0];
  assert.equal(leakedHostname, undefined, `${label} must not expose Preview hostname ${leakedHostname}`);
}

function expectedRedirects(publication) {
  assert.equal(publication.publicationTransitions.length, 1, 'Exactly one U7 publication redirect is expected');
  return [
    { source: '/blog/the-third-enlightenment', destination: '/third-enlightenment', permanent: true },
    { source: '/essays', destination: '/writing', permanent: true },
    {
      source: '/images/photography-optimized/IMG_2056.webp',
      destination: '/images/photography-optimized/IMG_2056_rotated.webp',
      permanent: true,
    },
    { source: '/work', destination: '/research', permanent: true },
  ].toSorted((left, right) => compareText(left.source, right.source));
}

function collectPageFragments(html, route) {
  const fragments = new Set();
  for (const match of html.matchAll(/<([\w:-]+)\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const values = [attrs.id, match[1].toLowerCase() === 'a' ? attrs.name : undefined].filter(Boolean);
    for (const value of values) {
      assert.ok(!fragments.has(value), `Duplicate HTML fragment "${value}" on ${route}`);
      fragments.add(value);
    }
  }
  return fragments;
}

function srcsetValues(value) {
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0]).filter(Boolean);
}

function pageReferences(html, route) {
  const references = [];
  const push = (raw, kind) => {
    if (raw !== undefined) references.push({ from: route, raw, kind });
  };

  for (const { attrs } of tags(html, 'a')) push(attrs.href, 'anchor');
  for (const { attrs } of tags(html, 'img')) {
    assert.ok(Object.hasOwn(attrs, 'alt'), `${route} image ${attrs.src ?? '(missing src)'} must declare alt text`);
    push(attrs.src, 'asset');
    for (const value of srcsetValues(attrs.srcset ?? '')) push(value, 'asset');
  }
  for (const name of ['audio', 'iframe', 'script', 'source', 'video']) {
    for (const { attrs } of tags(html, name)) {
      push(attrs.src, 'asset');
      for (const value of srcsetValues(attrs.srcset ?? '')) push(value, 'asset');
      if (name === 'video') push(attrs.poster, 'asset');
    }
  }
  for (const { attrs } of tags(html, 'link')) {
    const rel = (attrs.rel ?? '').split(/\s+/).map((value) => value.toLowerCase());
    if (rel.some((value) => ['alternate', 'icon', 'stylesheet', 'sitemap'].includes(value))) {
      push(attrs.href, 'asset');
    }
  }

  return references;
}

function internalUrl(raw, fromRoute) {
  assert.ok(raw.trim(), `${fromRoute} contains an empty internal reference`);
  if (/^(?:data|mailto|tel):/i.test(raw)) return null;
  assert.doesNotMatch(raw, /^javascript:/i, `${fromRoute} must not contain javascript: references`);

  let url;
  try {
    url = new URL(raw, canonicalForRoute(fromRoute));
  } catch {
    throw new Error(`Invalid URL reference from ${fromRoute}: ${raw}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  if (url.origin !== productionOrigin) return null;
  assert.equal(url.username, '', `Internal URL from ${fromRoute} must not contain credentials`);
  assert.equal(url.password, '', `Internal URL from ${fromRoute} must not contain credentials`);
  return url;
}

function assertInternalReference({ from, raw, kind }, context) {
  const url = internalUrl(raw, from);
  if (!url) return { internal: false, asset: false, fragment: false };

  const { htmlRoutes, outputPaths, pageFragments, redirectSources } = context;
  const path = decodeURIComponent(url.pathname);
  if (kind === 'anchor') {
    assert.ok(!redirectSources.has(path), `${from} links to redirect source ${path} instead of its terminal destination`);
  }
  assert.ok(
    path === '/' || !path.endsWith('/'),
    `${from} contains a trailing-slash internal reference: ${raw}`,
  );

  const isRoute = htmlRoutes.has(path);
  const isOutput = outputPaths.has(path);
  assert.ok(isRoute || isOutput, `Unresolved internal ${kind} from ${from}: ${raw}`);

  let checkedFragment = false;
  if (url.hash) {
    assert.ok(isRoute, `Fragment target from ${from} is not an HTML route: ${raw}`);
    const fragment = decodeURIComponent(url.hash.slice(1));
    assert.ok(
      pageFragments.get(path)?.has(fragment),
      `Unresolved fragment "${fragment}" from ${from}: ${raw}`,
    );
    checkedFragment = true;
  }

  return { internal: true, asset: !isRoute, fragment: checkedFragment };
}

function metadataContract(html, route) {
  const meta = tags(html, 'meta');
  const links = tags(html, 'link');
  const title = elementText(html, 'title', `${route} title`);
  assert.ok(title, `${route} title must not be blank`);

  const description = exactlyOne(meta, ({ attrs }) => attrs.name === 'description', `${route} description`).attrs.content;
  assert.ok(description.trim(), `${route} description must not be blank`);
  assert.equal(
    exactlyOne(meta, ({ attrs }) => attrs.name === 'author', `${route} author`).attrs.content,
    'Amitoj Singh',
  );

  const robots = exactlyOne(meta, ({ attrs }) => attrs.name === 'robots', `${route} robots`).attrs.content;
  assert.equal(
    robots,
    ['/404', '/contact/thanks'].includes(route) ? 'noindex, nofollow' : 'index, follow',
    `${route} must keep its deliberate document indexing policy`,
  );

  const canonical = exactlyOne(links, ({ attrs }) => attrs.rel === 'canonical', `${route} canonical`).attrs.href;
  assert.equal(canonical, canonicalForRoute(route), `${route} must be self-canonical on the production origin`);
  assertNoPreviewHost(html, route);

  const article = route.startsWith('/essays/') || route.startsWith('/blog/') || route.startsWith('/library/');
  const expectedOg = new Map([
    ['og:title', title],
    ['og:description', description],
    ['og:type', article ? 'article' : 'website'],
    ['og:url', canonical],
  ]);
  for (const [property, expected] of expectedOg) {
    assert.equal(
      exactlyOne(meta, ({ attrs }) => attrs.property === property, `${route} ${property}`).attrs.content,
      expected,
    );
  }

  const ogImage = exactlyOne(meta, ({ attrs }) => attrs.property === 'og:image', `${route} og:image`).attrs.content;
  const ogImageAlt = exactlyOne(meta, ({ attrs }) => attrs.property === 'og:image:alt', `${route} og:image:alt`).attrs.content;
  assert.equal(
    exactlyOne(meta, ({ attrs }) => attrs.property === 'og:image:width', `${route} og:image:width`).attrs.content,
    '768',
  );
  assert.equal(
    exactlyOne(meta, ({ attrs }) => attrs.property === 'og:image:height', `${route} og:image:height`).attrs.content,
    '1024',
  );
  assert.equal(new URL(ogImage).origin, productionOrigin, `${route} social image must use the production origin`);
  assert.ok(ogImageAlt.trim().length >= 20, `${route} social image alt text must be meaningful`);

  const expectedTwitter = new Map([
    ['twitter:card', 'summary'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', ogImage],
    ['twitter:image:alt', ogImageAlt],
  ]);
  for (const [name, expected] of expectedTwitter) {
    assert.equal(
      exactlyOne(meta, ({ attrs }) => attrs.name === name, `${route} ${name}`).attrs.content,
      expected,
    );
  }

  assert.equal(
    exactlyOne(
      links,
      ({ attrs }) => attrs.rel === 'alternate' && attrs.type === 'application/rss+xml',
      `${route} RSS discovery`,
    ).attrs.href,
    `${productionOrigin}/rss.xml`,
  );
  assert.equal(
    exactlyOne(links, ({ attrs }) => attrs.rel === 'sitemap', `${route} sitemap discovery`).attrs.href,
    `${productionOrigin}/sitemap-index.xml`,
  );

  return { canonical, description, ogImage, title };
}

async function verifyDiscovery({ dist, htmlRoutes, rssRoutes, files }) {
  for (const file of ['robots.txt', 'rss.xml', 'sitemap-0.xml', 'sitemap-index.xml']) {
    assert.ok(files.includes(file), `dist/${file} is required`);
  }
  assert.deepEqual(
    files.filter((file) => /^sitemap-\d+\.xml$/.test(file)),
    ['sitemap-0.xml'],
    'The release contract expects one deterministic sitemap payload',
  );

  const sitemapIndex = await readFile(join(dist, 'sitemap-index.xml'), 'utf8');
  assertNoPreviewHost(sitemapIndex, 'sitemap-index.xml');
  const sitemapIndexLocations = [...sitemapIndex.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1]));
  assert.deepEqual(sitemapIndexLocations, [`${productionOrigin}/sitemap-0.xml`]);

  const sitemap = await readFile(join(dist, 'sitemap-0.xml'), 'utf8');
  assertNoPreviewHost(sitemap, 'sitemap-0.xml');
  const actualSitemapRoutes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => decodeEntities(match[1]));
  sortedUnique(actualSitemapRoutes, 'Sitemap members');
  const expectedSitemapRoutes = htmlRoutes
    .filter((route) => !['/404', '/contact', '/contact/thanks'].includes(route))
    .map((route) => route === '/' ? productionOrigin : canonicalForRoute(route))
    .toSorted();
  assertExactSet(actualSitemapRoutes, expectedSitemapRoutes, 'Sitemap member set');

  const rss = await readFile(join(dist, 'rss.xml'), 'utf8');
  assertNoPreviewHost(rss, 'rss.xml');
  const items = [...rss.matchAll(/<item>[\s\S]*?<\/item>/g)].map((match) => match[0]);
  const actualRssRoutes = items.map((item) => {
    const link = item.match(/<link>([^<]+)<\/link>/)?.[1];
    assert.ok(link, 'Every RSS item must contain a link');
    const url = new URL(decodeEntities(link));
    assert.equal(url.origin, productionOrigin, 'RSS item links must use the production origin');
    return url.pathname;
  });
  assert.deepEqual(actualRssRoutes, rssRoutes, 'RSS members and order must match the reviewed publication set');

  const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
  assertNoPreviewHost(robots, 'robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/www\.amitoj\.co\/sitemap-index\.xml$/m);

  return {
    rssItems: items.length,
    sitemapRoutes: expectedSitemapRoutes,
  };
}

async function distTreeSha256(dist, files) {
  const tree = createHash('sha256');
  for (const file of files) {
    const path = join(dist, file);
    const buffer = await readFile(path);
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    tree.update(`${file}\0${buffer.length}\0${fileHash}\n`);
  }
  return tree.digest('hex');
}

export async function verifySite({ root, dist = join(root, 'dist') }) {
  const [migration, publication, vercel, files] = await Promise.all([
    readJson(join(root, 'tests/fixtures/post-migration-baseline.json')),
    readJson(join(root, 'tests/fixtures/u7-publication-voice-contract.json')),
    readJson(join(root, 'vercel.json')),
    listFiles(dist),
  ]);
  const { htmlRoutes: expectedHtmlRoutes, rssRoutes } = releaseRouteContract(migration, publication);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const actualHtmlRoutes = sortedUnique(htmlFiles.map(routeForHtmlFile), 'Generated HTML routes');
  assertExactSet(actualHtmlRoutes, expectedHtmlRoutes, 'Generated HTML route set');

  const expectedVercelRedirects = expectedRedirects(publication);
  const actualRedirects = (vercel.redirects ?? [])
    .map(({ source, destination, permanent }) => ({ source, destination, permanent }))
    .toSorted((left, right) => compareText(left.source, right.source));
  assert.deepEqual(actualRedirects, expectedVercelRedirects, 'Vercel redirect set must match the reviewed one-hop contract');
  const redirectSources = new Set(actualRedirects.map(({ source }) => source));
  assert.equal(redirectSources.size, actualRedirects.length, 'Vercel redirect sources must be unique');

  const routeFile = new Map(htmlFiles.map((file) => [routeForHtmlFile(file), file]));
  const htmlByRoute = new Map(await Promise.all(actualHtmlRoutes.map(async (route) => [
    route,
    await readFile(join(dist, routeFile.get(route)), 'utf8'),
  ])));
  const pageFragments = new Map(
    [...htmlByRoute].map(([route, html]) => [route, collectPageFragments(html, route)]),
  );
  const outputPaths = new Set(files.map((file) => `/${file}`));
  const htmlRouteSet = new Set(actualHtmlRoutes);

  for (const redirect of actualRedirects) {
    assert.equal(redirect.permanent, true, `${redirect.source} must remain permanent`);
    assert.ok(redirect.source.startsWith('/') && redirect.destination.startsWith('/'), 'Redirects must remain origin-relative');
    assert.ok(!htmlRouteSet.has(redirect.source), `${redirect.source} must not also generate an HTML page`);
    assert.ok(!outputPaths.has(redirect.source), `${redirect.source} must not also generate a static file`);
    assert.ok(!redirectSources.has(redirect.destination), `${redirect.source} must not enter a redirect chain`);
    assertInternalReference(
      { from: '/', raw: redirect.destination, kind: 'redirect destination' },
      { htmlRoutes: htmlRouteSet, outputPaths, pageFragments, redirectSources: new Set() },
    );
  }

  const titles = new Map();
  const descriptions = new Map();
  const references = [];
  for (const [route, html] of htmlByRoute) {
    const metadata = metadataContract(html, route);
    assert.ok(!titles.has(metadata.title), `${route} repeats the title used by ${titles.get(metadata.title)}`);
    assert.ok(!descriptions.has(metadata.description), `${route} repeats the description used by ${descriptions.get(metadata.description)}`);
    titles.set(metadata.title, route);
    descriptions.set(metadata.description, route);
    references.push(...pageReferences(html, route));
    references.push({ from: route, raw: metadata.ogImage, kind: 'social image' });
  }

  let internalReferences = 0;
  let localAssetReferences = 0;
  let fragmentReferences = 0;
  for (const reference of references) {
    const checked = assertInternalReference(reference, {
      htmlRoutes: htmlRouteSet,
      outputPaths,
      pageFragments,
      redirectSources,
    });
    if (checked.internal) internalReferences += 1;
    if (checked.asset) localAssetReferences += 1;
    if (checked.fragment) fragmentReferences += 1;
  }

  for (const file of files.filter((path) => path.endsWith('.css'))) {
    const css = await readFile(join(dist, file), 'utf8');
    assertNoPreviewHost(css, file);
    const cssReferences = [
      ...[...css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map((match) => match[2]),
      ...[...css.matchAll(/@import\s+(?!url\()["']([^"']+)["']/gi)].map((match) => match[1]),
    ];
    for (const reference of cssReferences) {
      const value = reference.trim();
      if (!value || value.startsWith('data:')) continue;
      const from = `/${file}`;
      const absolute = new URL(value, `${productionOrigin}${from}`).toString();
      const checked = assertInternalReference(
        { from: '/', raw: absolute, kind: 'stylesheet asset' },
        { htmlRoutes: htmlRouteSet, outputPaths, pageFragments, redirectSources },
      );
      if (checked.internal) internalReferences += 1;
      if (checked.asset) localAssetReferences += 1;
    }
  }

  for (const file of files.filter((path) => /\.(?:js|json|txt|xml)$/i.test(path))) {
    assertNoPreviewHost(await readFile(join(dist, file), 'utf8'), file);
  }

  const discovery = await verifyDiscovery({
    dist,
    htmlRoutes: actualHtmlRoutes,
    rssRoutes,
    files,
  });
  const treeSha256 = await distTreeSha256(dist, files);
  const reportWithoutEvidenceHash = {
    schemaVersion: 1,
    status: 'PASS',
    productionOrigin,
    counts: {
      distFiles: files.length,
      htmlRoutes: actualHtmlRoutes.length,
      indexableRoutes: discovery.sitemapRoutes.length,
      rssItems: discovery.rssItems,
      redirects: actualRedirects.length,
      internalReferences,
      localAssetReferences,
      fragmentReferences,
    },
    htmlRoutes: actualHtmlRoutes,
    indexableRoutes: discovery.sitemapRoutes,
    rssRoutes,
    redirects: actualRedirects,
    distTreeSha256: treeSha256,
  };
  const evidenceSha256 = createHash('sha256')
    .update(JSON.stringify(reportWithoutEvidenceHash))
    .digest('hex');

  return { ...reportWithoutEvidenceHash, evidenceSha256 };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  try {
    console.log(JSON.stringify(await verifySite({ root }), null, 2));
  } catch (error) {
    console.error(`verify:dist failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
