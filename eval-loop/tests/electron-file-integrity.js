/**
 * Electron Auto-Save & File Integrity Eval Loop
 *
 * Tests the full save/open/reload pipeline in the actual Electron app:
 *  1. Type content → auto-save fires → no "modified externally" alert
 *  2. Saved file content matches editor content (roundtrip fidelity)
 *  3. Close and reopen → content preserved exactly
 *  4. Multiple edit cycles don't corrupt content
 *  5. Nested lists survive save/reload
 *
 * Usage: node eval-loop/tests/electron-file-integrity.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const ELECTRON_MAIN = path.join(ROOT, 'electron', 'main.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'electron-file-integrity');
const TEMP_DATA = path.join(OUTPUT_DIR, 'app-data');
const TEST_FILE = path.join(OUTPUT_DIR, 'test-document.md');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DATA)) fs.mkdirSync(TEMP_DATA, { recursive: true });

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function cleanDir(dir) {
  try {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  } catch(e) { /* dir may be locked by previous instance */ }
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Capture notification bar state
const NOTIFICATION_CAPTURE = `(() => {
  const bar = document.getElementById('notification-bar');
  const text = document.getElementById('notification-text');
  if (!bar) return { visible: false, text: '' };
  const style = window.getComputedStyle(bar);
  return {
    visible: style.display !== 'none' && bar.style.display !== 'none',
    text: text ? text.textContent : '',
  };
})()`;

// Capture editor content as markdown via the app's own converter
const GET_MARKDOWN = `(async () => {
  const editor = document.getElementById('editor');
  // Access markdownConverter through the global module scope
  const m = await import('./js/modules/markdownConverter.js');
  return m.default.editorHtmlToMarkdown(editor.innerHTML);
})()`;

// Get editor innerHTML
const GET_HTML = `document.getElementById('editor').innerHTML`;

async function launchApp(testFile) {
  // Write a known test file if provided
  if (testFile) {
    fs.writeFileSync(TEST_FILE, testFile, 'utf8');
  }

  const app = await electron.launch({
    args: [ELECTRON_MAIN, TEST_FILE],
    env: { ...process.env, PORTABLE_EXECUTABLE_DIR: TEMP_DATA },
  });

  const win = await app.firstWindow();
  await win.waitForSelector('#editor', { timeout: 15000 });
  await wait(1500); // Let all modules initialize + file open

  // Set up file path for auto-save
  await app.evaluate(async (electronModule, filePath) => {
    const { ipcMain } = electronModule;
    ipcMain.removeHandler('file:getPath');
    ipcMain.handle('file:getPath', async () => filePath);
  }, TEST_FILE);

  return { app, win };
}

async function runTest(name, fn) {
  console.log(`\n── ${name} ──`);
  try {
    const issues = await fn();
    if (issues.length === 0) {
      console.log(`  ✅ PASS`);
    } else {
      issues.forEach(i => console.log(`  ⚠ ${i}`));
    }
    return issues;
  } catch (e) {
    console.log(`  ❌ ERROR: ${e.message}`);
    return [`ERROR: ${e.message}`];
  }
}

(async () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ELECTRON FILE INTEGRITY EVAL LOOP');
  console.log('══════════════════════════════════════════════════');

  const allIssues = [];

  // ═══════════════════════════════════════════════
  // TEST 1: Auto-save does NOT trigger external modification alert
  // ═══════════════════════════════════════════════
  const t1Issues = await runTest('T1: Auto-save no false alert', async () => {
    const issues = [];

    const initialContent = '# Test Document\n\nInitial content here.';
    const { app, win } = await launchApp(initialContent);

    // Check no notification initially
    const before = await win.evaluate(NOTIFICATION_CAPTURE);
    if (before.visible) {
      issues.push('Notification visible before typing: "' + before.text + '"');
    }

    // Type content to trigger auto-save
    await win.click('#editor');
    await win.keyboard.press('End');
    await win.keyboard.press('Enter');
    await win.keyboard.type('New line added by auto-save test.');
    console.log('  [T1] Typed content, waiting for auto-save (2s)...');

    // Wait for auto-save to fire (500ms debounce + write time + watcher restart)
    await wait(2000);

    // Check notification state
    const after = await win.evaluate(NOTIFICATION_CAPTURE);
    if (after.visible && after.text.includes('modified externally')) {
      issues.push('FALSE ALERT: "' + after.text + '" appeared after auto-save');
    }
    console.log('  [T1] Notification after auto-save: visible=' + after.visible + ' text="' + after.text + '"');

    // Wait longer and check again (delayed fs.watch events on Windows)
    await wait(3000);
    const later = await win.evaluate(NOTIFICATION_CAPTURE);
    if (later.visible && later.text.includes('modified externally')) {
      issues.push('DELAYED FALSE ALERT: "' + later.text + '" appeared 5s after typing');
    }
    console.log('  [T1] Notification after 5s: visible=' + later.visible);

    await win.screenshot({ path: path.join(OUTPUT_DIR, 't1-after-autosave.png') });
    await app.close();
    await wait(1000);
    return issues;
  });
  allIssues.push(...t1Issues);

  // ═══════════════════════════════════════════════
  // TEST 2: Saved file matches editor content (roundtrip)
  // ═══════════════════════════════════════════════
  const t2Issues = await runTest('T2: Saved file matches editor', async () => {
    const issues = [];

    const initialContent = '# Roundtrip Test\n\nParagraph one.\n\nParagraph two.\n\n- List item A\n- List item B\n  - Nested item\n\nFinal paragraph.';
    const { app, win } = await launchApp(initialContent);

    // Trigger a save via Ctrl+S
    await win.click('#editor');
    await win.keyboard.press('Control+s');
    await wait(1000);

    // Read the saved file
    const savedContent = fs.readFileSync(TEST_FILE, 'utf8').trim();
    console.log('  [T2] Saved file (' + savedContent.length + ' chars):');
    console.log('  ' + JSON.stringify(savedContent).substring(0, 200));

    // Get editor markdown
    const editorMd = await win.evaluate(GET_MARKDOWN);
    console.log('  [T2] Editor MD (' + editorMd.length + ' chars):');
    console.log('  ' + JSON.stringify(editorMd).substring(0, 200));

    if (savedContent !== editorMd) {
      issues.push('File content does NOT match editor markdown');
      const savedLines = savedContent.split('\n');
      const editorLines = editorMd.split('\n');
      for (let i = 0; i < Math.max(savedLines.length, editorLines.length); i++) {
        if (savedLines[i] !== editorLines[i]) {
          issues.push('  Line ' + i + ': file="' + (savedLines[i] || '').substring(0, 60) + '" editor="' + (editorLines[i] || '').substring(0, 60) + '"');
        }
      }
    }

    // Store saved content for reopen test
    const savedForReopen = savedContent;
    await app.close();
    await wait(1000);

    // Reopen the saved file in a new instance
    const { app: app2, win: win2 } = await launchApp(null); // reuses TEST_FILE
    const reloadedMd = await win2.evaluate(GET_MARKDOWN);
    console.log('  [T2] Reloaded MD (' + reloadedMd.length + ' chars):');
    console.log('  ' + JSON.stringify(reloadedMd).substring(0, 200));

    if (savedForReopen !== reloadedMd.trim()) {
      issues.push('Reloaded content does NOT match saved file');
      const savedLines = savedForReopen.split('\n');
      const reloadLines = reloadedMd.split('\n');
      if (savedLines.length !== reloadLines.length) {
        issues.push('  Line count: saved=' + savedLines.length + ' reloaded=' + reloadLines.length);
      }
      for (let i = 0; i < Math.max(savedLines.length, reloadLines.length); i++) {
        if (savedLines[i] !== reloadLines[i]) {
          issues.push('  Line ' + i + ': "' + (savedLines[i] || '').substring(0, 60) + '" -> "' + (reloadLines[i] || '').substring(0, 60) + '"');
        }
      }
    }

    await app2.close();
    await wait(1000);
    return issues;
  });
  allIssues.push(...t2Issues);

  // ═══════════════════════════════════════════════
  // TEST 3: Multiple save cycles don't corrupt content
  // ═══════════════════════════════════════════════
  const t3Issues = await runTest('T3: Multiple save cycles stable', async () => {
    const issues = [];

    const content = '# Multi-Save Test\n\nContent that should not change.\n\n- Item 1\n  - Sub item\n- Item 2';
    const { app, win } = await launchApp(content);

    // Save 3 times without changing content
    let baseline = null;
    for (let cycle = 1; cycle <= 3; cycle++) {
      await win.click('#editor');
      await win.keyboard.press('Control+s');
      await wait(1000);
      const fileContent = fs.readFileSync(TEST_FILE, 'utf8').trim();
      console.log('  [T3] Cycle ' + cycle + ': ' + fileContent.length + ' chars');

      if (cycle === 1) {
        baseline = fileContent;
      } else if (fileContent !== baseline) {
        issues.push('Cycle ' + cycle + ': content changed! Baseline=' + baseline.length + ' now=' + fileContent.length);
        const bLines = baseline.split('\n');
        const cLines = fileContent.split('\n');
        for (let i = 0; i < Math.max(bLines.length, cLines.length); i++) {
          if (bLines[i] !== cLines[i]) {
            issues.push('  Line ' + i + ': "' + (bLines[i] || '') + '" -> "' + (cLines[i] || '') + '"');
            if (issues.length > 10) break;
          }
        }
      }

      // Check no false alert
      const notif = await win.evaluate(NOTIFICATION_CAPTURE);
      if (notif.visible && notif.text.includes('modified externally')) {
        issues.push('Cycle ' + cycle + ': false "modified externally" alert');
      }
    }

    await app.close();
    await wait(1000);
    return issues;
  });
  allIssues.push(...t3Issues);

  // ═══════════════════════════════════════════════
  // TEST 4: Rapid typing + auto-save stability
  // ═══════════════════════════════════════════════
  const t4Issues = await runTest('T4: Rapid typing + auto-save stability', async () => {
    const issues = [];

    const content = '# Typing Test\n\nStart here.';
    const { app, win } = await launchApp(content);

    // Simulate typing with pauses that trigger multiple auto-saves
    await win.click('#editor');
    await win.keyboard.press('End');

    for (let burst = 1; burst <= 3; burst++) {
      await win.keyboard.press('Enter');
      await win.keyboard.type('Burst ' + burst + ' of typing content.', { delay: 30 });
      console.log('  [T4] Typed burst ' + burst + ', waiting 1.5s for auto-save...');
      await wait(1500);

      const notif = await win.evaluate(NOTIFICATION_CAPTURE);
      if (notif.visible && notif.text.includes('modified externally')) {
        issues.push('Burst ' + burst + ': false alert appeared');
      }
    }

    // Final check
    await wait(2000);
    const finalNotif = await win.evaluate(NOTIFICATION_CAPTURE);
    if (finalNotif.visible && finalNotif.text.includes('modified externally')) {
      issues.push('Final: false alert still visible');
    }

    // Verify file content matches editor
    const fileMd = fs.readFileSync(TEST_FILE, 'utf8').trim();
    const editorMd = (await win.evaluate(GET_MARKDOWN)).trim();
    if (fileMd !== editorMd) {
      issues.push('File content diverged from editor after rapid typing');
      issues.push('  File: ' + fileMd.length + ' chars, Editor: ' + editorMd.length + ' chars');
    }

    console.log('  [T4] Final notification: visible=' + finalNotif.visible);
    console.log('  [T4] File matches editor: ' + (fileMd === editorMd));

    await win.screenshot({ path: path.join(OUTPUT_DIR, 't4-after-typing.png') });
    await app.close();
    await wait(1000);
    return issues;
  });
  allIssues.push(...t4Issues);

  // ═══════════════════════════════════════════════
  // TEST 5: Nested list file roundtrip
  // ═══════════════════════════════════════════════
  const t5Issues = await runTest('T5: Nested list file roundtrip', async () => {
    const issues = [];

    const content = '# Lists\n\n- Item 1\n  - Sub A\n    - Deep nested\n  - Sub B\n- Item 2\n\n1. First\n2. Second';
    const { app, win } = await launchApp(content);

    // Save
    await win.click('#editor');
    await win.keyboard.press('Control+s');
    await wait(1000);

    const saved1 = fs.readFileSync(TEST_FILE, 'utf8').trim();
    console.log('  [T5] First save:\n' + saved1.split('\n').map(l => '    ' + l).join('\n'));

    await app.close();
    await wait(1000);

    // Reopen
    const { app: app2, win: win2 } = await launchApp(null);

    // Save again
    await win2.click('#editor');
    await win2.keyboard.press('Control+s');
    await wait(1000);

    const saved2 = fs.readFileSync(TEST_FILE, 'utf8').trim();
    console.log('  [T5] Second save:\n' + saved2.split('\n').map(l => '    ' + l).join('\n'));

    if (saved1 !== saved2) {
      issues.push('Content changed after reopen+save!');
      issues.push('  First: ' + saved1.length + ' chars, Second: ' + saved2.length + ' chars');
      const l1 = saved1.split('\n');
      const l2 = saved2.split('\n');
      for (let i = 0; i < Math.max(l1.length, l2.length); i++) {
        if (l1[i] !== l2[i]) {
          issues.push('  Line ' + i + ': "' + (l1[i] || '') + '" -> "' + (l2[i] || '') + '"');
        }
      }
    }

    // Check nested items are preserved
    if (!saved2.includes('  - Sub A')) issues.push('Lost nested item "Sub A"');
    if (!saved2.includes('    - Deep nested')) issues.push('Lost deep nested item');
    if (!saved2.includes('  - Sub B')) issues.push('Lost nested item "Sub B"');

    await app2.close();
    await wait(1000);
    return issues;
  });
  allIssues.push(...t5Issues);

  // ═══════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════════════════════\n');

  const criticals = allIssues.filter(i => !i.startsWith('  '));
  if (criticals.length === 0) {
    console.log('  ✅ ALL TESTS PASSED\n');
  } else {
    console.log('  ⚠ ' + criticals.length + ' ISSUES FOUND:');
    criticals.forEach(i => console.log('    ' + i));
    console.log('');
  }

  console.log('  Screenshots: ' + OUTPUT_DIR + '\n');

  // Cleanup
  try { fs.unlinkSync(path.join(OUTPUT_DIR, 't3-baseline.md')); } catch(e) {}

  process.exit(criticals.length > 0 ? 1 : 0);
})();
