/**
 * Formatting Interactions: HEADING lifecycle
 * Covers: C-H1..C-H12, E-H1..E-H14, M-H1..M-H5, D-H1..D-H7, X-H1..X-H7
 */
const { evalTest, wait } = require('./test-setup');

// ── C-H1..C-H2: Heading creation all levels ──
evalTest('FI-H-01', 'Heading creation all levels', 'Formatting: Headings', async ({ page, cap, rec }) => {
  await cap('initial');
  const levels = ['# ', '## ', '### ', '#### ', '##### ', '###### '];
  for (let i = 0; i < levels.length; i++) {
    rec(i + 1, 'type', levels[i] + 'Level ' + (i + 1));
    await page.keyboard.type(levels[i] + 'Level ' + (i + 1));
    await cap('after-type');
    await page.keyboard.press('Enter');
    await wait(100);
  }
});

// ── C-H3: Heading with existing text ──
evalTest('FI-H-02', 'Heading with existing text', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', 'existing text');
  await page.keyboard.type('existing text');
  await cap('before');
  rec(2, 'press', 'Home then type "# "');
  await page.keyboard.press('Home');
  await page.keyboard.type('# ');
  await cap('after-heading');
});

// ── C-H8: Seven hashes (no heading) ──
evalTest('FI-H-03', '7+ hashes no heading', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '####### Not a heading');
  await page.keyboard.type('####### Not a heading');
  await cap('after-type');
});

// ── C-H9: Hash not at line start ──
evalTest('FI-H-04', 'Hash not at line start', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', 'hello # world');
  await page.keyboard.type('hello # world');
  await cap('after-type');
});

// ── C-H10: Hash without trailing space ──
evalTest('FI-H-05', 'Hash without space', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '#nospace');
  await page.keyboard.type('#nospace');
  await cap('after-type');
});

// ── E-H5 + E-H6: Enter at end + middle of heading ──
evalTest('FI-H-06', 'Enter in heading (end + middle)', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Hello World');
  await page.keyboard.type('## Hello World');
  await cap('heading-created');

  // Enter at end → should create <div>, not <h2>
  rec(2, 'press', 'Enter at end');
  await page.keyboard.press('Enter');
  await cap('after-enter-end');

  rec(3, 'type', 'plain text after heading');
  await page.keyboard.type('plain text after heading');
  await cap('after-plain');

  // Go back to heading and Enter in middle
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  rec(4, 'press', 'Enter mid-heading');
  await page.keyboard.press('Enter');
  await cap('after-enter-mid');
});

// ── E-H8: Backspace deletes ZWSP → heading reverts ──
evalTest('FI-H-07', 'Backspace ZWSP reverts heading', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Heading text');
  await page.keyboard.type('## Heading text');
  await cap('heading-created');

  rec(2, 'press', 'Home then Backspace (delete ZWSP)');
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await wait(100);
  await cap('after-revert');
});

// ── E-H13: Bold inside heading ──
evalTest('FI-H-08', 'Bold inside heading', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Some heading text');
  await page.keyboard.type('## Some heading text');
  await cap('heading-created');

  // Select "heading" and bold it
  rec(2, 'select+bold', 'Ctrl+B on "heading"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 7; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Control+b');
  await cap('after-bold-in-heading');
});

// ── D-H2: Backspace through heading text one char at a time ──
evalTest('FI-H-09', 'Delete heading char by char', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Hi');
  await page.keyboard.type('# Hi');
  await cap('heading-created');

  rec(2, 'press', 'Backspace x2 (delete "Hi")');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await cap('after-delete-text');

  // Now delete ZWSP to revert
  rec(3, 'press', 'Backspace (delete ZWSP)');
  await page.keyboard.press('Backspace');
  await wait(100);
  await cap('after-revert');
});

// ── D-H4: Select entire heading, delete ──
evalTest('FI-H-10', 'Select entire heading delete', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '### To be deleted');
  await page.keyboard.type('### To be deleted');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Next line survives');
  await cap('before-delete');

  rec(2, 'action', 'Select heading line + delete');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.press('Shift+End'); // ensure full line
  await page.keyboard.press('Backspace');
  await cap('after-delete');
});

// ── X-H1: Multiple headings in sequence ──
evalTest('FI-H-11', 'Multiple headings sequence', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '# First');
  await page.keyboard.type('# First');
  await page.keyboard.press('Enter');
  rec(2, 'type', '## Second');
  await page.keyboard.type('## Second');
  await page.keyboard.press('Enter');
  rec(3, 'type', '### Third');
  await page.keyboard.type('### Third');
  await cap('three-headings');
});

// ── C-H12: Undo heading creation ──
evalTest('FI-H-12', 'Undo heading creation', 'Formatting: Headings', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Undo me');
  await page.keyboard.type('## Undo me');
  await cap('heading-created');

  rec(2, 'shortcut', 'Ctrl+Z');
  await page.keyboard.press('Control+z');
  await wait(100);
  await cap('after-undo');
});
