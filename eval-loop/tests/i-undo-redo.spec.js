/**
 * Category I: Undo & Redo — TF-43 through TF-46
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-43: Undo Basic Edits ──
evalTest('TF-43', 'Undo Basic Edits', 'I. Undo & Redo', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Hello');
  await page.keyboard.type('Hello');
  await cap('after-type');

  rec(2, 'type', ' World');
  await page.keyboard.type(' World');
  await cap('after-type');

  rec(3, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(100);
  await cap('after-shortcut');

  rec(4, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(100);
  await cap('after-shortcut');

  // At initial — should be no-op
  rec(5, 'shortcut', 'Ctrl+Z (at initial)');
  await page.keyboard.press('Control+z');
  await wait(100);
  await cap('after-shortcut');
});

// ── TF-44: Undo Block Transformations ──
evalTest('TF-44', 'Undo Block Transformations', 'I. Undo & Redo', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Heading');
  await page.keyboard.type('# Heading');
  await cap('after-type');

  rec(2, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(200);
  await cap('after-shortcut');

  // Re-do then undo a list
  rec(3, 'shortcut', 'Ctrl+Y');
  await page.keyboard.press('Control+y');
  await wait(100);
  await page.keyboard.press('Enter');
  rec(4, 'type', '- list item');
  await page.keyboard.type('- list item');
  await cap('after-type');

  rec(5, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(200);
  await cap('after-shortcut');
});

// ── TF-45: Redo ──
evalTest('TF-45', 'Redo', 'I. Undo & Redo', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Content');
  await page.keyboard.type('Content');
  await cap('after-type');

  rec(2, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(100);
  await cap('after-shortcut');

  rec(3, 'shortcut', 'Ctrl+Y');
  await page.keyboard.press('Control+y');
  await wait(100);
  await cap('after-shortcut');

  // Alt redo shortcut
  rec(4, 'shortcut', 'Ctrl+Z then Ctrl+Shift+Z');
  await page.keyboard.press('Control+z');
  await wait(100);
  await page.keyboard.press('Control+Shift+z');
  await wait(100);
  await cap('after-shortcut');
});

// ── TF-46: Undo/Redo Stack Management ──
evalTest('TF-46', 'Undo/Redo Stack Management', 'I. Undo & Redo', async ({ page, cap, rec }) => {
  // Type 5 things
  for (let i = 1; i <= 5; i++) {
    rec(i, 'type', `Word${i} `);
    await page.keyboard.type(`Word${i} `);
    await wait(100);
  }
  await cap('after-typing');

  // Undo 3 times
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Control+z');
    await wait(100);
  }
  await cap('after-undo-3');

  // Type new content — should discard redo
  rec(6, 'type', 'NewContent');
  await page.keyboard.type('NewContent');
  await cap('after-new-type');

  // Ctrl+Y should be no-op
  rec(7, 'shortcut', 'Ctrl+Y (should be no-op)');
  await page.keyboard.press('Control+y');
  await wait(100);
  await cap('after-shortcut');
});
