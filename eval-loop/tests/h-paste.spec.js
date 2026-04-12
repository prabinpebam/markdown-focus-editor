/**
 * Category H: Paste Handling — TF-38 through TF-42
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-38: Paste Plain Text ──
evalTest('TF-38', 'Paste Plain Text', 'H. Paste Handling', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Before ');
  await page.keyboard.type('Before ');
  await cap('pre-action');

  rec(2, 'paste', 'plain text with newlines');
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'pasted line one\npasted line two\npasted line three');
    const event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');
});

// ── TF-39: Paste HTML from External Source ──
evalTest('TF-39', 'Paste HTML from External Source', 'H. Paste Handling', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', 'styled HTML');
  await page.evaluate(() => {
    var html = '<div style="color:red;font-family:Comic Sans MS"><b>Bold styled</b> and <span style="font-size:24px;">large text</span></div>';
    var dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', 'Bold styled and large text');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');
});

// ── TF-40: Paste Inline Markdown ──
evalTest('TF-40', 'Paste Inline Markdown', 'H. Paste Handling', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '**bold text**');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '**bold text**');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');

  rec(2, 'press', 'Enter');
  await page.keyboard.press('Enter');

  rec(3, 'paste', '*italic text*');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '*italic text*');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');

  rec(4, 'press', 'Enter');
  await page.keyboard.press('Enter');

  rec(5, 'paste', '~~strike~~');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '~~strike~~');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');
});

// ── TF-41: Paste Block-Level Markdown ──
evalTest('TF-41', 'Paste Block-Level Markdown', 'H. Paste Handling', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', 'block-level markdown');
  await page.evaluate(() => {
    var md = '# Heading\\n\\nParagraph text\\n\\n- Item 1\\n- Item 2';
    var dt = new DataTransfer();
    dt.setData('text/plain', md);
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(500);
  await cap('after-paste');
});

// ── TF-42: Paste Security ──
evalTest('TF-42', 'Paste Security', 'H. Paste Handling', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '<script> tag');
  await page.evaluate(() => {
    var html = '<div>Safe text</div><script>alert("xss")<\/script><div>More text</div>';
    var dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', 'Safe text More text');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');

  rec(2, 'paste', 'onerror attribute');
  await page.evaluate(() => {
    var html = '<img onerror="alert(1)" src="x"><div>After img</div>';
    var dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', 'After img');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');

  rec(3, 'paste', '<iframe>');
  await page.evaluate(() => {
    var html = '<iframe src="https://evil.com"></iframe><div>After iframe</div>';
    var dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', 'After iframe');
    var event = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    document.getElementById('editor').dispatchEvent(event);
  });
  await wait(300);
  await cap('after-paste');
});
