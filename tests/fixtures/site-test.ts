import { expect, test as base, type BrowserContext } from '@playwright/test';
import {
  resolvePlaywrightTarget,
  shouldBlockExternalPost,
} from '../../scripts/lib/playwright-target.mjs';

export { expect };
export type { Page, Request, Route } from '@playwright/test';

type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

export const test = base.extend<
  { externalPostGuard: void },
  { vercelShareState: StorageState }
>({
  vercelShareState: [async ({ browser }, use) => {
    const target = resolvePlaywrightTarget();
    if (!target.shareURL) {
      await use({ cookies: [], origins: [] });
      return;
    }

    const authContext = await browser.newContext();
    try {
      const page = await authContext.newPage();
      let response;
      try {
        response = await page.goto(target.shareURL, { waitUntil: 'domcontentloaded' });
      } catch {
        throw new Error('The Vercel share link could not authorize the configured Preview origin');
      }
      const finalURL = new URL(page.url());
      if (!response || response.status() >= 400 || finalURL.origin !== target.baseURL
        || finalURL.pathname !== '/') {
        throw new Error('The Vercel share link did not authorize the configured Preview origin');
      }
      const state = await authContext.storageState();
      if (!state.cookies.some(({ domain }) => target.baseURL.endsWith(domain.replace(/^\./, '')))) {
        throw new Error('The Vercel share link did not establish an authorization cookie');
      }
      await use(state);
    } finally {
      await authContext.close();
    }
  }, { scope: 'worker' }],
  storageState: async ({ vercelShareState }, use) => use(vercelShareState),
  externalPostGuard: [async ({ baseURL, context }, use) => {
    if (!baseURL) throw new Error('The release browser harness requires a configured baseURL');
    const blockedRequests: string[] = [];

    await context.route('**/*', async (route) => {
      const request = route.request();
      if (shouldBlockExternalPost(request.url(), request.method(), baseURL)) {
        blockedRequests.push(`${request.method()} ${new URL(request.url()).origin}`);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });

    await use();
    await context.unroute('**/*');
    expect(
      blockedRequests,
      'External POSTs are denied by default; every intentional transport request needs an explicit page-level mock',
    ).toEqual([]);
  }, { auto: true }],
});
