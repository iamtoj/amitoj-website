import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/site-test';

const representativePages = [
  '/',
  '/about',
  '/research',
  '/practices',
  '/coaching',
  '/yoga',
  '/photography',
  '/third-enlightenment',
  '/principles',
  '/contact',
  '/contact/thanks',
  '/writing',
  '/essays/strategic-time',
  '/blog/the-dot-collector',
  '/library/seeing-like-a-state',
] as const;

function seriousOrCritical(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, impact, help, nodes }) => ({
      id,
      impact,
      help,
      targets: nodes.map(({ target }) => target),
    }));
}

for (const path of representativePages) {
  test(`${path} has no serious or critical axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(seriousOrCritical(results.violations)).toEqual([]);
  });
}

test('closed and open mobile navigation have no serious or critical axe violations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/writing');

  const closed = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(closed.violations)).toEqual([]);

  await page.getByRole('button', { name: 'Open site navigation' }).click();
  await expect(page.locator('#mobile-site-navigation')).toBeVisible();
  const open = await new AxeBuilder({ page }).analyze();
  expect(seriousOrCritical(open.violations)).toEqual([]);
});

test('practice and contact archetypes preserve heading order and 320px reflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  for (const path of ['/', '/practices', '/coaching', '/yoga', '/photography', '/contact', '/contact/thanks']) {
    await page.goto(path);
    const contract = await page.evaluate(() => {
      const levels = [...document.querySelectorAll('main h1, main h2, main h3')]
        .map((heading) => Number(heading.tagName.slice(1)));
      return {
        levels,
        contentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(contract.levels[0], `${path} must begin with H1`).toBe(1);
    for (let index = 1; index < contract.levels.length; index += 1) {
      expect(contract.levels[index] - contract.levels[index - 1], `${path} must not skip a heading level`).toBeLessThanOrEqual(1);
    }
    expect(contract.contentWidth, `${path} must not require two-dimensional scrolling`).toBeLessThanOrEqual(contract.viewportWidth + 1);
  }
});

test('practice links and contact controls expose visible focus and invalid-field focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  const reachedPracticePaths: string[] = [];
  for (let step = 0; step < 30 && reachedPracticePaths.length < 4; step += 1) {
    await page.keyboard.press('Tab');
    const href = await page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLAnchorElement && active.closest('[data-practice-map]')
        ? active.getAttribute('href')
        : null;
    });
    if (href) reachedPracticePaths.push(href);
  }
  expect(reachedPracticePaths).toEqual(['/research#investing-lens', '/yoga', '/coaching', '/photography']);

  for (const link of await page.locator('[data-practice-path]').all()) {
    await link.focus();
    const outline = await link.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
  }

  await page.route('https://formspree.io/**', (route) => route.abort('blockedbyclient'));
  await page.goto('/contact');
  for (const selector of ['#category', '#name', '#email', '#message', '[data-submit-button]']) {
    const control = page.locator(selector);
    await control.focus();
    const outline = await control.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
  }
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.locator('#category')).toBeFocused();
  await expect(page.locator('#_gotcha')).toHaveAttribute('tabindex', '-1');
  await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
});
