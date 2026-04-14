/**
 * Electron Eval Loop — Save Indicator Animation
 *
 * Launches the real Electron app via Playwright's _electron API,
 * runs the save animation eval, and reports results.
 *
 * Usage: node eval-loop/tests/electron-save-eval.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const ELECTRON_MAIN = path.join(ROOT, 'electron', 'main.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'electron-eval');

// Ensure output dir
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const SAVE_DOT_CAPTURE = `(() => {
  const dot = document.getElementById('toolbar-activator-dot');
  const ring = dot ? dot.querySelector('.save-progress-ring') : null;
  const bar = dot ? dot.querySelector('.save-progress-bar') : null;
  const checkmark = dot ? dot.querySelector('.save-checkmark') : null;
  const dotStyle = dot ? window.getComputedStyle(dot) : null;
  const ringStyle = ring ? window.getComputedStyle(ring) : null;
  const checkmarkStyle = checkmark ? window.getComputedStyle(checkmark) : null;
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
    ring: { opacity: ringStyle ? ringStyle.opacity : null },
    progressBar: {
      strokeDashoffset: bar ? bar.getAttribute('stroke-dashoffset') : null,
      stroke: bar ? bar.getAttribute('stroke') : null,
      computedStroke: bar ? window.getComputedStyle(bar).stroke : null,
    },
    checkmark: {
      opacity: checkmarkStyle ? checkmarkStyle.opacity : null,
      stroke: checkmark ? checkmark.style.stroke : null,
    },
    popupCount: popups.length,
    isElectron: !!window.electronAPI,
  };
})()`;

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('\n══════════════════════════════════════════════');
  console.log('  ELECTRON EVAL LOOP — Save Indicator Animation');
  console.log('══════════════════════════════════════════════\n');

  // Launch Electron app
  console.log('[LAUNCH] Starting Electron app...');
  const electronApp = await electron.launch({
    args: [ELECTRON_MAIN],
    env: {
      ...process.env,
      // Use a temp data dir to avoid touching real settings
      PORTABLE_EXECUTABLE_DIR: path.join(OUTPUT_DIR, 'temp-data'),
    },
  });

  // Get the first window
  const window = await electronApp.firstWindow();
  console.log('[LAUNCH] Electron window opened');

  // Wait for editor to be ready
  await window.waitForSelector('#editor', { timeout: 15_000 });
  console.log('[LAUNCH] Editor element found');
  await wait(1000); // Let all modules fully initialize

  // Verify we're running in Electron
  const isElectron = await window.evaluate('!!window.electronAPI');
  console.log(`[LAUNCH] Running in Electron: ${isElectron}`);

  if (!isElectron) {
    console.error('[ERROR] Not running in Electron mode! Aborting.');
    await electronApp.close();
    process.exit(1);
  }

  // Take initial screenshot
  await window.screenshot({ path: path.join(OUTPUT_DIR, '01-initial.png') });
  console.log('[SCREENSHOT] 01-initial.png');

  // ═══════════════════════════════════════════
  // TF-M1: Save Animation Lifecycle (Electron)
  // ═══════════════════════════════════════════
  console.log('\n── TF-M1: Save Animation Lifecycle (Electron) ──\n');

  // Create a temp file so Ctrl+S has a path (avoids Save As dialog)
  const tempFile = path.join(OUTPUT_DIR, 'temp-data', 'eval-test.md');
  const tempDir = path.dirname(tempFile);
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(tempFile, '# Eval test\n', 'utf8');

  // Set the file path in Electron's main process
  await electronApp.evaluate(async (electronModule, filePath) => {
    const { ipcMain } = electronModule;
    // Override file:getPath to return our test file path
    ipcMain.removeHandler('file:getPath');
    ipcMain.handle('file:getPath', async () => filePath);
  }, tempFile);
  console.log('[SETUP] Set file path to:', tempFile);

  // Click editor and type content
  await window.click('#editor');
  await window.keyboard.type('Hello from Electron eval loop');
  await wait(300);

  // Capture resting state
  const resting = await window.evaluate(SAVE_DOT_CAPTURE);
  console.log('[RESTING] dot:', JSON.stringify(resting.dot));
  await window.screenshot({ path: path.join(OUTPUT_DIR, '02-resting.png') });

  // Collect console output
  const logs = [];
  window.on('console', msg => logs.push(msg.text()));

  // ── Press Ctrl+S ──
  console.log('\n[ACTION] Pressing Ctrl+S...');
  await window.keyboard.press('Control+s');

  // Phase 1: 50ms — animation should be starting
  await wait(50);
  const phase1 = await window.evaluate(SAVE_DOT_CAPTURE);
  await window.screenshot({ path: path.join(OUTPUT_DIR, '03-phase1-50ms.png') });
  console.log('[PHASE 1 - 50ms]  dot:', JSON.stringify(phase1.dot));
  console.log('                  ring:', JSON.stringify(phase1.ring));

  // Phase 2: 250ms — dot expanded, progress ring visible
  await wait(200);
  const phase2 = await window.evaluate(SAVE_DOT_CAPTURE);
  await window.screenshot({ path: path.join(OUTPUT_DIR, '04-phase2-250ms.png') });
  console.log('[PHASE 2 - 250ms] dot:', JSON.stringify(phase2.dot));
  console.log('                  ring:', JSON.stringify(phase2.ring));
  console.log('                  bar:', JSON.stringify(phase2.progressBar));

  // Phase 3: 650ms — green phase, checkmark
  await wait(400);
  const phase3 = await window.evaluate(SAVE_DOT_CAPTURE);
  await window.screenshot({ path: path.join(OUTPUT_DIR, '05-phase3-650ms.png') });
  console.log('[PHASE 3 - 650ms] dot:', JSON.stringify(phase3.dot));
  console.log('                  checkmark:', JSON.stringify(phase3.checkmark));
  console.log('                  bar:', JSON.stringify(phase3.progressBar));

  // Phase 4: 1100ms — hold state
  await wait(450);
  const phase4 = await window.evaluate(SAVE_DOT_CAPTURE);
  await window.screenshot({ path: path.join(OUTPUT_DIR, '06-phase4-1100ms.png') });
  console.log('[PHASE 4 - 1100ms] dot:', JSON.stringify(phase4.dot));
  console.log('                   checkmark:', JSON.stringify(phase4.checkmark));

  // Phase 5: 1800ms — resetting
  await wait(700);
  const phase5 = await window.evaluate(SAVE_DOT_CAPTURE);
  await window.screenshot({ path: path.join(OUTPUT_DIR, '07-phase5-1800ms.png') });
  console.log('[PHASE 5 - 1800ms] dot:', JSON.stringify(phase5.dot));
  console.log('                   ring:', JSON.stringify(phase5.ring));

  // Phase 6: 2200ms — fully resting
  await wait(400);
  const phase6 = await window.evaluate(SAVE_DOT_CAPTURE);
  await window.screenshot({ path: path.join(OUTPUT_DIR, '08-phase6-final.png') });
  console.log('[PHASE 6 - 2200ms] dot:', JSON.stringify(phase6.dot));
  console.log('                   ring:', JSON.stringify(phase6.ring));

  // ═══════════════════════════════════════
  //  EVALUATION
  // ═══════════════════════════════════════
  console.log('\n── EVALUATION ──\n');

  const issues = [];

  // E0: Must be running in Electron
  if (!resting.isElectron) issues.push('CRITICAL: Not running in Electron mode');

  // E1: No popup at any phase
  if (phase1.popupCount > 0) issues.push('CRITICAL: Popup appeared on Ctrl+S');
  if (phase6.popupCount > 0) issues.push('CRITICAL: Popup still present after animation');

  // E2: Resting dot = 10px
  const restW = parseInt(resting.dot.width);
  if (restW !== 10) issues.push(`WARNING: Resting dot width is ${restW}px, expected 10px`);

  // E3: Dot expanded at 250ms
  const expW = parseInt(phase2.dot.width);
  if (expW < 20) issues.push(`WARNING: Dot not expanded at 250ms (width: ${expW}px)`);

  // E4: Ring visible at 250ms
  const ringOp = parseFloat(phase2.ring.opacity);
  if (ringOp < 0.5) issues.push(`WARNING: Ring not visible at 250ms (opacity: ${ringOp})`);

  // E5: Progress bar animating
  const dashOff = parseFloat(phase2.progressBar.strokeDashoffset);
  if (dashOff >= 97) issues.push(`WARNING: Progress bar not animating at 250ms (dashoffset: ${dashOff})`);

  // E6: Checkmark visible at 650ms
  const chkOp = parseFloat(phase3.checkmark.opacity);
  if (chkOp < 0.5) issues.push(`WARNING: Checkmark not visible at 650ms (opacity: ${chkOp})`);

  // E7: Dot returns to 10px
  const finW = parseInt(phase6.dot.width);
  if (finW !== 10) issues.push(`WARNING: Dot did not return to resting (width: ${finW}px)`);

  // E8: Fill red again
  const finBg = phase6.dot.backgroundColor;
  if (finBg && !finBg.includes('255, 0, 0') && finBg !== 'red') {
    issues.push(`INFO: Final dot bg is ${finBg}, expected red`);
  }

  // Report
  if (issues.length === 0) {
    console.log('✅ VERDICT: CLEAN — All animation phases observed correctly in Electron');
  } else {
    console.log('⚠  VERDICT: ISSUES FOUND');
    issues.forEach(i => console.log(`  ${i}`));
  }

  // Print relevant console logs
  const relevantLogs = logs.filter(l =>
    l.includes('Toolbar') || l.includes('Error') || l.includes('Save') || l.includes('save')
  );
  if (relevantLogs.length > 0) {
    console.log('\n── Console Logs ──');
    relevantLogs.forEach(l => console.log(`  ${l}`));
  }

  console.log('\n[SCREENSHOTS] Saved to:', OUTPUT_DIR);

  // Cleanup
  await electronApp.close();
  console.log('[DONE] Electron app closed\n');

  process.exit(issues.some(i => i.startsWith('CRITICAL')) ? 1 : 0);
})();
