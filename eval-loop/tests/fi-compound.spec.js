/**
 * Formatting Interactions: COMPOUND operations + ZWSP lifecycle + CARET positions
 * Covers: CC-1..CC-10, Z-1..Z-9, CP-1..CP-13, S-1..S-9, U-1..U-10
 */
const { evalTest, wait } = require('./test-setup');

// ── CC-1: Heading → bold inside → Enter split ──
evalTest('FI-X-01', 'Heading+bold+Enter split', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Title with **bold');
  await page.keyboard.type('## Title with ');
  await page.keyboard.type('**bold');
  await cap('heading-with-bold');

  rec(2, 'press', 'Enter (split heading)');
  await page.keyboard.press('Enter');
  await cap('after-split');
});

// ── CC-2: List + indent + bold inside + outdent ──
evalTest('FI-X-02', 'List+indent+bold+outdent', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item');
  await page.keyboard.type('- Item');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Nested ');
  await page.keyboard.type('**bold');
  await page.keyboard.press('Tab');
  await cap('nested-with-bold');

  rec(2, 'press', 'Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await cap('after-outdent');
});

// ── CC-7: Rapid sequence: heading → list → bold ──
evalTest('FI-X-03', 'Rapid: heading+list+bold+normal', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await page.keyboard.press('Enter');

  rec(2, 'type', '- list item');
  await page.keyboard.type('- list item');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  rec(3, 'type', '**bold text');
  await page.keyboard.type('**bold text');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');

  rec(4, 'type', '*italic');
  await page.keyboard.type('*italic');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');

  rec(5, 'type', '~~strike');
  await page.keyboard.type('~~strike');
  await page.keyboard.press('ArrowRight');

  await page.keyboard.press('Enter');
  rec(6, 'type', 'Normal paragraph');
  await page.keyboard.type('Normal paragraph');
  await cap('all-formats');
});

// ── U-1..U-5: Undo across format types ──
evalTest('FI-X-04', 'Undo heading+list+bold sequence', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await cap('step1');

  await page.keyboard.press('Enter');
  rec(2, 'type', '- List item');
  await page.keyboard.type('- List item');
  await cap('step2');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', '**Bold');
  await page.keyboard.type('**Bold');
  await cap('step3');

  // Undo 3 times
  rec(4, 'shortcut', 'Ctrl+Z × 3');
  await page.keyboard.press('Control+z');
  await wait(100);
  await page.keyboard.press('Control+z');
  await wait(100);
  await page.keyboard.press('Control+z');
  await wait(100);
  await cap('after-3-undos');
});

// ── S-1: Select spanning plain text + bold ──
evalTest('FI-X-05', 'Selection across plain+bold boundary', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', 'plain **bold');
  await page.keyboard.type('plain ');
  await page.keyboard.type('**bold');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' more');
  await cap('setup');

  // Select from "pl" through "bo" (crossing into bold)
  rec(2, 'select', 'Cross-boundary selection');
  await page.keyboard.press('Home');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Delete');
  await cap('after-cross-delete');
});

// ── S-6: Ctrl+A then type heading syntax ──
evalTest('FI-X-06', 'Ctrl+A then type heading', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Existing content here');
  await page.keyboard.type('Existing content here');
  await cap('before');

  rec(2, 'shortcut', 'Ctrl+A');
  await page.keyboard.press('Control+a');

  rec(3, 'type', '# New heading');
  await page.keyboard.type('# New heading');
  await cap('after-replace');
});

// ── S-9: Ctrl+A then Delete (clear editor) ──
evalTest('FI-X-07', 'Ctrl+A then Delete (clear)', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Content to clear');
  await page.keyboard.type('# Heading');
  await page.keyboard.press('Enter');
  await page.keyboard.type('- List');
  await page.keyboard.press('Enter');
  await page.keyboard.type('**Bold');
  await cap('before-clear');

  rec(2, 'shortcut', 'Ctrl+A + Delete');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  await cap('after-clear');
});

// ── Z-7: ZWSP multiplication check ──
evalTest('FI-X-08', 'ZWSP count stability', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Create multiple styled elements');
  await page.keyboard.type('**bold');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');
  await page.keyboard.type('*italic');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');
  await page.keyboard.type('~~strike');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' normal');
  await cap('three-styles');

  // Edit around styled elements (shouldn't create extra ZWSPs)
  rec(2, 'press', 'Navigate and type around styles');
  await page.keyboard.press('Home');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.type('X');
  await page.keyboard.press('End');
  await page.keyboard.type('Y');
  await cap('after-edits');
});

// ── Mixed paste then undo ──
evalTest('FI-X-09', 'Paste formatted then undo', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Original');
  await page.keyboard.type('Original text');
  await cap('before');

  rec(2, 'paste', '**bold pasted**');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', ' **bold pasted**');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste');

  rec(3, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(200);
  await cap('after-undo');
});

// ── Theme toggle while editing styled text ──
evalTest('FI-X-10', 'Theme toggle during formatting', 'Formatting: Compound', async ({ page, cap, rec }) => {
  rec(1, 'type', '**bold text');
  await page.keyboard.type('**bold text');
  await cap('before-theme');

  // Toggle theme
  await page.locator('#toolbar').click();
  await wait(400);
  rec(2, 'click', 'toggle theme');
  await page.locator('#toggle-theme').click({ force: true });
  await wait(200);
  await cap('after-theme-toggle');
});
