/**
 * Formatting Interactions: PASTE with formatting
 * Covers: P-1..P-25 from the formatting-interactions-spec
 */
const { evalTest, wait } = require('./test-setup');

// ── P-5..P-8: Paste markdown inline patterns ──
evalTest('FI-P-01', 'Paste **bold** inline', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '**bold text**');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '**bold text**');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste-bold');
});

evalTest('FI-P-02', 'Paste *italic* inline', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '*italic text*');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '*italic text*');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste-italic');
});

evalTest('FI-P-03', 'Paste ~~strike~~ inline', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '~~strike text~~');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '~~strike text~~');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste-strike');
});

// ── P-9: Paste partial bold (no closing **) ──
evalTest('FI-P-04', 'Paste partial bold (no closing)', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '**partial bold');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '**partial bold');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste-partial');
});

// ── P-10: Paste block-level markdown ──
evalTest('FI-P-05', 'Paste block-level markdown', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '# Heading + para + list');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '# Heading\n\nParagraph with **bold** text.\n\n- List item 1\n- List item 2');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(500);
  await cap('after-paste-blocks');
});

// ── P-13: Paste mixed inline formatting ──
evalTest('FI-P-06', 'Paste mixed formatting', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '**bold** and *italic* and ~~strike~~');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', '**bold** and *italic* and ~~strike~~');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-mixed-paste');
});

// ── P-14..P-15: Paste HTML with formatting ──
evalTest('FI-P-07', 'Paste HTML bold + strip styles', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', 'HTML <b> + styled spans');
  await page.evaluate(() => {
    var html = '<div style="color:red;font-family:Arial"><b>Bold text</b> and <span style="font-size:24px;color:blue">styled span</span></div>';
    var dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', 'Bold text and styled span');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-html-paste');
});

// ── P-16..P-17: Paste XSS attempts ──
evalTest('FI-P-08', 'Paste XSS: script + event handlers', 'Formatting: Paste', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'paste', '<script> tag');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/html', '<b>Safe</b><script>alert("xss")<\/script>');
    dt.setData('text/plain', 'Safe');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-script-paste');

  rec(2, 'paste', 'onerror handler');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/html', '<img onerror="alert(1)" src=x><b>After</b>');
    dt.setData('text/plain', 'After');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-handler-paste');
});

// ── P-21..P-23: Paste INTO formatted elements ──
evalTest('FI-P-09', 'Paste into heading', 'Formatting: Paste', async ({ page, cap, rec }) => {
  rec(1, 'type', '## Heading ');
  await page.keyboard.type('## Heading ');
  await cap('heading-ready');

  rec(2, 'paste', 'plain text into heading');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', 'inserted');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste-in-heading');
});

evalTest('FI-P-10', 'Paste into list item', 'Formatting: Paste', async ({ page, cap, rec }) => {
  rec(1, 'type', '- Item ');
  await page.keyboard.type('- Item ');
  await cap('li-ready');

  rec(2, 'paste', 'text into li');
  await page.evaluate(() => {
    var dt = new DataTransfer();
    dt.setData('text/plain', 'pasted content');
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  });
  await wait(300);
  await cap('after-paste-in-li');
});
