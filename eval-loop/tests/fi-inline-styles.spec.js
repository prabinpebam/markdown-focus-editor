/**
 * Formatting Interactions: INLINE STYLES (Bold, Italic, Strikethrough, Bold-Italic)
 * Covers: C-B1..C-B10, E-B1..E-B8, M-B1..M-B7, D-B1..D-B7, X-B1..X-B10
 *         C-I1..C-I6, C-BI1..C-BI3, C-S1..C-S4
 *         BO-1..BO-6 (Break-out)
 */
const { evalTest, wait } = require('./test-setup');

// ── C-B1: Bold via markdown "**h" ──
evalTest('FI-S-01', 'Bold creation via **char', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Normal then **h');
  await page.keyboard.type('Normal text ');
  await page.keyboard.type('**h');
  await cap('bold-created');

  rec(2, 'type', 'ello (grow bold)');
  await page.keyboard.type('ello');
  await cap('bold-grown');
});

// ── C-B2: Bold with space (no trigger) ──
evalTest('FI-S-02', 'Bold no trigger with space', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '** (space after)');
  await page.keyboard.type('** ');
  await cap('no-bold');
  rec(2, 'type', 'more text');
  await page.keyboard.type('more text');
  await cap('still-no-bold');
});

// ── C-I1: Italic via "*h" ──
evalTest('FI-S-03', 'Italic creation via *char', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Text then *h');
  await page.keyboard.type('Text ');
  await page.keyboard.type('*h');
  await cap('italic-created');

  rec(2, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('italic-grown');
});

// ── C-BI1: Bold-italic via "***h" ──
evalTest('FI-S-04', 'Bold-italic via ***char', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '***h');
  await page.keyboard.type('***h');
  await cap('bold-italic-created');

  rec(2, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('bold-italic-grown');
});

// ── C-S1: Strikethrough via "~~h" ──
evalTest('FI-S-05', 'Strikethrough via ~~char', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '~~h');
  await page.keyboard.type('~~h');
  await cap('strike-created');

  rec(2, 'type', 'ello');
  await page.keyboard.type('ello');
  await cap('strike-grown');
});

// ── C-B4: Ctrl+B with selection ──
evalTest('FI-S-06', 'Ctrl+B with selection', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Select this word please');
  await page.keyboard.type('Select this word please');
  await cap('before-bold');

  // Select "this"
  rec(2, 'select', '"this"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');

  rec(3, 'shortcut', 'Ctrl+B');
  await page.keyboard.press('Control+b');
  await cap('after-ctrl-b');
});

// ── C-B5: Ctrl+B with no selection (empty bold) ──
evalTest('FI-S-07', 'Ctrl+B no selection (empty bold)', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Before ');
  await page.keyboard.type('Before ');

  rec(2, 'shortcut', 'Ctrl+B (no selection)');
  await page.keyboard.press('Control+b');
  await cap('empty-bold');

  rec(3, 'type', 'bolded text');
  await page.keyboard.type('bolded text');
  await cap('typed-in-bold');
});

// ── C-I3: Ctrl+I with selection ──
evalTest('FI-S-08', 'Ctrl+I with selection', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Make this italic');
  await page.keyboard.type('Make this italic');

  rec(2, 'select', '"this"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');

  rec(3, 'shortcut', 'Ctrl+I');
  await page.keyboard.press('Control+i');
  await cap('after-ctrl-i');
});

// ── C-S2: Ctrl+Shift+S with selection ──
evalTest('FI-S-09', 'Ctrl+Shift+S strikethrough', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Strike this out');
  await page.keyboard.type('Strike this out');

  rec(2, 'select', '"this"');
  await page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');

  rec(3, 'shortcut', 'Ctrl+Shift+S');
  await page.keyboard.press('Control+Shift+s');
  await cap('after-strike');
});

// ── E-B2: Type after ZWSP (unstyled) ──
evalTest('FI-S-10', 'Type after ZWSP (escape bold)', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '**hello');
  await page.keyboard.type('**hello');
  await cap('bold-created');

  // Move past ZWSP
  rec(2, 'press', 'ArrowRight (past ZWSP)');
  await page.keyboard.press('ArrowRight');

  rec(3, 'type', ' unstyled');
  await page.keyboard.type(' unstyled');
  await cap('after-unstyled');
});

// ── BO-1: Break-out of bold ──
evalTest('FI-S-11', 'Bold break-out (** inside bold)', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '**first');
  await page.keyboard.type('**first');
  await cap('first-bold');

  // Type ** again to break out, then new char
  rec(2, 'type', '**second');
  await page.keyboard.type('**second');
  await cap('after-breakout');
});

// ── BO-2: Break-out of italic ──
evalTest('FI-S-12', 'Italic break-out (* inside italic)', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '*first');
  await page.keyboard.type('*first');
  await cap('first-italic');

  rec(2, 'type', '*second');
  await page.keyboard.type('*second');
  await cap('after-breakout');
});

// ── D-B1: Backspace through bold one char at a time ──
evalTest('FI-S-13', 'Backspace through bold char by char', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '**hi');
  await page.keyboard.type('**hi');
  await cap('bold-created');

  rec(2, 'press', 'Backspace x2');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await cap('after-empty-bold');

  // One more backspace
  rec(3, 'press', 'Backspace (into markers)');
  await page.keyboard.press('Backspace');
  await cap('after-marker-delete');
});

// ── D-B2: Select entire bold + markers, delete ──
evalTest('FI-S-14', 'Select entire bold+markers, delete', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'before **hello** after');
  await page.keyboard.type('before ');
  await page.keyboard.type('**hello');
  await page.keyboard.press('ArrowRight'); // past ZWSP
  await page.keyboard.type(' after');
  await cap('setup');

  // Select from "before " through bold + markers
  rec(2, 'select+delete', 'Select bold region');
  await page.keyboard.press('Home');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Delete');
  await cap('after-delete');
});

// ── X-B1: Adjacent bold elements ──
evalTest('FI-S-15', 'Adjacent bold elements', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '**first');
  await page.keyboard.type('**first');
  await page.keyboard.press('ArrowRight'); // past ZWSP

  rec(2, 'type', ' ');
  await page.keyboard.type(' ');

  rec(3, 'type', '**second');
  await page.keyboard.type('**second');
  await cap('two-bolds');
});

// ── X-B5: Partial bold marker (** without trigger) ──
evalTest('FI-S-16', 'Partial marker ** then space', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '** ');
  await page.keyboard.type('**');
  await page.keyboard.type(' ');
  await cap('after-partial-marker');

  rec(2, 'type', 'text after');
  await page.keyboard.type('text after');
  await cap('no-bold');
});

// ── X-B7: Bold inside heading ──
evalTest('FI-S-17', 'Bold inside heading', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Heading with ');
  await page.keyboard.type('## Heading with ');
  rec(2, 'type', '**bold');
  await page.keyboard.type('**bold');
  await cap('bold-in-heading');
});

// ── X-B8: Bold inside list item ──
evalTest('FI-S-18', 'Bold inside list item', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item with ');
  await page.keyboard.type('- Item with ');
  rec(2, 'type', '**bold');
  await page.keyboard.type('**bold');
  await cap('bold-in-li');
});

// ── C-I6: Distinguish * vs ** vs *** ──
evalTest('FI-S-19', 'Pattern precedence: * vs ** vs ***', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', '***a (should be bold-italic)');
  await page.keyboard.type('***a');
  await cap('triple-star');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');

  rec(2, 'type', '**b (should be bold)');
  await page.keyboard.type('**b');
  await cap('double-star');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' ');

  rec(3, 'type', '*c (should be italic)');
  await page.keyboard.type('*c');
  await cap('single-star');
});

// ── Multiple styles in one line ──
evalTest('FI-S-20', 'Multiple styles in one line', 'Formatting: Inline', async ({ page, cap, rec }) => {
  rec(1, 'type', 'normal **bold');
  await page.keyboard.type('normal ');
  await page.keyboard.type('**bold');
  await page.keyboard.press('ArrowRight');

  rec(2, 'type', ' and *italic');
  await page.keyboard.type(' and ');
  await page.keyboard.type('*italic');
  await page.keyboard.press('ArrowRight');

  rec(3, 'type', ' and ~~strike');
  await page.keyboard.type(' and ');
  await page.keyboard.type('~~strike');
  await cap('mixed-styles');
});
