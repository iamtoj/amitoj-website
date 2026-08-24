import { expect, test } from './fixtures/site-test';

const heroCopy = 'I research how people and organizations notice what matters, choose direction, and preserve judgment as cognition becomes delegable. The work moves between organizational judgment and embodied attention.';
const backgroundCopy = 'Before this work, I spent fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge fund.';
const researchLede = 'My research examines how organizations allocate attention and find direction. It begins with questions that measurement alone cannot settle.';
const theoryContext = 'A provisional theory about holding awareness and agency together as more cognition becomes delegable.';
const theoryEvidence = 'In my use, a system can retrieve a forgotten note quickly. Whether that note deserves another month of work remains my decision. That division is where the working theory begins.';
const organizationalWork = 'A system can store more than any one person remembers and still preserve an old premise at greater speed. Whether that makes an organization less intelligent depends on how disagreement and revision are handled. The organizational question is where judgment lives—who may revise the objective, how disagreement survives synthesis, and what evidence is allowed to interrupt direction.';

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 320, height: 720 },
] as const) {
  test(`Home orients a first-time reader in its first ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const hero = page.locator('[data-home-hero]');
    await expect(hero).toContainText(heroCopy);
    await expect(hero).toContainText(backgroundCopy);
    await expect(hero.getByRole('link')).toHaveCount(2);
    await expect(hero.locator('a[href="/research"]')).toHaveText(/Research/);
    await expect(hero.locator('a[href="/writing"]')).toHaveText(/Writing/);

    const geometry = await hero.evaluate((element) => {
      const copy = element.querySelector('[data-home-hero-copy]');
      const image = element.querySelector('img');
      const heroBox = element.getBoundingClientRect();
      const copyBox = copy?.getBoundingClientRect();
      const imageBox = image?.getBoundingClientRect();
      return {
        bottom: heroBox.bottom,
        copyTop: copyBox?.top ?? 0,
        copyLeft: copyBox?.left ?? 0,
        imageTop: imageBox?.top ?? 0,
        imageLeft: imageBox?.left ?? 0,
      };
    });

    if (viewport.name === 'mobile') {
      expect(geometry.bottom).toBeLessThanOrEqual(720);
      expect(geometry.copyTop).toBeLessThan(geometry.imageTop);
    } else {
      expect(geometry.copyLeft).toBeLessThan(geometry.imageLeft);
    }
  });
}

test('Home routes public questions, working theory, and recent canonical Essays', async ({ page }) => {
  await page.goto('/');

  const questions = page.locator('[data-public-questions]');
  await expect(questions.getByRole('link', { name: /Research/ }).first()).toHaveAttribute('href', '/research');
  await expect(questions.getByRole('link', { name: /Organizational work/ })).toHaveAttribute('href', '/research#organizational-work');
  const practicePaths = page.locator('[data-practice-map] [data-practice-path]');
  await expect(practicePaths).toHaveCount(4);
  for (const [index, href] of ['/yoga', '/research', '/coaching', '/research#organizational-work'].entries()) {
    await expect(practicePaths.nth(index)).toHaveAttribute('href', href);
  }
  await expect(page.locator('[data-working-theory]')).toContainText(theoryEvidence);
  await expect(page.locator('[data-recent-essays] article')).toHaveCount(3);
});

test('Research is a question-and-artifact docket with an organizational threshold', async ({ page }) => {
  await page.goto('/research');

  await expect(page.getByRole('heading', { level: 1, name: 'Research' })).toBeVisible();
  await expect(page.locator('main')).toContainText(researchLede);
  for (const question of [
    'How can resources hide decay?',
    'How do organizations determine the right direction when the path is not clear?',
    'What happens before search, when declaring what matters shapes what becomes findable?',
  ]) {
    await expect(page.getByText(question, { exact: true })).toBeVisible();
  }

  const essays = page.locator('[data-research-essays] article');
  await expect(essays).toHaveCount(4);
  const notes = page.locator('[data-research-note]');
  await expect(notes).toHaveCount(3);
  for (const href of [
    '/blog/where-you-want-variance',
    '/blog/from-org-theory-to-ai',
    '/blog/the-dot-collector',
  ]) {
    await expect(page.locator(`[data-research-notes] a[href="${href}"]`)).toHaveCount(1);
  }
  await expect(page.locator('a[href="/managing-interns.pdf"]')).toHaveText(/Slides · 27 pages/);

  const organizationalSection = page.locator('#organizational-work');
  await expect(organizationalSection).toContainText(organizationalWork);
  await expect(organizationalSection.locator('[data-organizational-question]')).toHaveCount(0);
  await expect(organizationalSection).toContainText('The difficult question must sit upstream of automation. If the objective is already settled and the remaining work is implementation, this is a different problem.');
  await expect(organizationalSection.getByRole('link')).toHaveCount(0);
});

test('About, Research, and Third Enlightenment keep distinct public jobs', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('main')).toContainText('I came to these questions through fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge fund.');
  await expect(page.locator('main')).toContainText('My undergraduate work through Wharton and M&T combined management and computer science. I have practiced yoga for over a decade.');
  for (const href of ['/research', '/principles', '/third-enlightenment']) {
    await expect(page.locator(`main a[href="${href}"]`)).toHaveCount(1);
  }

  await page.goto('/third-enlightenment');
  const main = page.locator('main');
  await expect(main).toContainText('Working theory');
  await expect(main).toContainText(theoryContext);
  await expect(main).not.toContainText('The Three Modes');
  await expect(main).not.toContainText('The Formula');
  await expect(main.locator('blockquote')).toHaveCount(0);
  await expect(main).toContainText('Can we act with full commitment while holding our premises lightly?');
  expect((await main.textContent())?.match(/\?/g) ?? []).toHaveLength(1);
});
