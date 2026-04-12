/**
 * Formatting Interactions: LIST lifecycle (UL + OL)
 * Covers: C-UL1..C-UL10, E-UL1..E-UL21, D-UL1..D-UL8, X-UL1..X-UL7
 *         C-OL1..C-OL6, E-OL1..E-OL5
 */
const { evalTest, wait } = require('./test-setup');

// ── C-UL1..C-UL3: UL creation with -, *, + ──
evalTest('FI-L-01', 'UL creation all markers (- * +)', 'Formatting: Lists', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'type', '- Dash item');
  await page.keyboard.type('- Dash item');
  await cap('after-dash');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // exit list

  rec(2, 'type', '* Star item');
  await page.keyboard.type('* Star item');
  await cap('after-star');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  rec(3, 'type', '+ Plus item');
  await page.keyboard.type('+ Plus item');
  await cap('after-plus');
});

// ── C-UL4: UL with existing text ──
evalTest('FI-L-02', 'UL creation with existing text', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', 'buy milk');
  await page.keyboard.type('buy milk');
  await cap('before');

  rec(2, 'press', 'Home, type "- "');
  await page.keyboard.press('Home');
  await page.keyboard.type('- ');
  await cap('after-list');
});

// ── C-UL5 + C-UL6: Dash not at start / no space ──
evalTest('FI-L-03', 'No UL trigger: mid-text and no-space', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', 'hello - world (mid-text dash)');
  await page.keyboard.type('hello - world');
  await cap('mid-text');

  await page.keyboard.press('Enter');

  rec(2, 'type', '-nospace');
  await page.keyboard.type('-nospace');
  await cap('no-space');
});

// ── E-UL9..E-UL13: Tab indentation scenarios ──
evalTest('FI-L-04', 'List Tab indentation all scenarios', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Setup 3-item list');
  await page.keyboard.type('- Item one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Item two');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Item three');
  await cap('three-items');

  // Tab on third item (has prev sibling)
  rec(2, 'press', 'Tab on item 3');
  await page.keyboard.press('Tab');
  await cap('after-tab-3');

  // Tab again for deeper nesting
  rec(3, 'press', 'Tab again (deeper)');
  await page.keyboard.press('Tab');
  await cap('after-tab-deep');

  // Tab on first item (no prev sibling) — should do nothing
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  rec(4, 'press', 'Tab on first item');
  await page.keyboard.press('Tab');
  await cap('after-tab-first');
});

// ── E-UL14..E-UL19: Shift+Tab outdentation scenarios ──
evalTest('FI-L-05', 'List Shift+Tab outdentation all scenarios', 'Formatting: Lists', async ({ page, cap, rec }) => {
  // Create nested list
  rec(1, 'type', 'Setup nested list');
  await page.keyboard.type('- Parent');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Child');
  await page.keyboard.press('Tab');
  await cap('nested-setup');

  // Shift+Tab to outdent
  rec(2, 'press', 'Shift+Tab nested item');
  await page.keyboard.press('Shift+Tab');
  await cap('after-outdent');

  // Create single-item list and outdent to div
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', '- Only item');
  await page.keyboard.type('- Only item');
  await cap('single-item-list');

  rec(4, 'press', 'Shift+Tab (only item → div)');
  await page.keyboard.press('Shift+Tab');
  await cap('after-outdent-to-div');
});

// ── E-UL20..E-UL21: Deep nesting round-trip ──
evalTest('FI-L-06', 'List Tab/ShiftTab round-trip', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item');
  await page.keyboard.type('- Item');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Nested');
  await cap('setup');

  rec(2, 'press', 'Tab × 3');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await cap('deep-nested');

  rec(3, 'press', 'Shift+Tab × 3');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await cap('back-to-top');
});

// ── D-UL1..D-UL3: Deletion in lists ──
evalTest('FI-L-07', 'List deletion scenarios', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Setup list');
  await page.keyboard.type('- Alpha');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Beta');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Gamma');
  await cap('three-items');

  // Backspace at start of middle item
  rec(2, 'press', 'Home + Backspace on "Beta"');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await cap('after-merge');

  // Delete all content in item, then backspace
  rec(3, 'press', 'Select all in item + Delete + Backspace');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.press('Delete');
  await page.keyboard.press('Backspace');
  await cap('after-empty-delete');
});

// ── C-OL1..C-OL3: Ordered list creation ──
evalTest('FI-L-08', 'OL creation', 'Formatting: Lists', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'type', '1. First');
  await page.keyboard.type('1. First');
  await cap('after-ol');

  await page.keyboard.press('Enter');
  rec(2, 'type', 'Second (auto-numbered)');
  await page.keyboard.type('Second');
  await cap('after-second');

  // Exit and try no-space
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', '1.NoSpace (should NOT trigger)');
  await page.keyboard.type('1.NoSpace');
  await cap('no-space');

  // Multi-digit
  await page.keyboard.press('Enter');
  rec(4, 'type', '42. Multi-digit');
  await page.keyboard.type('42. Multi-digit');
  await cap('multi-digit');
});

// ── E-UL5 + E-UL6: Bold inside list item ──
evalTest('FI-L-09', 'Bold inside list item', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item with ');
  await page.keyboard.type('- Item with ');
  rec(2, 'type', '**bold');
  await page.keyboard.type('**bold');
  await cap('bold-in-li');

  // Tab to indent (bold should survive)
  await page.keyboard.press('Enter');
  await page.keyboard.type('Nested with ');
  await page.keyboard.type('*italic');
  rec(3, 'press', 'Tab');
  await page.keyboard.press('Tab');
  await cap('styled-nested');
});

// ── E-UL7: Selection across list items ──
evalTest('FI-L-10', 'Cross-item selection and delete', 'Formatting: Lists', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Setup list');
  await page.keyboard.type('- First item text');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second item text');
  await cap('two-items');

  // Select across both items
  rec(2, 'select', 'Cross-item selection');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 20; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Delete');
  await cap('after-cross-delete');
});
