import { expect, test } from './fixtures/site-test';

test('desktop navigation marks the matching public section', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });

  for (const [path, label] of [
    ['/about', 'About'],
    ['/research', 'Research'],
    ['/practices', 'Practices'],
    ['/writing', 'Writing'],
    ['/essays/strategic-time', 'Writing'],
    ['/blog/the-dot-collector', 'Writing'],
    ['/library', 'Library'],
    ['/library/seeing-like-a-state', 'Library'],
    ['/contact', 'Contact'],
  ] as const) {
    await page.goto(path);
    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  }
});

test('mobile disclosure closes and resets across every lifecycle boundary', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/writing');

  const trigger = page.locator('#mobile-menu-button');
  const panel = page.locator('#mobile-site-navigation');
  await expect(trigger).toHaveAccessibleName('Open site navigation');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toHaveAttribute('hidden', '');
  await expect(panel.getByRole('link', { name: 'About', exact: true })).toBeHidden();

  await trigger.focus();
  await trigger.click();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toHaveAccessibleName('Close site navigation');
  await expect(panel).not.toHaveAttribute('hidden', '');

  await panel.getByRole('link', { name: 'Library', exact: true }).focus();
  await trigger.focus();
  await page.setViewportSize({ width: 900, height: 720 });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'Writing', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(trigger).toBeFocused();
  await trigger.click();

  const modifiedLink = panel.getByRole('link', { name: 'Library', exact: true });
  await modifiedLink.focus();
  await page.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), { once: true });
  });
  await modifiedLink.dispatchEvent('click', { button: 0, ctrlKey: true });
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toBeVisible();
  await expect(modifiedLink).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toHaveAttribute('hidden', '');

  await trigger.click();
  await panel.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.waitForLoadState('domcontentloaded');
  const nextTrigger = page.locator('#mobile-menu-button');
  await expect(nextTrigger).toHaveAccessibleName('Open site navigation');
  await expect(nextTrigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mobile-site-navigation')).toHaveAttribute('hidden', '');

  await nextTrigger.click();
  const mobileAbout = page.getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'About', exact: true });
  await mobileAbout.focus();
  await page.setViewportSize({ width: 900, height: 720 });
  await expect(nextTrigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#mobile-site-navigation')).toHaveAttribute('hidden', '');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })
    .getByRole('link', { name: 'About', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(nextTrigger).toHaveAttribute('aria-expanded', 'false');
  await expect(nextTrigger).toBeFocused();

  await nextTrigger.click();
  await page.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate')));
  await expect(nextTrigger).toHaveAttribute('aria-expanded', 'false');

  await nextTrigger.click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));
  await expect(nextTrigger).toHaveAttribute('aria-expanded', 'false');
});

test('skip link is first, visible on focus, and moves focus to main', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('body > :first-child')).toHaveAttribute('href', '#main-content');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  const focusStyle = await skip.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: style.outlineWidth, style: style.outlineStyle };
  });
  expect(focusStyle.style).not.toBe('none');
  expect(focusStyle.width).not.toBe('0px');

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('the shared shell reflows at 320 CSS pixels, equivalent to 400% of 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });

  for (const path of [
    '/',
    '/research',
    '/practices',
    '/coaching',
    '/yoga',
    '/photography',
    '/third-enlightenment',
    '/writing',
    '/library',
    '/essays/strategic-time',
    '/contact',
    '/contact/thanks',
  ]) {
    await page.goto(path);
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(widths.document, `${path} must not require two-dimensional scrolling`).toBeLessThanOrEqual(widths.viewport + 1);
  }
});

test('reduced-motion preference suppresses decorative movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const motion = await page.locator('.arrow-link').first().evaluate((element) => {
    const style = getComputedStyle(element);
    const after = getComputedStyle(element, '::after');
    return {
      animation: style.animationName,
      transition: style.transitionDuration,
      afterTransition: after.transitionDuration,
    };
  });
  expect(motion.animation).toBe('none');
  expect(motion.transition).toBe('0s');
  expect(motion.afterTransition).toBe('0s');
});
