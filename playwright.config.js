// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './eval-loop/tests',
  outputDir: './test-results/editor-eval',
  timeout: 120_000,
  retries: 0,
  workers: 1, // Sequential — each test uses shared localStorage
  reporter: [['list'], ['json', { outputFile: './test-results/eval-summary.json' }]],
  use: {
    baseURL: `file:///${path.resolve(__dirname, 'index.html').replace(/\\/g, '/')}`,
    screenshot: 'only-on-failure',
    trace: 'off',
    headless: false, // Always show the real browser so captures are valid
    launchOptions: {
      slowMo: 50, // Slight slowdown so visual state is observable
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
