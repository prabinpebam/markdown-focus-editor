/**
 * Category C: Inline Styling — TF-12 through TF-19
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-12: Bold via Markdown Syntax ──
evalTest('TF-12', 'Bold via Markdown Syntax', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Normal text ');
  await page.keyboard.type('Normal text ');
  await cap('after-type');

  rec(2, 'type', '**h');
  await page.keyboard.type('**h');
  await cap('after-type');

  rec(3, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('after-type');

  // Move past ZWSP and type unstyled
  rec(4, 'press', 'ArrowRight');
  await page.keyboard.press('ArrowRight');
  rec(5, 'type', ' unstyled');
  await page.keyboard.type(' unstyled');
  await cap('after-type');
});

// ── TF-13: Italic via Markdown Syntax ──
evalTest('TF-13', 'Italic via Markdown Syntax', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Some *h');
  await page.keyboard.type('Some *h');
  await cap('after-type');

  rec(2, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('after-type');

  rec(3, 'type', ' more');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' more');
  await cap('after-type');
});

// ── TF-14: Bold-Italic via Markdown Syntax ──
evalTest('TF-14', 'Bold-Italic via Markdown Syntax', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', '***h');
  await page.keyboard.type('***h');
  await cap('after-type');

  rec(2, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('after-type');
});

// ── TF-15: Strikethrough via Markdown Syntax ──
evalTest('TF-15', 'Strikethrough via Markdown Syntax', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', '~~h');
  await page.keyboard.type('~~h');
  await cap('after-type');

  rec(2, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('after-type');
});

// ── TF-16: Bold via Ctrl+B ──
evalTest('TF-16', 'Bold via Ctrl+B', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Select this text');
  await page.keyboard.type('Select this text');
  await cap('after-type');

  // Select "this"
  rec(2, 'shortcut', 'select "this"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
  await cap('pre-action');

  rec(3, 'shortcut', 'Ctrl+B');
  await page.keyboard.press('Control+b');
  await cap('after-shortcut');

  // Ctrl+B with no selection
  rec(4, 'press', 'End');
  await page.keyboard.press('End');
  rec(5, 'shortcut', 'Ctrl+B (no selection)');
  await page.keyboard.press('Control+b');
  await cap('after-shortcut');

  rec(6, 'type', 'bolded');
  await page.keyboard.type('bolded');
  await cap('after-type');
});

// ── TF-17: Italic via Ctrl+I ──
evalTest('TF-17', 'Italic via Ctrl+I', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Select this text');
  await page.keyboard.type('Select this text');

  rec(2, 'shortcut', 'select "this"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');

  rec(3, 'shortcut', 'Ctrl+I');
  await page.keyboard.press('Control+i');
  await cap('after-shortcut');
});

// ── TF-18: Strikethrough via Ctrl+Shift+S ──
evalTest('TF-18', 'Strikethrough via Ctrl+Shift+S', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Select this text');
  await page.keyboard.type('Select this text');

  rec(2, 'shortcut', 'select "this"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');

  rec(3, 'shortcut', 'Ctrl+Shift+S');
  await page.keyboard.press('Control+Shift+s');
  await cap('after-shortcut');
});

// ── TF-19: Inline Style Break-Out ──
evalTest('TF-19', 'Inline Style Break-Out', 'C. Inline Styling', async ({ page, cap, rec }) => {
  rec(1, 'type', '**hello');
  await page.keyboard.type('**hello');
  await cap('after-type');

  // Type ** again to break out, then new char
  rec(2, 'type', '**w');
  await page.keyboard.type('**w');
  await cap('after-type');

  rec(3, 'type', 'orld');
  await page.keyboard.type('orld');
  await cap('after-type');
});
