import { defineConfig, devices } from '@playwright/test';
import {
  resolvePlaywrightTarget,
  traceModeForTarget,
} from './scripts/lib/playwright-target.mjs';

const target = resolvePlaywrightTarget();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: target.baseURL,
    screenshot: 'off',
    trace: traceModeForTarget(target),
    video: 'off',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 720 } },
    },
    {
      name: 'contact-webkit',
      testMatch: /contact-form\.spec\.ts/,
      grep: /@native-contact/,
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: target.webServer,
});
