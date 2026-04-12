/**
 * Category J: Theme & Appearance — TF-47 through TF-49
 * Category K: Settings & Page Load — TF-50, TF-51
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-47: Theme Toggle ──
evalTest('TF-47', 'Theme Toggle', 'J. Theme & Appearance', async ({ page, cap, rec }) => {
  await cap('initial');

  // Expand toolbar to access theme button
  await page.locator('#toolbar').click();
  await wait(400);

  rec(1, 'click', 'toggle theme → dark');
  await page.locator('#toggle-theme').click({ force: true });
  await wait(200);
  await cap('after-toggle');

  rec(2, 'click', 'toggle theme → light');
  await page.locator('#toggle-theme').click({ force: true });
  await wait(200);
  await cap('after-toggle');
});

// ── TF-48: Theme Persistence ──
evalTest('TF-48', 'Theme Persistence', 'J. Theme & Appearance', async ({ page, cap, rec }) => {
  // Set dark theme
  await page.locator('#toolbar').click();
  await wait(400);
  rec(1, 'click', 'set dark');
  await page.locator('#toggle-theme').click({ force: true });
  await wait(200);
  await cap('after-toggle');

  // Reload
  rec(2, 'reload', 'page');
  await page.reload();
  await page.waitForSelector('#editor', { timeout: 10_000 });
  await wait(500);
  await cap('after-reload');
});

// ── TF-49: Font Size Persistence ──
evalTest('TF-49', 'Font Size Persistence', 'J. Theme & Appearance', async ({ page, cap, rec }) => {
  await page.locator('#toolbar').click();
  await wait(400);

  rec(1, 'click', 'increase font × 4');
  for (let i = 0; i < 4; i++) {
    await page.locator('#increase-font').click({ force: true });
    await wait(50);
  }
  await cap('after-increase');

  rec(2, 'reload', 'page');
  await page.reload();
  await page.waitForSelector('#editor', { timeout: 10_000 });
  await wait(500);
  await cap('after-reload');
});

// ── TF-50: First-Time Load ──
evalTest('TF-50', 'First-Time Load', 'K. Settings & Page Load', async ({ page, cap, rec }) => {
  // Clear localStorage to simulate first visit
  rec(1, 'clear', 'localStorage');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#editor', { timeout: 10_000 });
  await wait(500);
  await cap('after-first-load');
});

// ── TF-51: Return Visit ──
evalTest('TF-51', 'Return Visit', 'K. Settings & Page Load', async ({ page, cap, rec }) => {
  // Set up some state
  rec(1, 'type', 'Persisted content');
  await page.keyboard.type('Persisted content');
  await page.keyboard.press('Control+s');
  await wait(500);
  await cap('before-reload');

  rec(2, 'reload', 'page');
  await page.reload();
  await page.waitForSelector('#editor', { timeout: 10_000 });
  await wait(500);
  await cap('after-reload');
});
