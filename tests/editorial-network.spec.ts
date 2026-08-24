import { expect, test } from './fixtures/site-test';

const trails = [
  {
    id: 'rules-and-judgment',
    question: 'What should become a rule—and what should remain judgment?',
    objects: [
      'essay:what-rules-cant-capture',
      'note:teaching-ai-to-think-like-you',
      'note:where-you-want-variance',
      'annotation:rules',
      'annotation:seeing-like-a-state',
    ],
  },
  {
    id: 'direction-and-commitment',
    question: 'How do organizations choose—and hold—a direction when metrics cannot settle it?',
    objects: [
      'essay:the-right-direction',
      'annotation:sovereignty-of-good',
      'essay:strategic-time',
      'essay:architecture-of-commitment',
      'annotation:finite-and-infinite-games',
      'note:from-org-theory-to-ai',
    ],
  },
  {
    id: 'delegable-cognition',
    question: 'When cognition becomes delegable, what still requires a person?',
    objects: [
      'note:the-dot-collector',
      'essay:what-rules-cant-capture',
      'annotation:the-matter-with-things',
      'annotation:the-embodied-mind',
      'static:third-enlightenment',
    ],
  },
] as const;

test('Writing presents the three exact inquiry trails in reviewed order', async ({ page }) => {
  await page.goto('/writing');

  const renderedTrails = page.locator('[data-inquiry-trail]');
  await expect(renderedTrails).toHaveCount(3);
  expect(await renderedTrails.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-inquiry-trail'))))
    .toEqual(trails.map(({ id }) => id));

  for (const trail of trails) {
    const rendered = page.locator(`[data-inquiry-trail="${trail.id}"]`);
    await expect(rendered.getByRole('heading', { name: trail.question })).toBeVisible();
    expect(await rendered.locator('[data-trail-object]').evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('data-trail-object')),
    )).toEqual([...trail.objects]);
    await expect(rendered.locator('[data-editorial-form]').first()).toBeVisible();
  }

  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport + 1);
});

test('Writing exposes four Essays and five current Notes without the retired Note', async ({ page }) => {
  await page.goto('/writing');

  await expect(page.locator('[data-writing-essay]')).toHaveCount(4);
  await expect(page.locator('[data-writing-note]')).toHaveCount(5);
  await expect(page.locator('[data-writing-note="the-third-enlightenment"]')).toHaveCount(0);
  await expect(page.locator('a[href="/blog/the-third-enlightenment"]')).toHaveCount(0);
});

const detailContracts = [
  {
    path: '/essays/architecture-of-commitment',
    form: 'Essay',
    context: 'As measurement improves, execution becomes tractable.',
    relation: 'essay:the-right-direction',
  },
  {
    path: '/blog/the-dot-collector',
    form: 'Note',
    context: 'On recognizing a pattern in a model response, and the limits of calling that exchange a cognitive partnership.',
    relation: 'note:why-you-need-multiple-minds',
  },
  {
    path: '/library/seeing-like-a-state',
    form: 'Reading annotation',
    context: 'Scott asks what a clean administrative map erases: local knowledge, informal coordination, and adaptation.',
    relation: 'essay:what-rules-cant-capture',
  },
] as const;

for (const contract of detailContracts) {
  test(`${contract.path} exposes its form, context, and next path`, async ({ page }) => {
    await page.goto(contract.path);

    await expect(page.locator('main [data-editorial-form]').first()).toHaveText(contract.form);
    await expect(page.locator('main')).toContainText(contract.context);
    const related = page.locator(`[data-related-path="${contract.relation}"]`);
    await expect(related).toBeVisible();
    await expect(related.locator('[data-editorial-form]')).toBeVisible();
    await expect(page.locator('[data-related-path="static:research"]')).toHaveCount(0);
  });
}

test('Library filtering is exact-token, keyboard-operable, announced, and order-preserving', async ({ page }) => {
  await page.goto('/library');

  const cards = page.locator('[data-library-slug]');
  const initialOrder = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-library-slug')));
  expect(initialOrder).toHaveLength(38);
  await expect(page.getByRole('status')).toHaveText('38 reading annotations');

  const allButton = page.getByRole('button', { name: 'All', exact: true });
  const healthButton = page.getByRole('button', { name: 'Health', exact: true });
  await expect(allButton).toHaveAttribute('aria-pressed', 'true');
  await expect(healthButton).toHaveAttribute('aria-controls', 'book-list');

  await healthButton.focus();
  await page.keyboard.press('Enter');
  await expect(healthButton).toHaveAttribute('aria-pressed', 'true');
  await expect(allButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('status')).toHaveText('1 reading annotation');
  const visibleCards = page.locator('[data-library-slug]:visible');
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.first()).toHaveAttribute('data-tags', /(?:^|,)Health(?:,|$)/);

  await allButton.click();
  await expect(page.getByRole('status')).toHaveText('38 reading annotations');
  await expect(visibleCards).toHaveCount(38);
  await expect.poll(() => cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-library-slug'))))
    .toEqual(initialOrder);
});
