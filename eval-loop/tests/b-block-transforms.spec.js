/**
 * Category B: Block Transformations — TF-03 through TF-11
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-03: Heading Creation (All Levels) ──
evalTest('TF-03', 'Heading Creation (All Levels)', 'B. Block Transformations', async ({ page, cap, rec }) => {
  await cap('initial');

  const levels = [
    { md: '# ', tag: 'h1', text: 'Heading One' },
    { md: '## ', tag: 'h2', text: 'Heading Two' },
    { md: '### ', tag: 'h3', text: 'Heading Three' },
    { md: '#### ', tag: 'h4', text: 'Heading Four' },
    { md: '##### ', tag: 'h5', text: 'Heading Five' },
    { md: '###### ', tag: 'h6', text: 'Heading Six' },
  ];

  for (let i = 0; i < levels.length; i++) {
    const l = levels[i];
    rec(i * 2 + 1, 'type', l.md + l.text);
    await page.keyboard.type(l.md + l.text);
    await cap('after-type');
    rec(i * 2 + 2, 'press', 'Enter');
    await page.keyboard.press('Enter');
    await cap('after-press');
  }

  // 7+ hashes should NOT create heading
  rec(13, 'type', '####### Not a heading');
  await page.keyboard.type('####### Not a heading');
  await cap('after-type');
});

// ── TF-04: Heading Reversion ──
evalTest('TF-04', 'Heading Reversion', 'B. Block Transformations', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Some heading text');
  await page.keyboard.type('# Some heading text');
  await cap('after-type');

  // Position cursor at start of heading text (after marker + ZWSP) and press Backspace
  rec(2, 'press', 'Home then Backspace');
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await cap('after-press');

  // Create another heading
  rec(3, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(4, 'type', '## Another heading');
  await page.keyboard.type('## Another heading');
  await cap('after-type');

  // Select all in heading, delete
  rec(5, 'shortcut', 'Ctrl+A then Delete');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.press('Delete');
  await cap('after-press');
});

// ── TF-05: Heading Content Editing ──
evalTest('TF-05', 'Heading Content Editing', 'B. Block Transformations', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Introduction');
  await page.keyboard.type('## Introduction');
  await cap('after-type');

  rec(2, 'type', ' to the guide');
  await page.keyboard.type(' to the guide');
  await cap('after-type');

  // Bold inside heading
  rec(3, 'type', ' **bold');
  await page.keyboard.type(' **bold');
  await cap('after-type');

  // Enter mid-heading: go to middle and press Enter
  rec(4, 'press', 'Home then ArrowRight×5 then Enter');
  await page.keyboard.press('Home');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await cap('after-press');
});

// ── TF-06: Unordered List Creation ──
evalTest('TF-06', 'Unordered List Creation', 'B. Block Transformations', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'type', '- First item');
  await page.keyboard.type('- First item');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await cap('after-press');

  rec(3, 'type', 'Second item');
  await page.keyboard.type('Second item');
  await cap('after-type');

  rec(4, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(5, 'type', 'Third item');
  await page.keyboard.type('Third item');
  await cap('after-type');
});

// ── TF-07: Ordered List Creation ──
evalTest('TF-07', 'Ordered List Creation', 'B. Block Transformations', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'type', '1. First ordered');
  await page.keyboard.type('1. First ordered');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', 'Second ordered');
  await page.keyboard.type('Second ordered');
  await cap('after-type');

  rec(4, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter'); // Exit list
  await cap('after-press');

  // No trailing space — must NOT transform
  rec(5, 'type', '1.NoSpace');
  await page.keyboard.type('1.NoSpace');
  await cap('after-type');
});

// ── TF-08: List Item Creation (Enter) ──
evalTest('TF-08', 'List Item Creation (Enter)', 'B. Block Transformations', async ({ page, cap, rec }) => {
  rec(1, 'type', '- First');
  await page.keyboard.type('- First');
  await cap('after-type');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', 'Second');
  await page.keyboard.type('Second');
  await cap('after-type');

  rec(4, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(5, 'type', 'Third');
  await page.keyboard.type('Third');
  await cap('after-type');

  // Empty li + Enter
  rec(6, 'press', 'Enter then Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await cap('after-press');
});

// ── TF-09: List Indentation (Tab) ──
evalTest('TF-09', 'List Indentation (Tab)', 'B. Block Transformations', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item one');
  await page.keyboard.type('- Item one');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Item two');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Item three');
  await cap('after-setup');

  // Tab on "Item three" (cursor is there)
  rec(2, 'press', 'Tab on Item three');
  await page.keyboard.press('Tab');
  await cap('after-press');

  // Tab again for deeper nesting
  rec(3, 'press', 'Tab again');
  await page.keyboard.press('Tab');
  await cap('after-press');
});

// ── TF-10: List Outdentation (Shift+Tab) ──
evalTest('TF-10', 'List Outdentation (Shift+Tab)', 'B. Block Transformations', async ({ page, cap, rec }) => {
  // Create nested list
  rec(1, 'type', '- Parent');
  await page.keyboard.type('- Parent');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Child');
  await page.keyboard.press('Tab'); // Indent
  await cap('after-indent');

  // Shift+Tab to outdent
  rec(2, 'press', 'Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await cap('after-press');

  // Create another list and Shift+Tab top-level only item
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  rec(3, 'type', '- Only item');
  await page.keyboard.type('- Only item');
  await cap('after-type');

  rec(4, 'press', 'Shift+Tab on only item');
  await page.keyboard.press('Shift+Tab');
  await cap('after-press');
});

// ── TF-11: List Deletion (Backspace) ──
evalTest('TF-11', 'List Deletion (Backspace)', 'B. Block Transformations', async ({ page, cap, rec }) => {
  rec(1, 'type', '- A');
  await page.keyboard.type('- A');
  await page.keyboard.press('Enter');
  await page.keyboard.type('B');
  await page.keyboard.press('Enter');
  await page.keyboard.type('C');
  await cap('after-setup');

  // Backspace at start of "C" merges with "B"
  rec(2, 'press', 'Home then Backspace');
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await cap('after-press');

  // Backspace at start of first li
  rec(3, 'press', 'Ctrl+Home then Backspace');
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('Backspace');
  await cap('after-press');
});
