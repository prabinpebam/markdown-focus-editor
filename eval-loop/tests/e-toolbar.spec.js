/**
 * Category E: Toolbar & App Controls — TF-25 through TF-27
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-25: Toolbar Activation ──
evalTest('TF-25', 'Toolbar Activation', 'E. Toolbar & Controls', async ({ page, cap, rec }) => {
  await cap('initial');

  // Click toolbar to expand
  rec(1, 'click', 'toolbar dot');
  await page.locator('#toolbar').click();
  await wait(400);
  await cap('after-click');

  // Click outside to collapse
  rec(2, 'click', 'outside toolbar');
  await page.locator('#editor').click();
  await wait(400);
  await cap('after-click');
});

// ── TF-26: Font Size Controls ──
evalTest('TF-26', 'Font Size Controls', 'E. Toolbar & Controls', async ({ page, cap, rec }) => {
  // Expand toolbar first
  await page.locator('#toolbar').click();
  await wait(400);
  await cap('initial');

  rec(1, 'click', 'increase font');
  await page.locator('#increase-font').click({ force: true });
  await wait(100);
  await cap('after-click');

  rec(2, 'click', 'increase font again');
  await page.locator('#increase-font').click({ force: true });
  await wait(100);
  await cap('after-click');

  rec(3, 'click', 'decrease font');
  await page.locator('#decrease-font').click({ force: true });
  await wait(100);
  await cap('after-click');
});

// ── TF-27: Fullscreen Toggle ──
evalTest('TF-27', 'Fullscreen Toggle', 'E. Toolbar & Controls', async ({ page, cap, rec }) => {
  await page.locator('#toolbar').click();
  await wait(400);
  await cap('initial');

  rec(1, 'click', 'fullscreen');
  await page.locator('#fullscreen').click({ force: true });
  await wait(500);
  await cap('after-click');

  rec(2, 'press', 'Escape');
  await page.keyboard.press('Escape');
  await wait(500);
  await cap('after-press');
});
