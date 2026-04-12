/**
 * Formatting Interactions: HR, Inline Code, Task Lists, Links
 * Covers both typing input path and paste/load pipeline.
 */
const { evalTest, wait } = require('./test-setup');

// ═══════════════════════════════════════════════════════════════
// HORIZONTAL RULE
// ═══════════════════════════════════════════════════════════════

// ── HR-01: Create HR with --- ──
evalTest('FI-HR-01', 'HR creation with ---', 'Formatting: HR', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '---');
  await page.keyboard.type('---');
  await cap('after-type');
});

// ── HR-02: Create HR with *** ──
evalTest('FI-HR-02', 'HR creation with ***', 'Formatting: HR', async ({ page, cap, rec }) => {
  rec(1, 'type', '***');
  await page.keyboard.type('***');
  await cap('after-type');
});

// ── HR-03: Create HR with ___ ──
evalTest('FI-HR-03', 'HR creation with ___', 'Formatting: HR', async ({ page, cap, rec }) => {
  rec(1, 'type', '___');
  await page.keyboard.type('___');
  await cap('after-type');
});

// ── HR-04: --- with surrounding text ──
evalTest('FI-HR-04', 'HR between text blocks', 'Formatting: HR', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Above the line');
  await page.keyboard.type('Above the line');
  await page.keyboard.press('Enter');
  rec(2, 'type', '---');
  await page.keyboard.type('---');
  await wait(200);
  await cap('hr-created');
  rec(3, 'type', 'Below the line');
  await page.keyboard.type('Below the line');
  await cap('after-below');
});

// ── HR-05: Paste HR ──
evalTest('FI-HR-05', 'HR paste from markdown', 'Formatting: HR', async ({ page, cap, rec }) => {
  const md = 'Above\n\n---\n\nBelow';
  rec(1, 'paste', 'markdown with HR');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    return { hrs: document.querySelectorAll('#editor hr').length };
  });
  console.log(`  HR-05 detection: hr elements=${result.hrs}`);
  if (result.hrs === 0) console.log('  ⚠ DETECTED: HR paste failed');
});

// ═══════════════════════════════════════════════════════════════
// INLINE CODE
// ═══════════════════════════════════════════════════════════════

// ── IC-01: Inline code via backticks ──
evalTest('FI-IC-01', 'Inline code via backticks', 'Formatting: Inline Code', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '`hello`');
  await page.keyboard.type('`hello`');
  await cap('after-type');
});

// ── IC-02: Inline code then more text ──
evalTest('FI-IC-02', 'Inline code followed by text', 'Formatting: Inline Code', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Use `console.log` for debugging');
  await page.keyboard.type('Use `console.log`');
  await cap('after-code');
  rec(2, 'type', ' for debugging');
  await page.keyboard.type(' for debugging');
  await cap('after-text');
});

// ── IC-03: No trigger for single backtick ──
evalTest('FI-IC-03', 'Single backtick no trigger', 'Formatting: Inline Code', async ({ page, cap, rec }) => {
  rec(1, 'type', '`incomplete');
  await page.keyboard.type('`incomplete');
  await cap('after-type');
});

// ── IC-04: Paste inline code ──
evalTest('FI-IC-04', 'Inline code paste', 'Formatting: Inline Code', async ({ page, cap, rec }) => {
  const md = 'Run `npm install` to set up';
  rec(1, 'paste', 'markdown with inline code');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    return { codeElements: document.querySelectorAll('#editor code').length };
  });
  console.log(`  IC-04 detection: code elements=${result.codeElements}`);
  if (result.codeElements === 0) console.log('  ⚠ DETECTED: inline code paste failed');
});

// ═══════════════════════════════════════════════════════════════
// TASK LISTS
// ═══════════════════════════════════════════════════════════════

// ── TASK-01: Create unchecked task ──
evalTest('FI-TASK-01', 'Task list unchecked (- [ ])', 'Formatting: Tasks', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '- [ ] Buy groceries');
  await page.keyboard.type('- [ ] Buy groceries');
  await cap('after-type');
});

// ── TASK-02: Create checked task ──
evalTest('FI-TASK-02', 'Task list checked (- [x])', 'Formatting: Tasks', async ({ page, cap, rec }) => {
  rec(1, 'type', '- [x] Done task');
  await page.keyboard.type('- [x] Done task');
  await cap('after-type');
});

// ── TASK-03: Paste task list ──
evalTest('FI-TASK-03', 'Task list paste', 'Formatting: Tasks', async ({ page, cap, rec }) => {
  const md = '- [ ] Unchecked\n- [x] Checked\n- [ ] Another';
  rec(1, 'paste', 'task list markdown');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const checkboxes = document.querySelectorAll('#editor .task-checkbox');
    const checked = document.querySelectorAll('#editor .task-checkbox:checked');
    return { total: checkboxes.length, checked: checked.length };
  });
  console.log(`  TASK-03 detection: checkboxes=${result.total}, checked=${result.checked}`);
  if (result.total === 0) console.log('  ⚠ DETECTED: task list paste failed');
  if (result.total > 0 && result.checked !== 1) console.log('  ⚠ DETECTED: wrong checked count');
});

// ═══════════════════════════════════════════════════════════════
// LINKS
// ═══════════════════════════════════════════════════════════════

// ── LINK-01: Create link via [text](url) ──
evalTest('FI-LINK-01', 'Link creation [text](url)', 'Formatting: Links', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '[Google](https://google.com)');
  await page.keyboard.type('[Google](https://google.com)');
  await cap('after-type');
});

// ── LINK-02: Link followed by more text ──
evalTest('FI-LINK-02', 'Link followed by text', 'Formatting: Links', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Visit [GitHub](https://github.com) for code');
  await page.keyboard.type('Visit [GitHub](https://github.com)');
  await cap('after-link');
  rec(2, 'type', ' for code');
  await page.keyboard.type(' for code');
  await cap('after-text');
});

// ── LINK-03: Paste link ──
evalTest('FI-LINK-03', 'Link paste from markdown', 'Formatting: Links', async ({ page, cap, rec }) => {
  const md = 'Check [this link](https://example.com) for details';
  rec(1, 'paste', 'markdown with link');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const anchors = document.querySelectorAll('#editor a');
    return {
      count: anchors.length,
      href: anchors.length > 0 ? anchors[0].href : null,
      text: anchors.length > 0 ? anchors[0].textContent : null,
    };
  });
  console.log(`  LINK-03 detection: links=${result.count}, href=${result.href}, text=${result.text}`);
  if (result.count === 0) console.log('  ⚠ DETECTED: link paste failed');
});

// ═══════════════════════════════════════════════════════════════
// COMBINED PASTE (all 4 features together)
// ═══════════════════════════════════════════════════════════════

evalTest('FI-COMBO-01', 'All new features combined paste', 'Formatting: Combined', async ({ page, cap, rec }) => {
  const md = [
    '# My Document',
    '',
    'Run `npm install` to set up the project.',
    '',
    '---',
    '',
    '## Tasks',
    '',
    '- [x] Write code',
    '- [ ] Test code',
    '- [ ] Deploy',
    '',
    'Visit [our docs](https://docs.example.com) for more info.',
    '',
    '---',
    '',
    'End of document.',
  ].join('\n');

  rec(1, 'paste', 'combined markdown');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    return {
      headings: document.querySelectorAll('#editor h1, #editor h2').length,
      hrs: document.querySelectorAll('#editor hr').length,
      inlineCode: document.querySelectorAll('#editor code').length,
      checkboxes: document.querySelectorAll('#editor .task-checkbox').length,
      links: document.querySelectorAll('#editor a').length,
    };
  });
  console.log(`  COMBO-01: h=${result.headings} hr=${result.hrs} code=${result.inlineCode} tasks=${result.checkboxes} links=${result.links}`);
  if (result.hrs < 2) console.log(`  ⚠ DETECTED: expected 2 HRs, got ${result.hrs}`);
  if (result.inlineCode < 1) console.log(`  ⚠ DETECTED: no inline code`);
  if (result.checkboxes < 3) console.log(`  ⚠ DETECTED: expected 3 tasks, got ${result.checkboxes}`);
  if (result.links < 1) console.log(`  ⚠ DETECTED: no links`);
});
