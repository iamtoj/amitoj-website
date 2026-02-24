#!/usr/bin/env node
/**
 * Mobile Preview Script
 *
 * Takes screenshots of the website at mobile viewport sizes.
 *
 * Usage:
 *   npm run mobile-preview
 *
 * Requires: npm install -D playwright @playwright/test
 * Then: npx playwright install chromium
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '..', 'mobile-screenshots');

// Pages to screenshot
const pages = [
  '/',
  '/about',
  '/work',
  '/yoga',
  '/essays',
  '/photography',
  '/contact',
];

// Mobile viewport presets
const devices = [
  { name: 'iPhone-14', width: 390, height: 844 },
  { name: 'iPhone-SE', width: 375, height: 667 },
  { name: 'iPad-Mini', width: 768, height: 1024 },
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';

async function captureScreenshots() {
  await mkdir(screenshotsDir, { recursive: true });

  console.log(`\nCapturing mobile screenshots...`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output: ${screenshotsDir}\n`);

  const browser = await chromium.launch();

  for (const device of devices) {
    console.log(`\n${device.name} (${device.width}x${device.height}):`);

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: 2,
      isMobile: true,
    });

    const page = await context.newPage();

    for (const pagePath of pages) {
      const url = `${BASE_URL}${pagePath}`;
      const filename = `${device.name}${pagePath === '/' ? '-home' : pagePath.replace(/\//g, '-')}.png`;

      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.screenshot({
          path: join(screenshotsDir, filename),
          fullPage: true,
        });
        console.log(`  ${pagePath} -> ${filename}`);
      } catch (err) {
        console.log(`  ${pagePath} -> FAILED: ${err.message}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nDone. Screenshots saved to: ${screenshotsDir}\n`);
}

captureScreenshots().catch(console.error);
