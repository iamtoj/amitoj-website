import { expect, test } from './fixtures/site-test';

const practicePaths = [
  {
    label: 'Organizations',
    title: 'Investing',
    description: 'An investing lens shaped over fifteen years across private equity, venture capital, and hedge funds.',
    href: '/research#investing-lens',
  },
  {
    label: 'Body',
    title: 'Yoga',
    description: 'What effort, balance, and release make visible in the body.',
    href: '/yoga',
  },
  {
    label: 'Decisions',
    title: 'Coaching',
    description: 'What remains after fact and explanation have been separated.',
    href: '/coaching',
  },
  {
    label: 'Seeing',
    title: 'Photography',
    description: 'A contact sheet of what held my attention long enough to make a frame.',
    href: '/photography',
  },
] as const;

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 320, height: 720 },
] as const) {
  test(`Home preserves its first viewport and completes the four-path map at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const hero = page.locator('[data-home-hero]');
    await expect(hero.getByRole('link')).toHaveCount(2);
    await expect(hero.locator('a[href="/research"]')).toHaveText('Research');
    await expect(hero.locator('a[href="/writing"]')).toHaveText('Writing');
    await expect(hero.locator('a[href="/practices"], a[href="/coaching"], a[href="/photography"]')).toHaveCount(0);

    const map = page.locator('[data-practice-map]');
    const links = map.locator('[data-practice-path]');
    await expect(links).toHaveCount(4);
    for (const [index, contract] of practicePaths.entries()) {
      const link = links.nth(index);
      await expect(link).toHaveAttribute('href', contract.href);
      await expect(link).toContainText(contract.label);
      await expect(link).toContainText(contract.title);
      await expect(link).toContainText(contract.description);
      await expect(link).toHaveAccessibleName(new RegExp(`${contract.label}.*${contract.title}.*${contract.description}`));
    }

    await expect(page.locator('[data-photography-path]')).toHaveCount(0);

    const widths = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
  });
}

test('each Home practice path lands at its complete destination', async ({ page }) => {
  for (const contract of practicePaths) {
    await page.goto('/');
    await page.locator(`[data-practice-path][href="${contract.href}"]`).click();
    if (contract.href.includes('#')) {
      await expect(page).toHaveURL(/\/research#investing-lens$/);
      await expect(page.locator('#investing-lens').getByRole('heading', { name: 'An investing lens' })).toBeVisible();
    } else {
      await expect(page).toHaveURL(new RegExp(`${contract.href}$`));
      await expect(page.getByRole('heading', { level: 1, name: contract.title })).toBeVisible();
    }
  }
});

test('Practices is a quiet router to the four reviewed destinations', async ({ page }) => {
  await page.goto('/practices');
  await expect(page.getByRole('heading', { level: 1, name: 'Practices' })).toBeVisible();
  await expect(page.locator('main')).toContainText('I do not experience investing, yoga, coaching, and photography as separate interests.');

  const rows = page.locator('[data-practice-row]');
  await expect(rows).toHaveCount(4);
  await expect(rows.locator('a')).toHaveCount(4);
  for (const [index, href] of ['/research#investing-lens', '/yoga', '/coaching', '/photography'].entries()) {
    await expect(rows.locator('a').nth(index)).toHaveAttribute('href', href);
  }
  for (const contract of practicePaths) {
    const row = rows.filter({ has: page.locator(`a[href="${contract.href}"]`) });
    await expect(row).toContainText(contract.label);
    await expect(row).toContainText(contract.description);
  }
  await expect(page.locator('[data-seeing-practice]')).toHaveCount(0);
  await expect(page.locator('main a[href="/contact"]')).toHaveCount(0);
});

test('Yoga and Coaching state their practice, connection, and boundary without offers', async ({ page }) => {
  await page.goto('/yoga');
  const yoga = page.locator('main');
  const yogaHeading = yoga.getByRole('heading', { level: 1, name: 'Yoga' });
  const headingBox = await yogaHeading.boundingBox();
  expect(headingBox).not.toBeNull();
  expect(headingBox!.y + headingBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expect(yoga).toContainText('Body');
  await expect(yoga).toContainText('I began yoga as physical exercise. More than a decade later, it has become a way to notice how effort narrows attention and how release changes what becomes available.');
  await expect(yoga).toContainText('The test is physical before it is conceptual: effort changes breath, balance, and the width of attention.');
  await expect(yoga).toContainText('Yoga does not tell me what to do. It shows me when effort has displaced attention.');
  await expect(yoga.getByRole('heading', { name: 'Practice' })).toBeVisible();
  await expect(yoga.getByRole('heading', { name: 'A local connection' })).toBeVisible();
  await expect(yoga).not.toContainText('Offerings');
  await expect(yoga).not.toContainText('Begin');
  await expect(yoga.locator('a[href="/contact"]')).toHaveCount(0);

  await page.goto('/coaching');
  const coaching = page.locator('main');
  await expect(coaching).toContainText('Decisions');
  await expect(coaching).toContainText('What remains yours to decide after the explanation is stripped away?');
  await expect(coaching).toContainText('A difficult decision often arrives with its explanation already attached: the market changed, the team failed, the timing was wrong. I use coaching to slow that story down. What happened? Which part is inference? What choice remains? The decision still belongs to the person who must live with it.');
  await expect(coaching.getByRole('heading', { name: 'Method' })).toBeVisible();
  await expect(coaching.getByRole('heading', { name: 'Boundary' })).toBeVisible();
  await expect(coaching).toContainText('Coaching cannot outsource judgment.');
  await expect(coaching.locator('a[href^="/contact"]')).toHaveCount(0);
  await expect(coaching.locator('a[href="/about"]')).toHaveCount(0);
});

test('Photography renders the exact typed contact sheet and no sales surface', async ({ page }) => {
  await page.goto('/photography');
  const images = page.locator('[data-contact-sheet] figure img');
  await expect(images).toHaveCount(49);
  await expect(images.first()).toHaveAttribute('src', '/images/photography-optimized/DSCF0261.webp');
  await expect(images.first()).toHaveAttribute('loading', 'eager');
  await expect(images.first()).toHaveAttribute('fetchpriority', 'high');
  await expect(images.last()).toHaveAttribute('src', '/images/photography-optimized/library.webp');
  await expect(images.nth(1)).toHaveAttribute('loading', 'lazy');
  await expect(images.nth(1)).toHaveAttribute('fetchpriority', 'auto');
  await expect(page.locator('main')).not.toContainText('prints or collaboration');
  await expect(page.locator('main a[href="/contact"]')).toHaveCount(0);
});
