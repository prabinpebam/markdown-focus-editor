/**
 * Focus Mode Visual Accuracy Tests
 * 
 * Tests that the SVG focus mask correctly covers the current line's text
 * at all font sizes, including characters with ascenders (bdfhklt) and
 * descenders (gjpqy). Also tests headings and varying zoom levels.
 */
const { evalTest, wait } = require('./test-setup');
const path = require('path');
const fs = require('fs');

/**
 * Capture detailed focus mode geometry from the browser.
 * Returns the focus-line rect dimensions AND the actual text bounding box.
 */
const FOCUS_GEOMETRY_FN = `(function() {
  var focusLine = document.getElementById('focus-line');
  var editor = document.getElementById('editor');
  var wrapper = document.querySelector('.editor-wrapper');
  if (!focusLine || !editor || !wrapper) return null;

  var wrapperRect = wrapper.getBoundingClientRect();
  var focusY = parseFloat(focusLine.getAttribute('y') || '0');
  var focusH = parseFloat(focusLine.getAttribute('height') || '0');
  var focusW = parseFloat(focusLine.getAttribute('width') || '0');

  // Get the actual bounding box of text in the focused line
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return { focusY: focusY, focusH: focusH, focusW: focusW, textTop: 0, textBottom: 0, lineHeight: 0 };

  var range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  var caretRect = range.getClientRects()[0];
  if (!caretRect) return { focusY: focusY, focusH: focusH, focusW: focusW, textTop: 0, textBottom: 0, lineHeight: 0 };

  // Find the block element containing the caret
  var block = sel.anchorNode;
  while (block && block.parentNode !== editor) { block = block.parentNode; }
  if (!block) return { focusY: focusY, focusH: focusH, focusW: focusW, textTop: 0, textBottom: 0, lineHeight: 0 };

  // Sample ALL characters in the block to find the true visual extent
  var textTop = Infinity;
  var textBottom = -Infinity;
  var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  var textNode;
  while (textNode = walker.nextNode()) {
    var text = textNode.textContent;
    if (!text.trim()) continue;
    for (var i = 0; i < text.length; i++) {
      var r = document.createRange();
      r.setStart(textNode, i);
      r.setEnd(textNode, Math.min(i + 1, text.length));
      var rects = r.getClientRects();
      if (rects.length > 0) {
        var cr = rects[0];
        // Only include chars on the same visual line as the caret
        if (Math.abs(cr.top - caretRect.top) < cr.height) {
          if (cr.top < textTop) textTop = cr.top;
          if (cr.bottom > textBottom) textBottom = cr.bottom;
        }
      }
    }
  }

  var computedStyle = window.getComputedStyle(block);
  var fontSize = parseFloat(computedStyle.fontSize);
  var lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.5;

  // Convert focus mask coordinates to viewport coordinates for comparison
  var maskTop = focusY + wrapperRect.top - wrapper.scrollTop;
  var maskBottom = maskTop + focusH;

  return {
    fontSize: fontSize,
    lineHeight: lineHeight,
    focusY: focusY,
    focusH: focusH,
    focusW: focusW,
    maskTop: Math.round(maskTop * 100) / 100,
    maskBottom: Math.round(maskBottom * 100) / 100,
    textTop: Math.round(textTop * 100) / 100,
    textBottom: Math.round(textBottom * 100) / 100,
    textHeight: Math.round((textBottom - textTop) * 100) / 100,
    overflow: {
      topClipped: textTop < maskTop,
      bottomClipped: textBottom > maskBottom,
      topGap: Math.round((maskTop - textTop) * 100) / 100,
      bottomGap: Math.round((maskBottom - textBottom) * 100) / 100,
    }
  };
})()`;

// ── Test: Full alphabet at default font size ──
evalTest('FM-01', 'Focus mask covers full alphabet (default size)', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  await cap('initial');

  // Type text with ALL ascenders and descenders
  rec(1, 'type', 'Full alphabet with ascenders/descenders');
  await page.keyboard.type('abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  await wait(200);
  await cap('after-type');

  // Capture focus geometry
  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  // Take screenshot for visual verification
  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-01-default-size.png'), fullPage: true });

  // Log the geometry for analysis
  console.log('\n  FM-01 Geometry:', JSON.stringify(geo, null, 2));
});

// ── Test: Ascenders and descenders on separate line ──
evalTest('FM-02', 'Focus mask covers descenders (gjpqy)', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Line with descenders: gjpqy typography');
  await page.keyboard.type('Line with descenders: gjpqy typography');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-02-descenders.png'), fullPage: true });

  console.log('\n  FM-02 Geometry:', JSON.stringify(geo, null, 2));
  await cap('final');
});

// ── Test: Font size 8px (minimum) ──
evalTest('FM-03', 'Focus mask at min font size (8px)', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  // Set font to minimum
  await page.evaluate(() => document.documentElement.style.setProperty('--base-font', '8px'));
  await wait(200);

  rec(1, 'type', 'Tiny text gjpqy bdfhklt');
  await page.keyboard.type('Tiny text gjpqy bdfhklt');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-03-8px.png'), fullPage: true });

  console.log('\n  FM-03 Geometry (8px):', JSON.stringify(geo, null, 2));
  await cap('final');
});

// ── Test: Font size 24px ──
evalTest('FM-04', 'Focus mask at 24px font size', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  await page.evaluate(() => document.documentElement.style.setProperty('--base-font', '24px'));
  await wait(200);

  rec(1, 'type', 'Medium text gjpqy bdfhklt');
  await page.keyboard.type('Medium text gjpqy bdfhklt');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-04-24px.png'), fullPage: true });

  console.log('\n  FM-04 Geometry (24px):', JSON.stringify(geo, null, 2));
  await cap('final');
});

// ── Test: Font size 48px (maximum) ──
evalTest('FM-05', 'Focus mask at max font size (48px)', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  await page.evaluate(() => document.documentElement.style.setProperty('--base-font', '48px'));
  await wait(200);

  rec(1, 'type', 'Big gjpqy');
  await page.keyboard.type('Big gjpqy');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-05-48px.png'), fullPage: true });

  console.log('\n  FM-05 Geometry (48px):', JSON.stringify(geo, null, 2));
  await cap('final');
});

// ── Test: Heading (H1) focus mask ──
evalTest('FM-06', 'Focus mask on H1 heading', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  rec(1, 'type', '# Heading gjpqy');
  await page.keyboard.type('# Heading gjpqy');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-06-h1.png'), fullPage: true });

  console.log('\n  FM-06 Geometry (H1):', JSON.stringify(geo, null, 2));
  await cap('final');
});

// ── Test: H3 heading at different font size ──
evalTest('FM-07', 'Focus mask on H3 at 24px', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  await page.evaluate(() => document.documentElement.style.setProperty('--base-font', '24px'));
  await wait(200);

  rec(1, 'type', '### Subheading gjpqy');
  await page.keyboard.type('### Subheading gjpqy');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-07-h3-24px.png'), fullPage: true });

  console.log('\n  FM-07 Geometry (H3@24px):', JSON.stringify(geo, null, 2));
  await cap('final');
});

// ── Test: Multiple font sizes on same page ──
evalTest('FM-08', 'Focus mask accuracy across all sizes', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  const sizes = [8, 12, 16, 20, 24, 32, 48];
  const results = [];
  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });

  for (const size of sizes) {
    // Clear editor
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await wait(100);

    // Set font size
    await page.evaluate((s) => document.documentElement.style.setProperty('--base-font', s + 'px'), size);
    await wait(200);

    // Type text with ascenders/descenders
    await page.keyboard.type('Typography gjpqy bdfhklt ABCxyz');
    await wait(300);

    const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
    if (geo) {
      geo.requestedSize = size;
      results.push(geo);
    }

    await page.screenshot({ path: path.join(outputDir, `FM-08-${size}px.png`), fullPage: true });
  }

  // Log all results
  console.log('\n  FM-08 Size sweep results:');
  for (const r of results) {
    const clipped = r.overflow.topClipped || r.overflow.bottomClipped;
    console.log(`    ${r.requestedSize}px: fontSize=${r.fontSize} maskH=${r.focusH.toFixed(1)} textH=${r.textHeight.toFixed(1)} topGap=${r.overflow.topGap.toFixed(1)} bottomGap=${r.overflow.bottomGap.toFixed(1)} ${clipped ? '⚠ CLIPPED' : '✓ OK'}`);
  }

  rec(1, 'results', JSON.stringify(results));
  
  // Write results to a JSON file for analysis
  fs.writeFileSync(path.join(outputDir, 'FM-08-sweep-results.json'), JSON.stringify(results, null, 2));
  
  await cap('final');
});

// ── Test: Zoom levels (browser zoom simulation via viewport) ──
evalTest('FM-09', 'Focus mask at different viewport widths', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Text for viewport width test gjpqy bdfhklt');
  await page.keyboard.type('Text for viewport width test gjpqy bdfhklt');
  await wait(200);

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });

  const viewports = [
    { width: 600, height: 800 },
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await wait(300);

    // Click in the editor to re-trigger focus
    await page.click('#editor');
    await page.keyboard.press('End');
    await wait(200);

    const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
    rec(2, 'viewport', `${vp.width}x${vp.height}: maskW=${geo?.focusW} maskH=${geo?.focusH?.toFixed(1)}`);

    await page.screenshot({ path: path.join(outputDir, `FM-09-${vp.width}x${vp.height}.png`), fullPage: true });
  }

  await cap('final');
});

// ── Test: Focus on bold/italic text (may have different metrics) ──
evalTest('FM-10', 'Focus mask on styled text', 'Focus Mode Accuracy', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Normal then **bold gjpqy** then *italic gjpqy*');
  await page.keyboard.type('Normal then ');
  await page.keyboard.type('**bold gjpqy');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.type(' then ');
  await page.keyboard.type('*italic gjpqy');
  await wait(200);

  const geo = await page.evaluate(FOCUS_GEOMETRY_FN);
  rec(2, 'measure', JSON.stringify(geo));

  const outputDir = path.join(__dirname, '..', '..', 'test-results', 'focus-accuracy');
  fs.mkdirSync(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'FM-10-styled.png'), fullPage: true });

  console.log('\n  FM-10 Geometry (styled):', JSON.stringify(geo, null, 2));
  await cap('final');
});
