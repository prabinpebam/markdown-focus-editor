/**
 * Category L: Cross-Feature Interactions — TF-52 through TF-60
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-52: Heading + Inline Style ──
evalTest('TF-52', 'Heading + Inline Style', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Title text here');
  await page.keyboard.type('# Title text here');
  await cap('after-heading');

  // Select "text" inside heading and bold it
  rec(2, 'shortcut', 'select "text" + Ctrl+B');
  await page.keyboard.press('Home');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Control+b');
  await cap('after-shortcut');
});

// ── TF-53: List + Inline Style ──
evalTest('TF-53', 'List + Inline Style', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item with **bold');
  await page.keyboard.type('- Item with **bold');
  await cap('after-type');

  rec(2, 'press', 'Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Nested');
  await page.keyboard.press('Tab');
  await cap('after-press');
});

// ── TF-54: Focus Mode + Block Transformations ──
evalTest('TF-54', 'Focus Mode + Block Transforms', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  // Ensure focus mode is on
  await cap('initial');

  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await wait(150);
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', '- list item');
  await page.keyboard.type('- list item');
  await wait(150);
  await cap('after-type');

  rec(4, 'press', 'Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.type('nested');
  await page.keyboard.press('Tab');
  await wait(150);
  await cap('after-press');
});

// ── TF-55: Undo + Focus Mode ──
evalTest('TF-55', 'Undo + Focus Mode', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await wait(150);
  await cap('after-heading');

  rec(2, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(200);
  await cap('after-shortcut');
});

// ── TF-56: Paste + Undo ──
evalTest('TF-56', 'Paste + Undo', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Original');
  await page.keyboard.type('Original');
  await cap('after-type');

  rec(2, 'paste', 'Pasted content');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', ' pasted content here');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');

  rec(3, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(200);
  await cap('after-shortcut');
});

// ── TF-57: Theme + Focus Mode ──
evalTest('TF-57', 'Theme + Focus Mode', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Focus content');
  await page.keyboard.type('Focus content');
  await cap('initial');

  // Toggle theme while focus is ON
  await page.locator('#toolbar').click();
  await wait(400);
  rec(2, 'click', 'toggle theme');
  await page.locator('#toggle-theme').click();
  await wait(200);
  await cap('after-toggle');
});

// ── TF-58: Document Switch + Undo ──
evalTest('TF-58', 'Document Switch + Undo', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Content in doc A');
  await page.keyboard.type('Content in doc A');
  await page.keyboard.press('Control+s');
  await wait(300);
  await cap('after-type');

  // Create doc B
  page.once('dialog', async (d) => await d.accept('Doc B'));
  rec(2, 'shortcut', 'Ctrl+N');
  await page.keyboard.press('Control+n');
  await wait(500);
  rec(3, 'type', 'Content in doc B');
  await page.keyboard.type('Content in doc B');
  await cap('after-new-doc');

  // Ctrl+Z should not cross doc boundary
  rec(4, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(200);
  await cap('after-shortcut');
});

// ── TF-59: Save + Storage Full ──
evalTest('TF-59', 'Save + Storage Full', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  await cap('initial');

  // Fill localStorage near capacity (simplified: write a large string)
  rec(1, 'fill', 'localStorage near limit');
  await page.evaluate(() => {
    try {
      // Write ~4MB of data to get close to the 5MB limit
      var bigStr = 'x'.repeat(500 * 1024); // 500KB
      for (var i = 0; i < 8; i++) {
        localStorage.setItem('filler_' + i, bigStr);
      }
    } catch(e) { /* expected quota error */ }
  });
  await cap('after-fill');

  rec(2, 'type', 'Content near limit');
  await page.keyboard.type('Content near limit');
  rec(3, 'shortcut', 'Ctrl+S');
  await page.keyboard.press('Control+s');
  await wait(500);
  await cap('after-save');

  // Clean up filler
  await page.evaluate(() => {
    for (var i = 0; i < 8; i++) localStorage.removeItem('filler_' + i);
  });
});

// ── TF-60: Rapid Editing Sequences ──
evalTest('TF-60', 'Rapid Editing Sequences', 'L. Cross-Feature', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');

  rec(3, 'type', '- list item');
  await page.keyboard.type('- list item');
  await cap('after-type');

  rec(4, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // Exit list

  rec(5, 'type', '**bold text');
  await page.keyboard.type('**bold text');
  await cap('after-type');

  rec(6, 'press', 'Enter');
  await page.keyboard.press('Enter');

  rec(7, 'type', 'Normal paragraph');
  await page.keyboard.type('Normal paragraph');
  await cap('after-type');
});
