import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertNavigationConfined,
  LOCAL_BASE_URL,
  resolvePlaywrightTarget,
  shouldBlockExternalPost,
} from '../scripts/lib/playwright-target.mjs';

test('the default Playwright target retains the local preview server', () => {
  assert.deepEqual(resolvePlaywrightTarget({}), {
    baseURL: LOCAL_BASE_URL,
    isRemoteVercelHost: false,
    webServer: {
      command: 'ASTRO_PREVIEW_BACKGROUND=0 npm run preview -- --host 127.0.0.1 --port 4327',
      url: LOCAL_BASE_URL,
      reuseExistingServer: false,
    },
  });
});

test('an explicit root-level Vercel target disables the local web server', () => {
  assert.deepEqual(
    resolvePlaywrightTarget({
      PLAYWRIGHT_BASE_URL: 'https://amitoj-site-as-one-mind-a1b2c3d4.vercel.app/',
    }),
    {
      baseURL: 'https://amitoj-site-as-one-mind-a1b2c3d4.vercel.app',
      isRemoteVercelHost: true,
      webServer: undefined,
    },
  );
});

test('remote targets fail closed when they are not root-level Vercel hosts', () => {
  for (const value of [
    'http://amitoj-preview.vercel.app',
    'https://www.amitoj.co',
    'https://amitoj-preview.vercel.app/some/path',
    'https://user:secret@amitoj-preview.vercel.app',
  ]) {
    assert.throws(
      () => resolvePlaywrightTarget({ PLAYWRIGHT_BASE_URL: value }),
      /PLAYWRIGHT_BASE_URL/,
      value,
    );
  }
});

test('the browser safety policy denies external POSTs but permits reads and same-origin requests', () => {
  const preview = 'https://amitoj-site-as-one-mind-a1b2c3d4.vercel.app';
  assert.equal(shouldBlockExternalPost('https://formspree.io/f/example', 'POST', preview), true);
  assert.equal(shouldBlockExternalPost('https://example.com/collect', 'post', preview), true);
  assert.equal(shouldBlockExternalPost('https://formspree.io/legal/privacy-policy/', 'GET', preview), false);
  assert.equal(shouldBlockExternalPost(`${preview}/local-endpoint`, 'POST', preview), false);
  assert.equal(shouldBlockExternalPost('not a URL', 'POST', preview), true);
});

test('remote navigation must stay on the requested route without a redirect', () => {
  const preview = 'https://amitoj-site-as-one-mind-a1b2c3d4.vercel.app';
  assert.doesNotThrow(() => assertNavigationConfined({
    finalUrl: `${preview}/writing`,
    redirected: false,
    requestedPath: '/writing',
    siteBaseURL: preview,
  }));

  for (const input of [
    { finalUrl: 'https://different-candidate.vercel.app/writing', redirected: true },
    { finalUrl: `${preview}/research`, redirected: false },
  ]) {
    assert.throws(
      () => assertNavigationConfined({
        ...input,
        requestedPath: '/writing',
        siteBaseURL: preview,
      }),
      /must not redirect|escaped its verified target/,
    );
  }
});
