import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  assertNavigationConfined,
  isExpectedPreviewConsoleError,
  resolvePlaywrightTarget,
} from '../scripts/lib/playwright-target.mjs';
import { releaseRouteContract } from '../scripts/lib/release-route-contract.mjs';
import { expect, test } from './fixtures/site-test';

const root = fileURLToPath(new URL('../', import.meta.url));
const migration = JSON.parse(readFileSync(`${root}/tests/fixtures/post-migration-baseline.json`, 'utf8'));
const publication = JSON.parse(readFileSync(`${root}/tests/fixtures/u7-publication-voice-contract.json`, 'utf8'));
const vercel = JSON.parse(readFileSync(`${root}/vercel.json`, 'utf8'));
const productionOrigin = 'https://www.amitoj.co';
const previewHostnamePattern = /\b(?:[a-z0-9-]+\.)+vercel\.app\b/i;
const browserTarget = resolvePlaywrightTarget();
const remoteVercelHost = browserTarget.isRemoteVercelHost ? browserTarget.baseURL : null;
const { htmlRoutes: routes } = releaseRouteContract(migration, publication);
const configuredHeaders = new Map<string, string>(
  vercel.headers
    .find(({ source }: { source: string }) => source === '/(.*)')
    .headers
    .map(({ key, value }: { key: string; value: string }): [string, string] => [key.toLowerCase(), value]),
);

const canonicalFor = (route: string) => route === '/' ? `${productionOrigin}/` : `${productionOrigin}${route}`;

test('every generated route renders its canonical, images, and scripts without browser errors', async ({ page }) => {
  test.setTimeout(180_000);
  if (!remoteVercelHost) {
    await page.route('**/_vercel/insights/script.js*', (route) => route.fulfill({
      body: '',
      contentType: 'application/javascript',
      status: 200,
    }));
  }
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  let currentRoute = '/';
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    if (isExpectedPreviewConsoleError({
      isRemoteVercelHost: Boolean(remoteVercelHost),
      locationURL: location.url,
      message: message.text(),
      route: currentRoute,
      siteBaseURL: browserTarget.baseURL,
    })) return;
    consoleErrors.push(`${currentRoute}: ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(`${currentRoute}: ${error.message}`));

  for (const route of routes) {
    currentRoute = route;
    const response = await page.goto(route, { waitUntil: 'load' });
    const expectedStatus = route === '/404' && remoteVercelHost ? 404 : 200;
    expect(response?.status(), route).toBe(expectedStatus);
    await expect(page.locator('link[rel="canonical"]'), `${route} canonical`).toHaveAttribute('href', canonicalFor(route));
    await expect(page.locator('meta[property="og:url"]'), `${route} Open Graph URL`).toHaveAttribute('content', canonicalFor(route));
    const html = await page.content();
    expect(html, `${route} must not leak any Vercel hostname`).not.toMatch(previewHostnamePattern);
    if (remoteVercelHost) {
      assertNavigationConfined({
        finalUrl: page.url(),
        redirected: response?.request().redirectedFrom() !== null,
        requestedPath: route,
        siteBaseURL: remoteVercelHost,
      });
      expect(html, `${route} must not leak its Preview hostname`).not.toContain(new URL(remoteVercelHost).hostname);
      const headers = response?.headers() ?? {};
      expect(headers['x-robots-tag'], `${route} Preview noindex`).toMatch(/(?:^|[,\s])noindex(?:$|[,\s])/i);
      for (const [key, value] of configuredHeaders) {
        expect(headers[key], `${route} Preview header ${key}`).toBe(value);
      }
    }

    if (await page.locator('img').count()) {
      await page.evaluate(async () => {
        for (let offset = 0; offset < document.documentElement.scrollHeight; offset += window.innerHeight) {
          window.scrollTo(0, offset);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await expect.poll(
        () => page.locator('img').evaluateAll((images) => (images as HTMLImageElement[])
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.getAttribute('src'))),
        { message: `${route} images must load`, timeout: 10_000 },
      ).toEqual([]);
    }
  }

  expect(consoleErrors, 'The full route crawl must not emit console errors').toEqual([]);
  expect(pageErrors, 'The full route crawl must not emit uncaught page errors').toEqual([]);
});

test('an unknown path returns the reviewed 404 document', async ({ page }) => {
  const missingRoute = '/__release-verification-missing__';
  const response = await page.goto(missingRoute);
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  if (remoteVercelHost) {
    assertNavigationConfined({
      finalUrl: page.url(),
      redirected: response?.request().redirectedFrom() !== null,
      requestedPath: missingRoute,
      siteBaseURL: remoteVercelHost,
    });
    const headers = response?.headers() ?? {};
    expect(headers['x-robots-tag'], 'unknown-path Preview noindex').toMatch(/(?:^|[,\s])noindex(?:$|[,\s])/i);
    for (const [key, value] of configuredHeaders) {
      expect(headers[key], `unknown-path Preview header ${key}`).toBe(value);
    }
  }
});

test('the separately verified Vercel candidate confines redirects and exposes noindex plus reviewed headers', async ({ request }) => {
  test.skip(!remoteVercelHost, 'Vercel response evidence requires PLAYWRIGHT_BASE_URL');
  const previewOrigin = new URL(remoteVercelHost!).origin;
  const response = await request.get('/', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  assertNavigationConfined({
    finalUrl: response.url(),
    redirected: false,
    requestedPath: '/',
    siteBaseURL: previewOrigin,
  });
  const headers = response.headers();
  expect(headers['x-robots-tag']).toMatch(/(?:^|[,\s])noindex(?:$|[,\s])/i);

  for (const [key, value] of configuredHeaders) {
    expect(headers[key], `Preview header ${key}`).toBe(value);
  }

  await Promise.all(['/', '/rss.xml', '/sitemap-index.xml', '/sitemap-0.xml', '/robots.txt'].map(async (path) => {
    const artifact = await request.get(path, { maxRedirects: 0 });
    expect(artifact.status(), path).toBe(200);
    assertNavigationConfined({
      finalUrl: artifact.url(),
      redirected: false,
      requestedPath: path,
      siteBaseURL: previewOrigin,
    });
    const body = await artifact.text();
    expect(body, `${path} must not expose its Preview host`).not.toContain(new URL(previewOrigin).hostname);
    expect(body, `${path} must not expose any Vercel hostname`).not.toMatch(previewHostnamePattern);
  }));

  await Promise.all(vercel.redirects.map(async (redirect: { source: string; destination: string }) => {
    const hop = await request.get(redirect.source, { maxRedirects: 0 });
    expect(hop.status(), redirect.source).toBe(308);
    const location = hop.headers().location;
    expect(location, `${redirect.source} Location`).toBeTruthy();
    const resolved = new URL(location!, previewOrigin);
    expect(resolved.origin, `${redirect.source} must stay on the verified Vercel host`).toBe(previewOrigin);
    expect(`${resolved.pathname}${resolved.search}${resolved.hash}`).toBe(redirect.destination);
    const terminal = await request.get(resolved.toString(), { maxRedirects: 0 });
    expect(terminal.status(), `${redirect.source} terminal response`).toBe(200);
    if (routes.includes(redirect.destination)) {
      expect(await terminal.text(), `${redirect.source} terminal canonical`)
        .toContain(`rel="canonical" href="${canonicalFor(redirect.destination)}"`);
    }
  }));
});
