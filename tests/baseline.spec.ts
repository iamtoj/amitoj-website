import { expect, test } from './fixtures/site-test';

const representativePages = [
  { path: '/', heading: 'Amitoj Singh' },
  { path: '/research', heading: 'Research' },
  { path: '/practices', heading: 'Practices' },
  { path: '/coaching', heading: 'Coaching' },
  { path: '/writing', heading: 'Writing' },
  { path: '/library', heading: 'Library' },
  { path: '/essays/strategic-time', heading: 'Strategic Time' },
  { path: '/blog/the-dot-collector', heading: 'The Dot Collector' },
  { path: '/library/seeing-like-a-state', heading: 'Seeing Like a State' },
  { path: '/yoga', heading: 'Yoga' },
  { path: '/photography', heading: 'Photography' },
  { path: '/contact', heading: 'Contact' },
  { path: '/contact/thanks', heading: 'Thank you' },
] as const;

for (const pageContract of representativePages) {
  test(`${pageContract.path} preserves its public identity`, async ({ page }) => {
    const response = await page.goto(pageContract.path);

    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: pageContract.heading })).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    const widths = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  });
}

test('home preserves the U5 identity and completes the U6 practice map below it', async ({ page }) => {
  await page.goto('/');

  const hero = page.locator('[data-home-hero]');
  await expect(hero).toContainText('preserve judgment as cognition becomes delegable');
  await expect(hero.getByRole('link')).toHaveCount(2);
  await expect(hero.locator('a[href="/research"]')).toHaveText(/Research/);
  await expect(hero.locator('a[href="/writing"]')).toHaveText(/Writing/);
  await expect(page.locator('[data-practice-map] [data-practice-path]')).toHaveCount(4);
});

test('Tailwind 4 preserves the oat, ink, Garamond, and editorial layout contracts', async ({ page }) => {
  await page.goto('/');

  const contract = await page.evaluate(() => {
    const html = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const paragraph = getComputedStyle(document.querySelector('[data-home-hero] p')!);
    const hero = getComputedStyle(document.querySelector('[data-home-hero-grid]')!);
    return {
      background: html.backgroundColor,
      color: body.color,
      fontFamily: body.fontFamily,
      proseMaxWidth: paragraph.maxWidth,
      heroColumns: hero.gridTemplateColumns.split(' ').length,
    };
  });

  expect(contract.background).toBe('rgb(245, 240, 230)');
  expect(contract.color).toBe('rgb(45, 42, 38)');
  expect(contract.fontFamily).toContain('Garamond');
  expect(contract.proseMaxWidth).not.toBe('none');
  expect(contract.heroColumns).toBe((page.viewportSize()?.width ?? 0) < 768 ? 1 : 2);
});

test('photography preserves the complete image set and order', async ({ page }) => {
  await page.goto('/photography');
  const galleryImages = page.locator('[data-contact-sheet] img');

  await expect(galleryImages).toHaveCount(49);
  await expect(galleryImages.first()).toHaveAttribute('src', '/images/photography-optimized/DSCF0261.webp');
  await expect(galleryImages.last()).toHaveAttribute('src', '/images/photography-optimized/library.webp');
});
