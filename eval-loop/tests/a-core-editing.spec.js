/**
 * Category A: Core Editing — TF-01, TF-02
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-01: Basic Typing & Cursor ──
evalTest('TF-01', 'Basic Typing & Cursor', 'A. Core Editing', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'type', 'Hello world');
  await page.keyboard.type('Hello world');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await cap('after-press');

  rec(3, 'type', 'Second paragraph');
  await page.keyboard.type('Second paragraph');
  await cap('after-type');

  rec(4, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await cap('after-press');

  rec(5, 'press', 'ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await cap('after-press');

  rec(6, 'press', 'Home');
  await page.keyboard.press('Home');
  await cap('after-press');

  rec(7, 'press', 'End');
  await page.keyboard.press('End');
  await cap('after-press');

  rec(8, 'shortcut', 'Ctrl+A');
  await page.keyboard.press('Control+a');
  await cap('after-shortcut');
});

// ── TF-02: Text Selection ──
evalTest('TF-02', 'Text Selection', 'A. Core Editing', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Hello world, this is a test');
  await page.keyboard.type('Hello world, this is a test');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second line of text');
  await cap('after-type');

  // Triple-click to select the first block
  rec(3, 'click', 'triple-click line 1');
  const editor = page.locator('#editor');
  const firstBlock = editor.locator('> *').first();
  await firstBlock.click({ clickCount: 3 });
  await cap('after-click');

  // Click to deselect
  rec(4, 'click', 'deselect');
  await editor.click();
  await cap('after-click');

  // Double-click a word
  rec(5, 'click', 'double-click word');
  await firstBlock.dblclick();
  await cap('after-click');

  // Delete selection
  rec(6, 'press', 'Delete');
  await page.keyboard.press('Delete');
  await cap('after-press');
});
