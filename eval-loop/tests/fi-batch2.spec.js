/**
 * Formatting Interactions: Images, Underscore emphasis, Autolinks, Character escapes
 * Following eval-loop approach: exhaustive interactions → capture → evaluate → fix
 */
const { evalTest, wait } = require('./test-setup');

// ═══════════════════════════════════════════════════════════════
// UNDERSCORE EMPHASIS
// ═══════════════════════════════════════════════════════════════

// ── USCORE-01: _italic_ via underscore ──
evalTest('FI-USCORE-01', 'Italic via underscore _text_', 'Formatting: Underscores', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '_hello_');
  // Underscore italic triggers on char after opening _ like asterisk
  await page.keyboard.type('_hello_');
  await cap('after-type');
});

// ── USCORE-02: __bold__ via underscore ──
evalTest('FI-USCORE-02', 'Bold via underscore __text__', 'Formatting: Underscores', async ({ page, cap, rec }) => {
  rec(1, 'type', '__world__');
  await page.keyboard.type('__world__');
  await cap('after-type');
});

// ── USCORE-03: Paste with underscore emphasis ──
evalTest('FI-USCORE-03', 'Underscore emphasis paste', 'Formatting: Underscores', async ({ page, cap, rec }) => {
  const md = 'This is __bold__ and _italic_ text';
  rec(1, 'paste', md);
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
      bolds: document.querySelectorAll('#editor b, #editor strong').length,
      italics: document.querySelectorAll('#editor i, #editor em').length,
    };
  });
  console.log(`  USCORE-03: bolds=${result.bolds}, italics=${result.italics}`);
  if (result.bolds < 1) console.log('  ⚠ DETECTED: __bold__ paste failed');
  if (result.italics < 1) console.log('  ⚠ DETECTED: _italic_ paste failed');
});

// ═══════════════════════════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════════════════════════

// ── IMG-01: Image via ![alt](url) ──
evalTest('FI-IMG-01', 'Image creation ![alt](url)', 'Formatting: Images', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', '![logo](https://example.com/img.png)');
  await page.keyboard.type('![logo](https://example.com/img.png)');
  await cap('after-type');
});

// ── IMG-02: Image paste ──
evalTest('FI-IMG-02', 'Image paste from markdown', 'Formatting: Images', async ({ page, cap, rec }) => {
  const md = 'Here is an image: ![alt text](https://example.com/photo.jpg)';
  rec(1, 'paste', 'markdown with image');
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
    const imgs = document.querySelectorAll('#editor img');
    return {
      count: imgs.length,
      src: imgs.length > 0 ? imgs[0].src : null,
      alt: imgs.length > 0 ? imgs[0].alt : null,
    };
  });
  console.log(`  IMG-02: images=${result.count}, src=${result.src}, alt=${result.alt}`);
  if (result.count === 0) console.log('  ⚠ DETECTED: image paste failed');
});

// ── IMG-03: Image not triggered without ! prefix ──
evalTest('FI-IMG-03', 'No image without ! prefix', 'Formatting: Images', async ({ page, cap, rec }) => {
  rec(1, 'type', '[text](url) should be link not image');
  await page.keyboard.type('[text](https://example.com)');
  await cap('after-type');

  const result = await page.evaluate(() => ({
    imgs: document.querySelectorAll('#editor img').length,
    links: document.querySelectorAll('#editor a').length,
  }));
  console.log(`  IMG-03: imgs=${result.imgs}, links=${result.links}`);
  if (result.imgs > 0) console.log('  ⚠ DETECTED: image created without ! prefix');
});

// ═══════════════════════════════════════════════════════════════
// AUTOLINKS
// ═══════════════════════════════════════════════════════════════

// ── AUTO-01: URL autolinked on space ──
evalTest('FI-AUTO-01', 'URL autolinked on space', 'Formatting: Autolinks', async ({ page, cap, rec }) => {
  await cap('initial');
  rec(1, 'type', 'Visit https://example.com ');
  await page.keyboard.type('Visit https://example.com ');
  await cap('after-type');

  const result = await page.evaluate(() => {
    const links = document.querySelectorAll('#editor a');
    return {
      count: links.length,
      href: links.length > 0 ? links[0].href : null,
    };
  });
  console.log(`  AUTO-01: links=${result.count}, href=${result.href}`);
  if (result.count === 0) console.log('  ⚠ DETECTED: autolink not created');
});

// ── AUTO-02: URL not autolinked without space ──
evalTest('FI-AUTO-02', 'URL not autolinked without space', 'Formatting: Autolinks', async ({ page, cap, rec }) => {
  rec(1, 'type', 'https://example.com');
  await page.keyboard.type('https://example.com');
  await cap('after-type');

  const result = await page.evaluate(() => ({
    links: document.querySelectorAll('#editor a').length,
  }));
  console.log(`  AUTO-02: links=${result.count} (should be 0 — no trailing space)`);
});

// ── AUTO-03: Paste autolinks ──
evalTest('FI-AUTO-03', 'Autolink paste', 'Formatting: Autolinks', async ({ page, cap, rec }) => {
  const md = 'Check https://docs.example.com/guide for details';
  rec(1, 'paste', 'text with bare URL');
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
    const links = document.querySelectorAll('#editor a');
    return { count: links.length };
  });
  console.log(`  AUTO-03: links=${result.count}`);
  if (result.count === 0) console.log('  ⚠ DETECTED: autolink paste failed');
});

// ═══════════════════════════════════════════════════════════════
// CHARACTER ESCAPES
// ═══════════════════════════════════════════════════════════════

// ── ESC-01: \* should not trigger bold ──
evalTest('FI-ESC-01', 'Escaped asterisk paste (\\*)', 'Formatting: Escapes', async ({ page, cap, rec }) => {
  const md = 'This is \\*not bold\\* text';
  rec(1, 'paste', 'escaped asterisks');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => ({
    bolds: document.querySelectorAll('#editor b, #editor strong').length,
    text: document.getElementById('editor').textContent,
  }));
  console.log(`  ESC-01: bolds=${result.bolds}, text="${result.text.trim()}"`);
  if (result.bolds > 0) console.log('  ⚠ DETECTED: escaped asterisks still triggered bold');
});

// ── ESC-02: \[ should not trigger link ──
evalTest('FI-ESC-02', 'Escaped bracket paste (\\[)', 'Formatting: Escapes', async ({ page, cap, rec }) => {
  const md = '\\[not a link\\](https://example.com)';
  rec(1, 'paste', 'escaped brackets');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => ({
    links: document.querySelectorAll('#editor a').length,
  }));
  console.log(`  ESC-02: links=${result.links}`);
  if (result.links > 0) console.log('  ⚠ DETECTED: escaped brackets still triggered link');
});

// ═══════════════════════════════════════════════════════════════
// COMBINED
// ═══════════════════════════════════════════════════════════════

evalTest('FI-BATCH2-COMBO', 'All batch 2 features combined', 'Formatting: Combined', async ({ page, cap, rec }) => {
  const md = [
    '# Document with _italic_ and __bold__',
    '',
    'Visit https://example.com for info.',
    '',
    '![photo](https://example.com/img.png)',
    '',
    'Use \\*escaped\\* asterisks here.',
    '',
    '[Click here](https://link.example.com) for more.',
  ].join('\n');

  rec(1, 'paste', 'combined batch 2');
  await page.evaluate((text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    document.getElementById('editor').dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    );
  }, md);
  await wait(300);
  await cap('after-paste');

  const result = await page.evaluate(() => ({
    headings: document.querySelectorAll('#editor h1').length,
    bolds: document.querySelectorAll('#editor b, #editor strong').length,
    italics: document.querySelectorAll('#editor i, #editor em').length,
    links: document.querySelectorAll('#editor a').length,
    images: document.querySelectorAll('#editor img').length,
  }));
  console.log(`  COMBO: h1=${result.headings} b=${result.bolds} i=${result.italics} a=${result.links} img=${result.images}`);
  if (result.bolds < 1) console.log('  ⚠ DETECTED: no underscore bold');
  if (result.italics < 1) console.log('  ⚠ DETECTED: no underscore italic');
  if (result.links < 2) console.log('  ⚠ DETECTED: expected 2+ links (autolink + explicit)');
  if (result.images < 1) console.log('  ⚠ DETECTED: no images');
});
