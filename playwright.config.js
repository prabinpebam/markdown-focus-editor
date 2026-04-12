// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './eval-loop/tests',
  outputDir: './test-results/editor-eval',
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: './test-results/eval-summary.json' }]],
  webServer: {
    command: 'npx serve -l 3456 --no-clipboard',
    port: 3456,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3456',
    screenshot: 'only-on-failure',
    trace: 'off',
    headless: false,
    launchOptions: {
      slowMo: 50,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
