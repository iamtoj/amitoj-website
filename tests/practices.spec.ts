import { expect, test } from './fixtures/site-test';

const practicePaths = [
  {
    label: 'Embodied attention',
    title: 'Yoga',
    description: 'Use effort and release to make attention visible through the body.',
    href: '/yoga',
  },
  {
    label: 'Organizational attention',
    title: 'Research',
    description: 'Study how organizations allocate attention and find direction.',
    href: '/research',
  },
  {
    label: 'Decision practice',
    title: 'Coaching',
    description: 'Separate what happened from the explanation already attached to it.',
    href: '/coaching',
  },
  {
    label: 'Judgment under delegation',
    title: 'Organizational work',
    description: 'Ask who may revise the objective and what evidence can interrupt it.',
    href: '/research#organizational-work',
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

    await expect(map.locator('a[href="/photography"]')).toHaveCount(0);
    const photography = page.locator('[data-photography-path]');
    await expect(photography).toContainText('A camera offers another way to practice attention.');
    await expect(photography.locator('a[href="/photography"]')).toHaveText(/View the contact sheet/);
    await expect(photography.locator('a[href="/practices"]')).toHaveText(/All practices/);

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
      await expect(page).toHaveURL(/\/research#organizational-work$/);
      await expect(page.locator('#organizational-work').getByRole('heading', { name: 'Organizational work' })).toBeVisible();
    } else {
      await expect(page).toHaveURL(new RegExp(`${contract.href}$`));
      await expect(page.getByRole('heading', { level: 1, name: contract.title })).toBeVisible();
    }
  }
});

test('Practices is a quiet router to the five reviewed destinations', async ({ page }) => {
  await page.goto('/practices');
  await expect(page.getByRole('heading', { level: 1, name: 'Practices' })).toBeVisible();
  await expect(page.locator('main')).toContainText('These practices share a question, not a method: what becomes visible when attention slows, and what must a person or organization still decide?');

  const rows = page.locator('[data-practice-row]');
  await expect(rows).toHaveCount(4);
  await expect(rows.locator('a')).toHaveCount(4);
  for (const [index, href] of ['/research', '/yoga', '/coaching', '/research#organizational-work'].entries()) {
    await expect(rows.locator('a').nth(index)).toHaveAttribute('href', href);
  }
  for (const contract of practicePaths) {
    const row = rows.filter({ has: page.locator(`a[href="${contract.href}"]`) });
    await expect(row).toContainText(contract.label);
    await expect(row).toContainText(contract.description);
  }
  await expect(page.locator('[data-seeing-practice] a[href="/photography"]')).toHaveCount(1);
  await expect(page.locator('main a[href="/contact"]')).toHaveCount(0);
});

test('Yoga and Coaching state their practice, connection, and boundary without offers', async ({ page }) => {
  await page.goto('/yoga');
  const yoga = page.locator('main');
  await expect(yoga).toContainText('Embodied attention');
  await expect(yoga).toContainText('Yoga is how I study the same questions I research — attention, effort, release — through the body instead of the literature.');
  await expect(yoga.getByRole('heading', { name: 'Practice' })).toBeVisible();
  await expect(yoga.getByRole('heading', { name: 'A local connection' })).toBeVisible();
  await expect(yoga).not.toContainText('Offerings');
  await expect(yoga).not.toContainText('Begin');
  await expect(yoga.locator('a[href="/contact"]')).toHaveCount(0);

  await page.goto('/coaching');
  const coaching = page.locator('main');
  await expect(coaching).toContainText('Decision practice');
  await expect(coaching).toContainText('What remains yours to decide after the explanation is stripped away?');
  await expect(coaching).toContainText('A difficult decision often arrives already explained: the market changed, the team failed, the timing was wrong. Coaching slows that explanation down. What happened? Which part is inference? What choice remains? The aim is not certainty. It is a decision someone can own, together with the evidence that should make them revise it.');
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
