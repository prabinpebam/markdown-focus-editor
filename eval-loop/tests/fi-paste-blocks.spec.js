/**
 * Formatting Interactions: PASTE/LOAD pipeline for blockquotes, code blocks, tables
 *
 * These tests simulate content arriving via PASTE (which uses the same
 * markdownToEditorHtml pipeline as file loading). They detect formatting
 * failures that typing-based tests (fi-blocks.spec.js) cannot catch.
 *
 * Key scenarios from user-reported failure:
 * - Bare ">" line (no space after) must still parse as blockquote
 * - Consecutive "> " lines separated by empty "> " must stay in one blockquote
 * - Multi-paragraph blockquote content
 * - Code blocks inside pasted markdown
 * - Tables inside pasted markdown
 */
const { evalTest, wait } = require('./test-setup');

// ═══════════════════════════════════════════════════════════════
// BLOCKQUOTE PASTE/LOAD DETECTION
// ═══════════════════════════════════════════════════════════════

// ── PASTE-BQ-01: Bare ">" line (no space after) ──
evalTest('PASTE-BQ-01', 'Bare > without space (paste)', 'Paste: Blockquotes', async ({ page, cap, rec }) => {
  const md = '> First line\n>\n> Third line';
  rec(1, 'paste', 'markdown with bare > line');
  await page.evaluate((text) => {
    const editor = document.getElementById('editor');
    editor.innerHTML = '';
    // Simulate paste through markdownToEditorHtml
    const converter = window.__markdownConverter || null;
  }, md);

  // Use clipboard paste to go through the real pipeline
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(300);
  await cap('after-paste');

  // Check DOM for blockquote presence
  const blockquoteCount = await page.evaluate(() => {
    return document.querySelectorAll('#editor blockquote').length;
  });
  const literalGtCount = await page.evaluate(() => {
    // Count divs that start with literal ">" text (formatting failure)
    const blocks = document.querySelectorAll('#editor > div');
    let count = 0;
    for (const b of blocks) {
      if (b.textContent.trim().startsWith('>')) count++;
    }
    return count;
  });

  console.log(`  PASTE-BQ-01 detection: blockquotes=${blockquoteCount}, literal ">" divs=${literalGtCount}`);
  if (literalGtCount > 0) {
    console.log(`  ⚠ DETECTED: ${literalGtCount} lines with literal ">" — blockquote parsing failed`);
  }
});

// ── PASTE-BQ-02: Multi-line blockquote with blank separator ──
evalTest('PASTE-BQ-02', 'Multi-line blockquote (paste)', 'Paste: Blockquotes', async ({ page, cap, rec }) => {
  const md = '> Line one of quote\n> Line two of quote\n>\n> Line after empty';
  rec(1, 'paste', 'multi-line blockquote');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const bqs = document.querySelectorAll('#editor blockquote');
    const divs = document.querySelectorAll('#editor > div');
    let literalGt = 0;
    for (const d of divs) {
      if (d.textContent.trim().startsWith('>')) literalGt++;
    }
    return { blockquotes: bqs.length, topLevelDivs: divs.length, literalGtDivs: literalGt };
  });

  console.log(`  PASTE-BQ-02 detection: blockquotes=${result.blockquotes}, topDivs=${result.topLevelDivs}, literal ">"=${result.literalGtDivs}`);
  if (result.literalGtDivs > 0) {
    console.log(`  ⚠ DETECTED: blockquote paste produced literal ">" text instead of <blockquote> elements`);
  }
  if (result.blockquotes > 1) {
    console.log(`  ⚠ DETECTED: consecutive "> " lines created ${result.blockquotes} separate blockquotes (expected 1)`);
  }
});

// ── PASTE-BQ-03: The exact scenario from the screenshot ──
evalTest('PASTE-BQ-03', 'Screenshot scenario (lists + quotes)', 'Paste: Blockquotes', async ({ page, cap, rec }) => {
  const md = [
    '### Scenario 9 - Orchestrated plan',
    '',
    '**Context**: User has an F1 Red Bull photo.',
    '',
    '1. **Agent analyzes the image** (1-2 seconds):',
    '   - Identifies: F1 car, Red Bull Racing',
    '   - Extracts color palette: navy blue, red, yellow',
    '',
    '1. **Agent presents the plan**:',
    '',
    '   > "This is a Red Bull Racing F1 photo."',
    '   >',
    '   > 1. Generate a Red Bull F1 wallpaper',
    '   > 2. Extract color palette',
    '   > 3. Set accent color',
  ].join('\n');

  rec(1, 'paste', 'screenshot scenario');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const editor = document.getElementById('editor');
    const bqs = editor.querySelectorAll('blockquote');
    const h3s = editor.querySelectorAll('h3');
    const ols = editor.querySelectorAll('ol');
    const uls = editor.querySelectorAll('ul');

    // Check for literal ">" in any div (formatting failure)
    const allDivs = editor.querySelectorAll('div');
    let literalGt = 0;
    for (const d of allDivs) {
      const t = d.textContent.trim();
      if (t === '>' || t.startsWith('> ') || t.startsWith('>')) {
        // Only count if it's a direct child div (not inside a blockquote)
        if (!d.closest('blockquote') && !d.closest('.code-block') && !d.closest('.table-block')) {
          literalGt++;
        }
      }
    }

    return {
      headings: h3s.length,
      orderedLists: ols.length,
      unorderedLists: uls.length,
      blockquotes: bqs.length,
      literalGtDivs: literalGt,
      editorHTML: editor.innerHTML.substring(0, 500),
    };
  });

  console.log(`  PASTE-BQ-03 detection:`);
  console.log(`    headings=${result.headings}, OLs=${result.orderedLists}, ULs=${result.unorderedLists}`);
  console.log(`    blockquotes=${result.blockquotes}, literal ">" divs=${result.literalGtDivs}`);
  console.log(`    HTML preview: ${result.editorHTML.substring(0, 200)}...`);

  if (result.literalGtDivs > 0) {
    console.log(`  ⚠ DETECTED: ${result.literalGtDivs} lines with literal ">" — blockquote parsing failed for indented quotes`);
  }
  if (result.blockquotes === 0) {
    console.log(`  ⚠ DETECTED: NO blockquote elements found — blockquote parsing completely failed`);
  }
});

// ═══════════════════════════════════════════════════════════════
// CODE BLOCK PASTE/LOAD DETECTION
// ═══════════════════════════════════════════════════════════════

// ── PASTE-CB-01: Fenced code block with language ──
evalTest('PASTE-CB-01', 'Fenced code block paste', 'Paste: Code Blocks', async ({ page, cap, rec }) => {
  const md = 'Some text\n\n```javascript\nconst x = 42;\nconsole.log(x);\n```\n\nMore text';
  rec(1, 'paste', 'fenced code block');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(500);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const codeBlocks = document.querySelectorAll('#editor .code-block');
    const hasLang = codeBlocks.length > 0 ? codeBlocks[0].getAttribute('data-language') : null;
    const codeText = codeBlocks.length > 0 ? codeBlocks[0].querySelector('code')?.textContent : null;
    const hasHighlight = codeBlocks.length > 0 ? codeBlocks[0].querySelectorAll('.tok-keyword').length > 0 : false;

    // Check for literal ``` in divs (formatting failure)
    let literalFence = 0;
    for (const d of document.querySelectorAll('#editor > div')) {
      if (d.textContent.trim().startsWith('```')) literalFence++;
    }

    return { codeBlocks: codeBlocks.length, language: hasLang, hasCode: !!codeText, hasHighlight, literalFence };
  });

  console.log(`  PASTE-CB-01 detection: codeBlocks=${result.codeBlocks}, lang=${result.language}, hasCode=${result.hasCode}, highlighted=${result.hasHighlight}, literalFence=${result.literalFence}`);
  if (result.codeBlocks === 0) {
    console.log(`  ⚠ DETECTED: NO .code-block elements — code block paste parsing failed`);
  }
  if (result.literalFence > 0) {
    console.log(`  ⚠ DETECTED: literal \`\`\` text in divs — fences not consumed`);
  }
  if (result.codeBlocks > 0 && !result.hasHighlight) {
    console.log(`  ⚠ DETECTED: code block exists but no syntax highlighting applied`);
  }
});

// ═══════════════════════════════════════════════════════════════
// TABLE PASTE/LOAD DETECTION
// ═══════════════════════════════════════════════════════════════

// ── PASTE-TBL-01: GFM table paste ──
evalTest('PASTE-TBL-01', 'GFM table paste', 'Paste: Tables', async ({ page, cap, rec }) => {
  const md = 'Before table\n\n| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |\n\nAfter table';
  rec(1, 'paste', 'GFM table');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const tables = document.querySelectorAll('#editor .table-block');
    const rawPipe = Array.from(document.querySelectorAll('#editor > div'))
      .filter(d => d.textContent.trim().startsWith('|')).length;
    return { tableBlocks: tables.length, literalPipeDivs: rawPipe };
  });

  console.log(`  PASTE-TBL-01 detection: tableBlocks=${result.tableBlocks}, literal pipe divs=${result.literalPipeDivs}`);
  if (result.tableBlocks === 0) {
    console.log(`  ⚠ DETECTED: NO .table-block elements — table paste parsing failed`);
  }
  if (result.literalPipeDivs > 0) {
    console.log(`  ⚠ DETECTED: ${result.literalPipeDivs} divs with literal "|" — table syntax not consumed`);
  }
});

// ═══════════════════════════════════════════════════════════════
// INDENTED BLOCKQUOTE DETECTION (the exact bug from screenshot)
// ═══════════════════════════════════════════════════════════════

// ── PASTE-BQ-04: Indented blockquotes (within list context) ──
evalTest('PASTE-BQ-04', 'Indented > inside list (paste)', 'Paste: Blockquotes', async ({ page, cap, rec }) => {
  // This is the EXACT pattern that fails — "   > " (indented blockquote inside list)
  const md = '1. List item\n\n   > Indented quote line 1\n   > Indented quote line 2';
  rec(1, 'paste', 'indented blockquote');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const bqs = document.querySelectorAll('#editor blockquote');
    const allDivs = document.querySelectorAll('#editor > div:not(.code-block):not(.table-block)');
    let literalGt = 0;
    for (const d of allDivs) {
      const t = d.textContent.trim();
      if (t.startsWith('>') && !d.closest('blockquote')) literalGt++;
    }
    return { blockquotes: bqs.length, literalGtDivs: literalGt };
  });

  console.log(`  PASTE-BQ-04 detection: blockquotes=${result.blockquotes}, literal ">" divs=${result.literalGtDivs}`);
  if (result.literalGtDivs > 0) {
    console.log(`  ⚠ DETECTED: indented "> " not parsed as blockquote (${result.literalGtDivs} literal ">" divs)`);
  }
});

// ── PASTE-BQ-05: Bare > (no trailing space) ──
evalTest('PASTE-BQ-05', 'Bare > no trailing space', 'Paste: Blockquotes', async ({ page, cap, rec }) => {
  const md = '> Line before\n>\n> Line after';
  rec(1, 'paste', 'bare > without space');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => {
    const bqs = document.querySelectorAll('#editor blockquote');
    // The bare ">" should become an empty line inside one blockquote
    // If it created a separate div with literal ">", that's a failure
    const allDivs = document.querySelectorAll('#editor > div');
    let bareGt = 0;
    for (const d of allDivs) {
      if (d.textContent.trim() === '>') bareGt++;
    }
    // Count how many blockquotes — should be 1 (all consecutive > lines form one)
    return { blockquotes: bqs.length, bareGtDivs: bareGt };
  });

  console.log(`  PASTE-BQ-05 detection: blockquotes=${result.blockquotes}, bare ">" divs=${result.bareGtDivs}`);
  if (result.bareGtDivs > 0) {
    console.log(`  ⚠ DETECTED: bare ">" line not parsed — rendered as literal ">" text`);
  }
  if (result.blockquotes > 1) {
    console.log(`  ⚠ DETECTED: bare ">" broke continuity — ${result.blockquotes} blockquotes instead of 1`);
  }
});
