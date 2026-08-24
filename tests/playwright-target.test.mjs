import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertNavigationConfined,
  isExpectedPreviewConsoleError,
  LOCAL_BASE_URL,
  resolvePlaywrightTarget,
  shouldBlockExternalPost,
  traceModeForTarget,
} from '../scripts/lib/playwright-target.mjs';

test('the default Playwright target retains the local preview server', () => {
  assert.deepEqual(resolvePlaywrightTarget({}), {
    baseURL: LOCAL_BASE_URL,
    isRemoteVercelHost: false,
    shareURL: null,
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
      shareURL: null,
      webServer: undefined,
    },
  );
});

test('an environment-only Vercel share link is same-origin and narrowly shaped', () => {
  const baseURL = 'https://amitoj-site-as-one-mind-a1b2c3d4.vercel.app';
  const shareURL = `${baseURL}/?_vercel_share=temporary-example-token`;
  const protectedTarget = resolvePlaywrightTarget({
    PLAYWRIGHT_BASE_URL: baseURL,
    PLAYWRIGHT_VERCEL_SHARE_URL: shareURL,
  });
  assert.equal(protectedTarget.shareURL, shareURL);
  assert.equal(traceModeForTarget(protectedTarget), 'off');
  assert.equal(traceModeForTarget(resolvePlaywrightTarget({ PLAYWRIGHT_BASE_URL: baseURL })), 'retain-on-failure');

  for (const value of [
    'https://different-candidate.vercel.app/?_vercel_share=token',
    `${baseURL}/path?_vercel_share=token`,
    `${baseURL}/?_vercel_share=token&extra=value`,
    `${baseURL}/?_vercel_share=`,
  ]) {
    assert.throws(
      () => resolvePlaywrightTarget({
        PLAYWRIGHT_BASE_URL: baseURL,
        PLAYWRIGHT_VERCEL_SHARE_URL: value,
      }),
      /PLAYWRIGHT_VERCEL_SHARE_URL/,
    );
  }
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

test('only exact Vercel Preview console noise is ignored', () => {
  const siteBaseURL = 'https://amitoj-preview.vercel.app';
  const toolbarMessage = "Loading the script 'https://vercel.live/_next-live/feedback/feedback.js' violates the following Content Security Policy directive: \"script-src 'self'\". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked.";
  assert.equal(isExpectedPreviewConsoleError({
    isRemoteVercelHost: true,
    locationURL: `${siteBaseURL}/writing`,
    message: toolbarMessage,
    route: '/writing',
    siteBaseURL,
  }), true);
  assert.equal(isExpectedPreviewConsoleError({
    isRemoteVercelHost: true,
    locationURL: `${siteBaseURL}/404`,
    message: 'Failed to load resource: the server responded with a status of 404 ()',
    route: '/404',
    siteBaseURL,
  }), true);

  for (const input of [
    { isRemoteVercelHost: false, locationURL: `${siteBaseURL}/writing`, message: toolbarMessage, route: '/writing', siteBaseURL },
    { isRemoteVercelHost: true, locationURL: `${siteBaseURL}/app.js`, message: toolbarMessage, route: '/writing', siteBaseURL },
    { isRemoteVercelHost: true, locationURL: `${siteBaseURL}/writing`, message: `${toolbarMessage} extra`, route: '/writing', siteBaseURL },
    { isRemoteVercelHost: true, locationURL: `${siteBaseURL}/missing.js`, message: 'Failed to load resource: the server responded with a status of 404 ()', route: '/404', siteBaseURL },
  ]) {
    assert.equal(isExpectedPreviewConsoleError(input), false);
  }
});
