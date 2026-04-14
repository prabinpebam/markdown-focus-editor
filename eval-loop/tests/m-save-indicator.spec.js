/**
 * Category M: Save Indicator Animation — Eval loop for Ctrl+S save dot animation
 *
 * Observes:
 *  - No popup notification appears on Ctrl+S
 *  - The activator dot animation phases: expand, progress ring, green+checkmark, reset
 *  - Timing of the animation (~2s total lifecycle)
 */
const { evalTest, wait } = require('./test-setup');

/**
 * In-browser capture of the save indicator's visual state.
 * Returns dot dimensions, colors, SVG ring/checkmark state, and whether any popup exists.
 */
const SAVE_DOT_CAPTURE = `(() => {
  const dot = document.getElementById('toolbar-activator-dot');
  const ring = dot ? dot.querySelector('.save-progress-ring') : null;
  const bar = dot ? dot.querySelector('.save-progress-bar') : null;
  const checkmark = dot ? dot.querySelector('.save-checkmark') : null;

  const dotStyle = dot ? window.getComputedStyle(dot) : null;
  const ringStyle = ring ? window.getComputedStyle(ring) : null;
  const checkmarkStyle = checkmark ? window.getComputedStyle(checkmark) : null;

  // Check for any popup notification divs (the old showSaveNotification pattern)
  const popups = document.querySelectorAll('div[style*="position: fixed"][style*="background: #4CAF50"]');

  return {
    dot: {
      width: dotStyle ? dotStyle.width : null,
      height: dotStyle ? dotStyle.height : null,
      backgroundColor: dotStyle ? dotStyle.backgroundColor : null,
      borderColor: dotStyle ? dotStyle.borderColor : null,
      borderWidth: dotStyle ? dotStyle.borderWidth : null,
      opacity: dotStyle ? dotStyle.opacity : null,
    },
    ring: {
      opacity: ringStyle ? ringStyle.opacity : null,
    },
    progressBar: {
      strokeDashoffset: bar ? bar.getAttribute('stroke-dashoffset') : null,
      stroke: bar ? bar.getAttribute('stroke') : null,
      // Also check computed stroke for inline style overrides
      computedStroke: bar ? window.getComputedStyle(bar).stroke : null,
    },
    checkmark: {
      opacity: checkmarkStyle ? checkmarkStyle.opacity : null,
      stroke: checkmark ? checkmark.style.stroke : null,
    },
    popupCount: popups.length,
    saveToastVisible: (() => {
      const toast = document.getElementById('save-toast');
      if (!toast) return false;
      return toast.classList.contains('visible');
    })(),
  };
})()`;

// ── TF-M1: Save Animation Lifecycle ──
evalTest('TF-M1', 'Save Animation Lifecycle', 'M. Save Indicator', async ({ page, cap, rec }) => {
  // Wait for storage.loadSettings to create the default document
  await wait(500);

  // Type something so there's content to save
  await page.locator('#editor').click();
  await page.keyboard.type('Hello save test');
  await wait(300);

  // Handle any prompt dialogs (web mode may show Save As prompt if no doc)
  page.on('dialog', async dialog => {
    await dialog.accept('Test Document');
  });

  // Capture resting state
  rec(0, 'observe', 'resting dot state');
  await cap('initial');
  const resting = await page.evaluate(SAVE_DOT_CAPTURE);
  console.log('\n  [SAVE-EVAL] Resting state:', JSON.stringify(resting.dot));

  // Collect console logs for debugging
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  page.on('pageerror', err => consoleLogs.push('PAGE_ERROR: ' + err.message));

  // Phase 1: Press Ctrl+S — capture immediately after
  // First check if there's a valid document
  const preState = await page.evaluate(`(() => {
    const docId = localStorage.getItem('currentDocId');
    const docsRaw = localStorage.getItem('markdownFocusEditorDocs');
    const docs = docsRaw ? JSON.parse(docsRaw) : [];
    const doc = docs.find(d => d.id === docId);
    return { docId, docCount: docs.length, docFound: !!doc, toolbarDot: !!document.getElementById('toolbar-activator-dot') };
  })()`);
  console.log('  [SAVE-EVAL] Pre-save state:', JSON.stringify(preState));

  rec(1, 'press', 'Ctrl+S');
  await page.keyboard.press('Control+s');
  await wait(50);
  const phase1 = await page.evaluate(SAVE_DOT_CAPTURE);
  await cap('after-ctrl-s-50ms');
  console.log('  [SAVE-EVAL] Phase 1 (50ms): dot=', JSON.stringify(phase1.dot), 'ring=', JSON.stringify(phase1.ring));
  console.log('  [SAVE-EVAL] Phase 1 popups:', phase1.popupCount, 'toast:', phase1.saveToastVisible);

  // Phase 2: ~250ms — dot should be expanded, progress ring visible
  await wait(200);
  const phase2 = await page.evaluate(SAVE_DOT_CAPTURE);
  await cap('progress-ring-250ms');
  console.log('  [SAVE-EVAL] Phase 2 (250ms): dot=', JSON.stringify(phase2.dot), 'ring=', JSON.stringify(phase2.ring), 'bar=', JSON.stringify(phase2.progressBar));

  // Phase 3: ~650ms — progress should be completing, turning green
  await wait(400);
  const phase3 = await page.evaluate(SAVE_DOT_CAPTURE);
  await cap('green-phase-650ms');
  console.log('  [SAVE-EVAL] Phase 3 (650ms): dot=', JSON.stringify(phase3.dot), 'checkmark=', JSON.stringify(phase3.checkmark), 'bar=', JSON.stringify(phase3.progressBar));

  // Phase 4: ~1100ms — should be in hold state (green + checkmark)
  await wait(450);
  const phase4 = await page.evaluate(SAVE_DOT_CAPTURE);
  await cap('hold-phase-1100ms');
  console.log('  [SAVE-EVAL] Phase 4 (1100ms): dot=', JSON.stringify(phase4.dot), 'checkmark=', JSON.stringify(phase4.checkmark));

  // Phase 5: ~1800ms — should be resetting back to resting
  await wait(700);
  const phase5 = await page.evaluate(SAVE_DOT_CAPTURE);
  await cap('reset-phase-1800ms');
  console.log('  [SAVE-EVAL] Phase 5 (1800ms): dot=', JSON.stringify(phase5.dot), 'ring=', JSON.stringify(phase5.ring));

  // Phase 6: ~2200ms — should be fully back to resting state
  await wait(400);
  const phase6 = await page.evaluate(SAVE_DOT_CAPTURE);
  await cap('resting-restored-2200ms');
  console.log('  [SAVE-EVAL] Phase 6 (2200ms - final): dot=', JSON.stringify(phase6.dot), 'ring=', JSON.stringify(phase6.ring));
  console.log('  [SAVE-EVAL] Final popups:', phase6.popupCount, 'toast:', phase6.saveToastVisible);
  console.log('  [SAVE-EVAL] Console logs:', consoleLogs.filter(l => l.includes('Toolbar') || l.includes('PAGE_ERROR') || l.includes('Error')).join(' | '));

  // ── Evaluation ──
  const issues = [];

  // E1: No popup should appear at any phase
  if (phase1.popupCount > 0) issues.push('CRITICAL: Popup notification appeared on Ctrl+S');
  if (phase6.popupCount > 0) issues.push('CRITICAL: Popup notification still present after animation');

  // E2: Dot should expand from resting 10px
  const restingW = parseInt(resting.dot.width);
  if (restingW !== 10) issues.push(`WARNING: Resting dot width is ${restingW}px, expected 10px`);

  // E3: Dot should be expanded at 250ms
  const expandedW = parseInt(phase2.dot.width);
  if (expandedW < 20) issues.push(`WARNING: Dot not expanded at 250ms (width: ${expandedW}px)`);

  // E4: Progress ring should be visible at 250ms
  const ringOpacity = parseFloat(phase2.ring.opacity);
  if (ringOpacity < 0.5) issues.push(`WARNING: Ring not visible at 250ms (opacity: ${ringOpacity})`);

  // E5: Progress bar should be animating (dashoffset decreasing)
  const dashOffset250 = parseFloat(phase2.progressBar.strokeDashoffset);
  if (dashOffset250 >= 97) issues.push(`WARNING: Progress bar not animating at 250ms (dashoffset: ${dashOffset250})`);

  // E6: Checkmark should be visible at 650ms+
  const checkOpacity = parseFloat(phase3.checkmark.opacity);
  if (checkOpacity < 0.5) issues.push(`WARNING: Checkmark not visible at 650ms (opacity: ${checkOpacity})`);

  // E7: Dot should return to resting state
  const finalW = parseInt(phase6.dot.width);
  if (finalW !== 10) issues.push(`WARNING: Dot did not return to resting (width: ${finalW}px)`);

  // E8: Fill should be red again at rest
  const finalBg = phase6.dot.backgroundColor;
  if (finalBg && !finalBg.includes('255') && finalBg !== 'red') {
    issues.push(`INFO: Final dot backgroundColor is ${finalBg}, expected red`);
  }

  // Report
  if (issues.length === 0) {
    console.log('  [SAVE-EVAL] ✅ VERDICT: CLEAN — All animation phases observed correctly');
  } else {
    console.log('  [SAVE-EVAL] ⚠ VERDICT: ISSUES FOUND');
    issues.forEach(i => console.log(`    ${i}`));
  }
});

// ── TF-M2: No Notification on Auto-Save ──
evalTest('TF-M2', 'No Notification on Auto-Save', 'M. Save Indicator', async ({ page, cap, rec }) => {
  await page.locator('#editor').click();
  await page.keyboard.type('Auto save content');
  await wait(300);
  await cap('initial');

  // Trigger auto-save by typing (editor.js saves on input)
  rec(1, 'type', 'trigger auto save');
  await page.keyboard.type(' more text');
  await wait(1000);
  await cap('after-auto-save');

  const state = await page.evaluate(SAVE_DOT_CAPTURE);
  console.log('\n  [SAVE-EVAL] After auto-save: popups=', state.popupCount, 'toast=', state.saveToastVisible);

  // Dot should still be in resting state (no animation triggered)
  const dotW = parseInt(state.dot.width);
  console.log('  [SAVE-EVAL] Dot width after auto-save:', dotW, '(expected 10)');

  if (state.popupCount > 0) {
    console.log('  [SAVE-EVAL] ⚠ CRITICAL: Popup appeared during auto-save');
  } else {
    console.log('  [SAVE-EVAL] ✅ No popup on auto-save');
  }

  if (dotW === 10) {
    console.log('  [SAVE-EVAL] ✅ Dot remained at resting state during auto-save');
  } else {
    console.log('  [SAVE-EVAL] ⚠ Dot changed size during auto-save:', dotW);
  }
});
