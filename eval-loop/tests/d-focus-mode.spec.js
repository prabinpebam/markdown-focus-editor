/**
 * Category D: Focus Mode — TF-20 through TF-24
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-20: Focus Mode Toggle ──
evalTest('TF-20', 'Focus Mode Toggle', 'D. Focus Mode', async ({ page, cap, rec }) => {
  await cap('initial');

  // Expand toolbar to reach focus toggle
  await page.locator('#toolbar').click();
  await wait(400);

  // Disable focus mode
  rec(1, 'toggle', 'focus OFF');
  await page.locator('#focus-toggle').click({ force: true });
  await wait(200);
  await cap('after-toggle');

  // Re-enable
  rec(2, 'toggle', 'focus ON');
  await page.locator('#focus-toggle').click({ force: true });
  await wait(200);
  await cap('after-toggle');
});

// ── TF-21: Focus Line Tracking — Cursor Movement ──
evalTest('TF-21', 'Focus Line Tracking — Cursor', 'D. Focus Mode', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Line one');
  await page.keyboard.type('Line one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Line two');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Line three');
  await cap('after-setup');

  // Click on line 1
  rec(2, 'click', 'line 1');
  const editor = page.locator('#editor');
  const firstBlock = editor.locator('> *').first();
  await firstBlock.click();
  await wait(100);
  await cap('after-click');

  // Click on line 3
  rec(3, 'click', 'line 3');
  const thirdBlock = editor.locator('> *').nth(2);
  await thirdBlock.click();
  await wait(100);
  await cap('after-click');

  // ArrowUp
  rec(4, 'press', 'ArrowUp');
  await page.keyboard.press('ArrowUp');
  await wait(100);
  await cap('after-press');

  // Home (horizontal — Y should NOT change)
  rec(5, 'press', 'Home');
  await page.keyboard.press('Home');
  await wait(100);
  await cap('after-press');
});

// ── TF-22: Focus Line Tracking — Content Changes ──
evalTest('TF-22', 'Focus Line Tracking — Content', 'D. Focus Mode', async ({ page, cap, rec }) => {
  // Type enough text to cause wrapping
  rec(1, 'type', 'long line');
  await page.keyboard.type('This is a very long line of text that should eventually wrap to the next visual line if the viewport is narrow enough for the editor to wrap it. ');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await wait(100);
  await cap('after-press');

  rec(3, 'type', 'New line after enter');
  await page.keyboard.type('New line after enter');
  await cap('after-type');
});

// ── TF-23: Focus Mode with Headings and Lists ──
evalTest('TF-23', 'Focus Mode + Headings/Lists', 'D. Focus Mode', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await page.keyboard.press('Enter');
  rec(2, 'type', '- list item');
  await page.keyboard.type('- list item');
  await cap('after-setup');

  // Click inside heading
  rec(3, 'click', 'heading');
  const heading = page.locator('#editor > h1').first();
  if (await heading.count() > 0) {
    await heading.click();
    await wait(100);
  }
  await cap('after-click');

  // Click inside list item
  rec(4, 'click', 'list item');
  const li = page.locator('#editor li').first();
  if (await li.count() > 0) {
    await li.click();
    await wait(100);
  }
  await cap('after-click');
});

// ── TF-24: Focus Mode with Window Resize ──
evalTest('TF-24', 'Focus Mode + Window Resize', 'D. Focus Mode', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Some content');
  await page.keyboard.type('Some content for resize test');
  await cap('initial');

  rec(2, 'resize', '800x400');
  await page.setViewportSize({ width: 800, height: 400 });
  await wait(300);
  await cap('after-resize');

  rec(3, 'resize', '1200x800');
  await page.setViewportSize({ width: 1200, height: 800 });
  await wait(300);
  await cap('after-resize');
});
