import { expect, test } from './fixtures/site-test';

const heroCopy = 'I study how organizations decide what deserves attention and which direction is worth pursuing when measurement cannot settle either question.';
const backgroundCopy = 'The question grew out of fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge funds. I now follow it through organizational research, writing, yoga, coaching, and photography.';
const researchLede = 'My research begins where measurement stops being enough. Data can show whether a method worked; it cannot decide what an organization should value or which direction deserves commitment.';
const theoryContext = 'A working theory about keeping premises revisable while holding a direction long enough to act.';
const theoryEvidence = 'In my use, a system can retrieve a forgotten note quickly. Whether that note deserves another month of work remains my decision. That division is where the working theory begins.';
const organizationalWork = 'A system can preserve more context and still make an old premise easier to continue. The question is not only what the system can do. It is who may challenge the objective once the outputs begin to look like answers.';

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
  for (const [index, href] of ['/research#investing-lens', '/yoga', '/coaching', '/photography'].entries()) {
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
    'How does an organization choose a direction when evidence cannot rank the alternatives?',
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

  const investingSection = page.locator('#investing-lens');
  await expect(investingSection.getByRole('heading', { name: 'An investing lens' })).toBeVisible();

  const organizationalSection = page.locator('#organizational-work');
  await expect(organizationalSection).toContainText(organizationalWork);
  await expect(organizationalSection.locator('[data-organizational-question]')).toHaveCount(0);
  await expect(organizationalSection).toContainText('The difficult question must sit upstream of automation. If the objective is already settled and the remaining work is implementation, this is a different problem.');
  await expect(organizationalSection.getByRole('link')).toHaveCount(0);
});

test('About, Research, and Third Enlightenment keep distinct public jobs', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('main')).toContainText('I came to this research through fifteen years in advisory and investing as an entrepreneur and institutional investor across private equity, venture capital, and hedge funds.');
  await expect(page.locator('main')).toContainText('I studied management at Wharton and computer science through M&T. I have practiced yoga for over a decade.');
  await expect(page.locator('main')).toContainText('The question changes with the setting. My years in investing shape the organizational side; coaching stays with one person facing a decision. Yoga makes attention bodily, photography begins with what catches my eye, and writing is where I make the resulting claims public enough to test.');
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
  await expect(main).toContainText('Awareness keeps a premise open to revision. Agency holds a direction long enough to act. The problem begins when revision prevents commitment, or commitment turns contrary evidence into noise.');
  await expect(main).toContainText('What evidence should make me reopen the objective after the system has made it easier to continue?');
  expect((await main.textContent())?.match(/\?/g) ?? []).toHaveLength(1);
});

test('Principles and Writing state their public jobs directly', async ({ page }) => {
  await page.goto('/principles');
  await expect(page.locator('main')).toContainText('“Principles” makes these sound more settled than they are. I return to them when a decision feels confused and I need to locate the source of the confusion.');
  await expect(page.locator('main')).toContainText('The trouble begins when the proxy inherits the authority of the value it was built to serve.');

  await page.goto('/writing');
  await expect(page.locator('main')).toContainText('Essays carry the arguments at length. Notes stay closer to systems I am building and questions I have not settled.');
});
