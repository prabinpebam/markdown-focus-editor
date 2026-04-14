/**
 * Roundtrip Fidelity Test — Ensures save/open cycle preserves content exactly.
 *
 * Tests: HTML→MD→HTML→MD roundtrip stability for all block types.
 * A document should stabilize after ONE roundtrip — subsequent cycles
 * must produce identical markdown.
 */
const { evalTest, wait } = require('./test-setup');

const ROUNDTRIP_TEST = `(async () => {
  const m = await import('/js/modules/markdownConverter.js');
  const converter = m.default;
  const editor = document.getElementById('editor');
  
  // Get current editor HTML
  const html1 = editor.innerHTML;
  
  // Convert to markdown (save)
  const md1 = converter.editorHtmlToMarkdown(html1);
  
  // Convert back to HTML (open)
  const html2 = converter.markdownToEditorHtml(md1);
  
  // Convert to markdown again (second save)
  // Set editor innerHTML to simulate actual open
  editor.innerHTML = html2;
  const md2 = converter.editorHtmlToMarkdown(editor.innerHTML);
  
  // Third cycle
  const html3 = converter.markdownToEditorHtml(md2);
  editor.innerHTML = html3;
  const md3 = converter.editorHtmlToMarkdown(editor.innerHTML);
  
  return { md1, md2, md3 };
})()`;

function checkStability(label, md1, md2, md3) {
  const issues = [];
  
  if (md1 !== md2) {
    issues.push(label + ': MD changed after 1st roundtrip');
    // Show diff
    const lines1 = md1.split('\n');
    const lines2 = md2.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLen; i++) {
      if (lines1[i] !== lines2[i]) {
        issues.push('  Line ' + i + ': "' + (lines1[i]||'').substring(0,60) + '" -> "' + (lines2[i]||'').substring(0,60) + '"');
      }
    }
    if (lines1.length !== lines2.length) {
      issues.push('  Line count: ' + lines1.length + ' -> ' + lines2.length);
    }
  }
  
  if (md2 !== md3) {
    issues.push(label + ': MD still changing after 2nd roundtrip (not stable)');
  }
  
  return issues;
}

// ── RT-01: Basic paragraphs with blank lines ──
evalTest('RT-01', 'Paragraph roundtrip stability', 'RT. Roundtrip Fidelity', async ({ page, cap, rec }) => {
  await page.evaluate(() => {
    document.getElementById('editor').innerHTML = 
      '<div>First paragraph</div><div><br></div><div>Second paragraph</div><div><br></div><div>Third paragraph</div>';
  });
  await wait(200);
  await cap('initial');
  
  const result = await page.evaluate(ROUNDTRIP_TEST);
  console.log('\\n  [RT-01] MD1:', JSON.stringify(result.md1));
  console.log('  [RT-01] MD2:', JSON.stringify(result.md2));
  
  const issues = checkStability('RT-01', result.md1, result.md2, result.md3);
  if (issues.length === 0) {
    console.log('  [RT-01] ✅ STABLE');
  } else {
    issues.forEach(i => console.log('  ' + i));
  }
});

// ── RT-02: Headings with paragraphs ──
evalTest('RT-02', 'Headings roundtrip stability', 'RT. Roundtrip Fidelity', async ({ page, cap, rec }) => {
  await page.evaluate(() => {
    document.getElementById('editor').innerHTML = 
      '<h1><span class="heading-marker" contenteditable="false">#</span>\u200BTitle</h1>' +
      '<div><br></div>' +
      '<div>Some text</div>' +
      '<div><br></div>' +
      '<h2><span class="heading-marker" contenteditable="false">##</span>\u200BSubtitle</h2>' +
      '<div>More text</div>';
  });
  await wait(200);
  await cap('initial');
  
  const result = await page.evaluate(ROUNDTRIP_TEST);
  console.log('\\n  [RT-02] MD1:', JSON.stringify(result.md1));
  console.log('  [RT-02] MD2:', JSON.stringify(result.md2));
  
  const issues = checkStability('RT-02', result.md1, result.md2, result.md3);
  if (issues.length === 0) {
    console.log('  [RT-02] ✅ STABLE');
  } else {
    issues.forEach(i => console.log('  ' + i));
  }
});

// ── RT-03: Nested lists ──
evalTest('RT-03', 'Nested list roundtrip stability', 'RT. Roundtrip Fidelity', async ({ page, cap, rec }) => {
  await page.evaluate(() => {
    document.getElementById('editor').innerHTML = 
      '<ul><li>Item 1<ul><li>Sub A<ul><li>Deep</li></ul></li><li>Sub B</li></ul></li><li>Item 2</li></ul>';
  });
  await wait(200);
  await cap('initial');
  
  const result = await page.evaluate(ROUNDTRIP_TEST);
  console.log('\\n  [RT-03] MD1:', JSON.stringify(result.md1));
  console.log('  [RT-03] MD2:', JSON.stringify(result.md2));
  
  const issues = checkStability('RT-03', result.md1, result.md2, result.md3);
  if (issues.length === 0) {
    console.log('  [RT-03] ✅ STABLE');
  } else {
    issues.forEach(i => console.log('  ' + i));
  }
});

// ── RT-04: Mixed content (heading + list + paragraph + code) ──
evalTest('RT-04', 'Mixed content roundtrip stability', 'RT. Roundtrip Fidelity', async ({ page, cap, rec }) => {
  await page.evaluate(() => {
    document.getElementById('editor').innerHTML = 
      '<h1><span class="heading-marker" contenteditable="false">#</span>\u200BProject</h1>' +
      '<div><br></div>' +
      '<div>Description here.</div>' +
      '<div><br></div>' +
      '<ul><li>Feature 1</li><li>Feature 2<ul><li>Detail</li></ul></li></ul>' +
      '<div><br></div>' +
      '<div>Final note.</div>';
  });
  await wait(200);
  await cap('initial');
  
  const result = await page.evaluate(ROUNDTRIP_TEST);
  console.log('\\n  [RT-04] MD1:', JSON.stringify(result.md1));
  console.log('  [RT-04] MD2:', JSON.stringify(result.md2));
  
  const issues = checkStability('RT-04', result.md1, result.md2, result.md3);
  if (issues.length === 0) {
    console.log('  [RT-04] ✅ STABLE');
  } else {
    issues.forEach(i => console.log('  ' + i));
  }
});

// ── RT-05: Multiple consecutive blank lines ──
evalTest('RT-05', 'Consecutive blanks roundtrip', 'RT. Roundtrip Fidelity', async ({ page, cap, rec }) => {
  await page.evaluate(() => {
    document.getElementById('editor').innerHTML = 
      '<div>Above</div><div><br></div><div><br></div><div><br></div><div>Below</div>';
  });
  await wait(200);
  await cap('initial');
  
  const result = await page.evaluate(ROUNDTRIP_TEST);
  console.log('\\n  [RT-05] MD1:', JSON.stringify(result.md1));
  console.log('  [RT-05] MD2:', JSON.stringify(result.md2));
  
  const issues = checkStability('RT-05', result.md1, result.md2, result.md3);
  if (issues.length === 0) {
    console.log('  [RT-05] ✅ STABLE');
  } else {
    issues.forEach(i => console.log('  ' + i));
  }
});

// ── RT-06: Bold/italic inline styles ──
evalTest('RT-06', 'Inline styles roundtrip stability', 'RT. Roundtrip Fidelity', async ({ page, cap, rec }) => {
  await page.evaluate(() => {
    document.getElementById('editor').innerHTML = 
      '<div>Normal <b>bold</b> and <i>italic</i> text</div>' +
      '<div><br></div>' +
      '<div><b><i>Bold italic</i></b> mixed</div>';
  });
  await wait(200);
  await cap('initial');
  
  const result = await page.evaluate(ROUNDTRIP_TEST);
  console.log('\\n  [RT-06] MD1:', JSON.stringify(result.md1));
  console.log('  [RT-06] MD2:', JSON.stringify(result.md2));
  
  const issues = checkStability('RT-06', result.md1, result.md2, result.md3);
  if (issues.length === 0) {
    console.log('  [RT-06] ✅ STABLE');
  } else {
    issues.forEach(i => console.log('  ' + i));
  }
});
