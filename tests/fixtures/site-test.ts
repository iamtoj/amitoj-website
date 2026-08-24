import { expect, test as base } from '@playwright/test';
import { shouldBlockExternalPost } from '../../scripts/lib/playwright-target.mjs';

export { expect };
export type { Page, Request, Route } from '@playwright/test';

export const test = base.extend<{ externalPostGuard: void }>({
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
