/**
 * Formatting Interactions: BLOCKQUOTE, CODE BLOCK, TABLE lifecycle
 * Covers creation, editing, keyboard behavior, and edge cases for all three new block types.
 */
const { evalTest, wait } = require('./test-setup');

// ═══════════════════════════════════════════════════════════════
// BLOCKQUOTES
// ═══════════════════════════════════════════════════════════════

// ── BQ-01: Basic blockquote creation ──
evalTest('FI-BQ-01', 'Blockquote creation (> text)', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '> This is a quote');
  await page.keyboard.type('> This is a quote');
  await cap('after-type');
});

// ── BQ-02: Enter inside blockquote (new line in same quote) ──
evalTest('FI-BQ-02', 'Enter inside blockquote', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  rec(1, 'type', '> First line');
  await page.keyboard.type('> First line');
  await cap('quote-created');
  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(3, 'type', 'Second line');
  await page.keyboard.type('Second line');
  await cap('after-second-line');
});

// ── BQ-03: Enter on empty blockquote line (exit quote) ──
evalTest('FI-BQ-03', 'Enter on empty quote line exits', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  rec(1, 'type', '> Some quote');
  await page.keyboard.type('> Some quote');
  await cap('quote-created');
  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(3, 'press', 'Enter on empty line');
  await page.keyboard.press('Enter');
  await wait(100);
  await cap('after-exit');
  rec(4, 'type', 'Normal text after quote');
  await page.keyboard.type('Normal text after quote');
  await cap('after-normal-text');
});

// ── BQ-04: Backspace at start of quote line (unwrap) ──
evalTest('FI-BQ-04', 'Backspace unwraps blockquote', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  rec(1, 'type', '> Unwrap me');
  await page.keyboard.type('> Unwrap me');
  await cap('quote-created');
  rec(2, 'press', 'Home then Backspace');
  await page.keyboard.press('Home');
  await page.keyboard.press('Backspace');
  await wait(100);
  await cap('after-unwrap');
});

// ── BQ-05: Nested blockquote (>> text) ──
evalTest('FI-BQ-05', 'Nested blockquote (>> text)', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  rec(1, 'type', '>> Nested quote');
  await page.keyboard.type('>> Nested quote');
  await cap('after-nested');
});

// ── BQ-06: > without space (no trigger) ──
evalTest('FI-BQ-06', '> without space (no trigger)', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  rec(1, 'type', '>nospace');
  await page.keyboard.type('>nospace');
  await cap('after-type');
});

// ── BQ-07: > in middle of text (no trigger) ──
evalTest('FI-BQ-07', '> in middle of text', 'Formatting: Blockquotes', async ({ page, cap, rec }) => {
  rec(1, 'type', 'hello > world');
  await page.keyboard.type('hello > world');
  await cap('after-type');
});

// ═══════════════════════════════════════════════════════════════
// CODE BLOCKS
// ═══════════════════════════════════════════════════════════════

// ── CB-01: Basic code block creation ──
evalTest('FI-CB-01', 'Code block creation (```js)', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '```js');
  await page.keyboard.type('```js');
  await cap('after-type');
});

// ── CB-02: Code block without language ──
evalTest('FI-CB-02', 'Code block without language', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  rec(1, 'type', '```');
  await page.keyboard.type('```');
  await cap('after-type');
});

// ── CB-03: Typing inside code block (no markdown triggers) ──
evalTest('FI-CB-03', 'Typing inside code block', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  rec(1, 'type', '```javascript');
  await page.keyboard.type('```javascript');
  await wait(200);
  await cap('code-block-created');

  // Type code that would normally trigger markdown
  rec(2, 'type', 'const x = **not bold**;');
  await page.keyboard.type('const x = **not bold**;');
  await cap('after-code-typing');
});

// ── CB-04: Tab inserts spaces in code block ──
evalTest('FI-CB-04', 'Tab inserts spaces in code block', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  rec(1, 'type', '```js');
  await page.keyboard.type('```js');
  await wait(200);

  rec(2, 'type', 'function hello() {');
  await page.keyboard.type('function hello() {');
  rec(3, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(4, 'press', 'Tab then type');
  await page.keyboard.press('Tab');
  await page.keyboard.type('return true;');
  await cap('after-tab-indent');
});

// ── CB-05: Escape exits code block ──
evalTest('FI-CB-05', 'Escape exits code block', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  rec(1, 'type', '```py');
  await page.keyboard.type('```py');
  await wait(200);
  rec(2, 'type', 'print("hello")');
  await page.keyboard.type('print("hello")');
  await cap('inside-code');
  rec(3, 'press', 'Escape');
  await page.keyboard.press('Escape');
  await wait(100);
  await cap('after-escape');
  rec(4, 'type', 'Normal text after code');
  await page.keyboard.type('Normal text after code');
  await cap('after-normal');
});

// ── CB-06: Backspace on empty code block (deletes it) ──
evalTest('FI-CB-06', 'Backspace deletes empty code block', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  rec(1, 'type', '```');
  await page.keyboard.type('```');
  await wait(200);
  await cap('empty-code-created');
  rec(2, 'press', 'Backspace');
  await page.keyboard.press('Backspace');
  await wait(100);
  await cap('after-delete');
});

// ── CB-07: Enter creates newline (not div) in code block ──
evalTest('FI-CB-07', 'Enter creates newline in code block', 'Formatting: Code Blocks', async ({ page, cap, rec }) => {
  rec(1, 'type', '```');
  await page.keyboard.type('```');
  await wait(200);
  rec(2, 'type', 'line 1');
  await page.keyboard.type('line 1');
  rec(3, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(4, 'type', 'line 2');
  await page.keyboard.type('line 2');
  rec(5, 'press', 'Enter');
  await page.keyboard.press('Enter');
  rec(6, 'type', 'line 3');
  await page.keyboard.type('line 3');
  await cap('after-multiline');
});

// ═══════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════

// ── TBL-01: Basic table creation ──
evalTest('FI-TBL-01', 'Table creation (pipe syntax)', 'Formatting: Tables', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '| Name | Age |');
  await page.keyboard.type('| Name | Age |');
  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(3, 'type', '|------|-----|');
  await page.keyboard.type('|------|-----|');
  await cap('after-separator');
});

// ── TBL-02: Table with alignment ──
evalTest('FI-TBL-02', 'Table with alignment', 'Formatting: Tables', async ({ page, cap, rec }) => {
  rec(1, 'type', '| Left | Center | Right |');
  await page.keyboard.type('| Left | Center | Right |');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(2, 'type', '|:-----|:------:|------:|');
  await page.keyboard.type('|:-----|:------:|------:|');
  await cap('after-aligned-table');
});

// ── TBL-03: Tab navigation between cells ──
evalTest('FI-TBL-03', 'Tab navigation in table', 'Formatting: Tables', async ({ page, cap, rec }) => {
  rec(1, 'type header', '| A | B | C |');
  await page.keyboard.type('| A | B | C |');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(2, 'type separator', '|---|---|---|');
  await page.keyboard.type('|---|---|---|');
  await wait(300);
  await cap('table-created');

  // Now we should be in first data cell
  rec(3, 'type', 'Cell 1');
  await page.keyboard.type('Cell 1');
  rec(4, 'press', 'Tab');
  await page.keyboard.press('Tab');
  rec(5, 'type', 'Cell 2');
  await page.keyboard.type('Cell 2');
  rec(6, 'press', 'Tab');
  await page.keyboard.press('Tab');
  rec(7, 'type', 'Cell 3');
  await page.keyboard.type('Cell 3');
  await cap('after-fill-cells');
});

// ── TBL-04: Enter adds new row ──
evalTest('FI-TBL-04', 'Enter adds table row', 'Formatting: Tables', async ({ page, cap, rec }) => {
  rec(1, 'type', '| X | Y |');
  await page.keyboard.type('| X | Y |');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(2, 'type', '|---|---|');
  await page.keyboard.type('|---|---|');
  await wait(300);

  rec(3, 'type', 'Row1-A');
  await page.keyboard.type('Row1-A');
  rec(4, 'press', 'Tab');
  await page.keyboard.press('Tab');
  rec(5, 'type', 'Row1-B');
  await page.keyboard.type('Row1-B');
  await cap('first-row-filled');

  rec(6, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(7, 'type', 'Row2-A');
  await page.keyboard.type('Row2-A');
  await cap('after-new-row');
});

// ── TBL-05: Escape exits table ──
evalTest('FI-TBL-05', 'Escape exits table', 'Formatting: Tables', async ({ page, cap, rec }) => {
  rec(1, 'type', '| H |');
  await page.keyboard.type('| H |');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(2, 'type', '|---|');
  await page.keyboard.type('|---|');
  await wait(300);

  rec(3, 'type', 'data');
  await page.keyboard.type('data');
  await cap('inside-table');

  rec(4, 'press', 'Escape');
  await page.keyboard.press('Escape');
  await wait(100);
  await cap('after-escape');

  rec(5, 'type', 'Normal text');
  await page.keyboard.type('Normal text');
  await cap('after-normal');
});

// ── TBL-06: Pipe text that's NOT a table (no separator) ──
evalTest('FI-TBL-06', 'Pipe text without separator', 'Formatting: Tables', async ({ page, cap, rec }) => {
  rec(1, 'type', '| Not | A | Table |');
  await page.keyboard.type('| Not | A | Table |');
  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');
  await wait(100);
  rec(3, 'type', 'Just normal text');
  await page.keyboard.type('Just normal text');
  await cap('no-table');
});
