/**
 * Electron File Integrity Eval Loop
 *
 * Follows the eval protocol: OBSERVE → RECORD → EVALUATE → IDENTIFY GAPS
 *
 * Launches the real Electron app, performs user actions (type, save, reopen),
 * captures agnostic snapshots at each step, then evaluates the recorded
 * timeline against user expectations.
 *
 * Usage: node eval-loop/tests/electron-file-eval.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const ELECTRON_MAIN = path.join(ROOT, 'electron', 'main.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'electron-eval');
const TEMP_DATA = path.join(OUTPUT_DIR, 'app-data');
const TEST_FILE = path.join(OUTPUT_DIR, 'eval-document.md');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DATA)) fs.mkdirSync(TEMP_DATA, { recursive: true });

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Agnostic snapshot: captures everything observable without asserting anything ──
const SNAPSHOT_FN = `(() => {
  var editor = document.getElementById('editor');
  var notifBar = document.getElementById('notification-bar');
  var notifText = document.getElementById('notification-text');
  var titleText = document.getElementById('title-text');
  var titleBar = document.getElementById('title-bar');
  var unsavedDot = document.getElementById('title-unsaved-dot');

  // Editor content
  var editorHTML = editor ? editor.innerHTML : '';
  var editorText = editor ? editor.textContent : '';
  var blockCount = editor ? editor.children.length : 0;
  var blocks = [];
  if (editor) {
    for (var i = 0; i < editor.children.length; i++) {
      var el = editor.children[i];
      blocks.push({
        tag: el.tagName ? el.tagName.toLowerCase() : 'unknown',
        text: (el.textContent || '').substring(0, 200),
        isEmpty: (el.textContent || '').replace(/\\u200B/g, '').trim().length === 0,
        hasBr: !!el.querySelector('br'),
        childCount: el.children.length
      });
    }
  }

  // Notification bar
  var notifVisible = false;
  var notifMessage = '';
  if (notifBar) {
    var ns = window.getComputedStyle(notifBar);
    notifVisible = notifBar.style.display !== 'none' && ns.display !== 'none';
    notifMessage = notifText ? notifText.textContent : '';
  }

  // Title bar
  var titleVisible = titleBar ? titleBar.style.display !== 'none' : false;
  var titleFilename = titleText ? titleText.textContent : '';
  var isUnsaved = unsavedDot ? !unsavedDot.classList.contains('hidden') : false;

  // Caret
  var hasFocus = document.activeElement === editor;
  var caretBlock = null;
  try {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor) {
      var node = sel.anchorNode;
      while (node && node.parentNode !== editor) node = node.parentNode;
      if (node && node.parentNode === editor) {
        caretBlock = [].indexOf.call(editor.children, node);
      }
    }
  } catch(e) {}

  return {
    timestamp: Date.now(),
    editor: {
      html: editorHTML,
      textLength: editorText.length,
      blockCount: blockCount,
      blocks: blocks,
      hasFocus: hasFocus,
      caretBlock: caretBlock
    },
    notification: {
      visible: notifVisible,
      message: notifMessage
    },
    titleBar: {
      visible: titleVisible,
      filename: titleFilename,
      unsaved: isUnsaved
    }
  };
})()`;

// ── Timeline management ──
function createTimeline(scenarioId, title) {
  return {
    scenario: scenarioId,
    title: title,
    startTime: Date.now(),
    frames: [],
    fileSnapshots: [],
    actions: [],
    evaluation: null
  };
}

async function snap(win, timeline, trigger) {
  const frame = await win.evaluate(SNAPSHOT_FN);
  frame.trigger = trigger;
  frame.frameId = timeline.frames.length;
  frame.elapsedMs = Date.now() - timeline.startTime;
  timeline.frames.push(frame);
  return frame;
}

function snapFile(timeline, label) {
  const exists = fs.existsSync(TEST_FILE);
  const content = exists ? fs.readFileSync(TEST_FILE, 'utf8') : null;
  const entry = {
    label: label,
    exists: exists,
    content: content,
    length: content ? content.length : 0,
    lineCount: content ? content.split('\n').length : 0,
    elapsedMs: Date.now() - timeline.startTime
  };
  timeline.fileSnapshots.push(entry);
  return entry;
}

function act(timeline, action, detail) {
  timeline.actions.push({
    action: action,
    detail: detail,
    atMs: Date.now() - timeline.startTime
  });
}

async function launchApp(fileContent) {
  if (fileContent !== null && fileContent !== undefined) {
    fs.writeFileSync(TEST_FILE, fileContent, 'utf8');
  }
  const app = await electron.launch({
    args: [ELECTRON_MAIN, TEST_FILE],
    env: { ...process.env, PORTABLE_EXECUTABLE_DIR: TEMP_DATA },
  });
  const win = await app.firstWindow();
  await win.waitForSelector('#editor', { timeout: 15000 });
  await wait(1500);

  // Set file path for save operations
  await app.evaluate(async (electronModule, filePath) => {
    const { ipcMain } = electronModule;
    ipcMain.removeHandler('file:getPath');
    ipcMain.handle('file:getPath', async () => filePath);
  }, TEST_FILE);

  return { app, win };
}

// ── EVALUATION FUNCTIONS (run AFTER all observation is complete) ──

function evaluateTimeline(timeline) {
  const anomalies = [];

  // Check every frame for notification bar showing "modified externally"
  for (const frame of timeline.frames) {
    if (frame.notification.visible && frame.notification.message.includes('modified externally')) {
      anomalies.push({
        severity: 'critical',
        code: 'FALSE_EXTERNAL_MODIFICATION_ALERT',
        message: 'Notification "' + frame.notification.message + '" at frame ' + frame.frameId + ' (' + frame.trigger + ', +' + frame.elapsedMs + 'ms)',
        frameId: frame.frameId
      });
    }
  }

  // Check file content stability across consecutive save snapshots
  // Only flag if no user action (type, press) occurred between them
  const saveSnapshots = timeline.fileSnapshots.filter(s => s.label.startsWith('save'));
  for (let i = 1; i < saveSnapshots.length; i++) {
    const prev = saveSnapshots[i - 1];
    const curr = saveSnapshots[i];
    // Check if any user action occurred between these snapshots' timestamps
    const actionBetween = timeline.actions.some(a =>
      (a.action === 'type' || a.action === 'press') && a.atMs >= prev.elapsedMs && a.atMs <= curr.elapsedMs
    );
    // Also check if any action occurred up to 3s before the current snapshot
    // (auto-save has a 500ms debounce, so typing 2.5s before a snapshot can still cause a save)
    const recentAction = timeline.actions.some(a =>
      (a.action === 'type' || a.action === 'press') && a.atMs > prev.elapsedMs && a.atMs < curr.elapsedMs + 3000
    );
    if (!actionBetween && !recentAction && curr.content !== prev.content) {
      anomalies.push({
        severity: 'critical',
        code: 'FILE_CONTENT_DRIFT',
        message: 'File changed between "' + prev.label + '" (' + prev.length + ' chars) and "' + curr.label + '" (' + curr.length + ' chars) with no user edits',
        detail: diffLines(prev.content, curr.content)
      });
    }
  }

  // Check roundtrip: file written then reopened should match
  const written = timeline.fileSnapshots.find(s => s.label === 'save-before-close');
  const reopened = timeline.fileSnapshots.find(s => s.label === 'save-after-reopen');
  if (written && reopened) {
    if (written.content !== reopened.content) {
      anomalies.push({
        severity: 'critical',
        code: 'ROUNDTRIP_CONTENT_DRIFT',
        message: 'Content changed after close/reopen cycle: ' + written.length + ' -> ' + reopened.length + ' chars',
        detail: diffLines(written.content, reopened.content)
      });
    }
  }

  // Check for growing empty lines (the original bug pattern)
  for (let i = 1; i < timeline.fileSnapshots.length; i++) {
    const prev = timeline.fileSnapshots[i - 1];
    const curr = timeline.fileSnapshots[i];
    if (prev.content && curr.content) {
      const prevBlanks = (prev.content.match(/^\s*$/gm) || []).length;
      const currBlanks = (curr.content.match(/^\s*$/gm) || []).length;
      if (currBlanks > prevBlanks + 1) {
        anomalies.push({
          severity: 'critical',
          code: 'BLANK_LINE_PROLIFERATION',
          message: 'Blank lines grew from ' + prevBlanks + ' to ' + currBlanks + ' between "' + prev.label + '" and "' + curr.label + '"'
        });
      }
    }
  }

  // Check nested list preservation
  for (const snap of timeline.fileSnapshots) {
    if (snap.content && snap.content.includes('  - ')) {
      // Has nested items — check they're properly indented
      const lines = snap.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^(\s+)[-*+]\s/);
        if (match && match[1].length % 2 !== 0) {
          anomalies.push({
            severity: 'warning',
            code: 'ODD_LIST_INDENT',
            message: 'Line ' + i + ' in "' + snap.label + '" has ' + match[1].length + '-space indent (expected even): "' + lines[i].substring(0, 60) + '"'
          });
        }
      }
    }
  }

  return anomalies;
}

function diffLines(a, b) {
  if (!a || !b) return [];
  const la = a.split('\n');
  const lb = b.split('\n');
  const diffs = [];
  const max = Math.max(la.length, lb.length);
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) {
      diffs.push({ line: i, was: (la[i] || '').substring(0, 80), now: (lb[i] || '').substring(0, 80) });
    }
  }
  return diffs;
}

function writeArtifacts(scenarioId, timeline, anomalies) {
  const dir = path.join(OUTPUT_DIR, scenarioId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(dir, 'anomalies.json'), JSON.stringify(anomalies, null, 2));
  return dir;
}

// ═══════════════════════════════════════════════════════════════
//  SCENARIOS
// ═══════════════════════════════════════════════════════════════

async function scenario_autosave(id) {
  console.log('\n── ' + id + ': Auto-save observation ──');
  const tl = createTimeline(id, 'Auto-save with file watcher');

  const { app, win } = await launchApp('# Auto-Save Eval\n\nOriginal content.');
  act(tl, 'launch', 'App opened with test file');
  await snap(win, tl, 'after-launch');
  snapFile(tl, 'initial-file');

  // Type content
  act(tl, 'click', 'editor');
  await win.click('#editor');
  await win.keyboard.press('End');
  act(tl, 'type', 'Adding new content');
  await win.keyboard.press('Enter');
  await win.keyboard.type('Line added during eval.', { delay: 30 });
  await snap(win, tl, 'after-type');

  // Wait for auto-save (500ms debounce + processing)
  act(tl, 'wait', '2000ms for auto-save');
  await wait(2000);
  await snap(win, tl, 'after-autosave-wait');
  snapFile(tl, 'save-after-autosave');

  // Wait more for delayed watcher events
  act(tl, 'wait', '3000ms for delayed watcher events');
  await wait(3000);
  await snap(win, tl, 'after-long-wait');

  // Type again, trigger second auto-save
  act(tl, 'type', 'Second burst');
  await win.keyboard.press('Enter');
  await win.keyboard.type('Second line of content.', { delay: 30 });
  await wait(2000);
  await snap(win, tl, 'after-second-autosave');
  snapFile(tl, 'save-after-second-autosave');

  // Third burst
  act(tl, 'type', 'Third burst');
  await win.keyboard.press('Enter');
  await win.keyboard.type('Third line added.', { delay: 30 });
  await wait(2000);
  await snap(win, tl, 'after-third-autosave');
  snapFile(tl, 'save-after-third-autosave');

  // Final observation
  await wait(2000);
  await snap(win, tl, 'final-observation');
  await win.screenshot({ path: path.join(OUTPUT_DIR, id + '.png') });

  await app.close();
  await wait(1000);
  return tl;
}

async function scenario_roundtrip(id) {
  console.log('\n── ' + id + ': Save/reopen roundtrip observation ──');
  const tl = createTimeline(id, 'File roundtrip through close/reopen');

  const content = '# Roundtrip Eval\n\nParagraph one.\n\nParagraph two.\n\n- Item A\n- Item B\n  - Nested\n    - Deep\n  - Nested 2\n- Item C\n\nFinal line.';
  const { app, win } = await launchApp(content);
  act(tl, 'launch', 'App opened with structured content');
  await snap(win, tl, 'after-launch');
  snapFile(tl, 'initial-file');

  // Save via Ctrl+S
  act(tl, 'press', 'Ctrl+S');
  await win.click('#editor');
  await win.keyboard.press('Control+s');
  await wait(1000);
  await snap(win, tl, 'after-save-1');
  snapFile(tl, 'save-cycle-1');

  // Save again without changes
  act(tl, 'press', 'Ctrl+S (no changes)');
  await win.keyboard.press('Control+s');
  await wait(1000);
  await snap(win, tl, 'after-save-2');
  snapFile(tl, 'save-cycle-2');

  // Third save
  act(tl, 'press', 'Ctrl+S (3rd cycle)');
  await win.keyboard.press('Control+s');
  await wait(1000);
  snapFile(tl, 'save-cycle-3');

  // Record what we're about to close with
  snapFile(tl, 'save-before-close');

  // Close and reopen
  act(tl, 'close', 'Closing app');
  await app.close();
  await wait(1500);

  act(tl, 'reopen', 'Launching fresh instance');
  const { app: app2, win: win2 } = await launchApp(null);
  await snap(win2, tl, 'after-reopen');

  // Save from reopened instance
  act(tl, 'press', 'Ctrl+S after reopen');
  await win2.click('#editor');
  await win2.keyboard.press('Control+s');
  await wait(1000);
  await snap(win2, tl, 'after-reopen-save');
  snapFile(tl, 'save-after-reopen');

  await win2.screenshot({ path: path.join(OUTPUT_DIR, id + '.png') });
  await app2.close();
  await wait(1000);
  return tl;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

(async () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ELECTRON FILE INTEGRITY EVAL LOOP');
  console.log('  Protocol: OBSERVE → RECORD → EVALUATE');
  console.log('══════════════════════════════════════════════════');

  const allAnomalies = [];

  // ── Scenario 1: Auto-save observation ──
  const tl1 = await scenario_autosave('S1-autosave');
  const a1 = evaluateTimeline(tl1);
  const dir1 = writeArtifacts('S1-autosave', tl1, a1);
  allAnomalies.push(...a1);

  console.log('\n  [S1] Frames captured: ' + tl1.frames.length);
  console.log('  [S1] File snapshots: ' + tl1.fileSnapshots.length);
  console.log('  [S1] Actions: ' + tl1.actions.length);
  if (a1.length === 0) {
    console.log('  [S1] ✅ CLEAN');
  } else {
    a1.forEach(a => console.log('  [S1] ⚠ ' + a.severity + ': ' + a.message));
  }
  console.log('  [S1] Artifacts: ' + dir1);

  // ── Scenario 2: Roundtrip observation ──
  const tl2 = await scenario_roundtrip('S2-roundtrip');
  const a2 = evaluateTimeline(tl2);
  const dir2 = writeArtifacts('S2-roundtrip', tl2, a2);
  allAnomalies.push(...a2);

  console.log('\n  [S2] Frames captured: ' + tl2.frames.length);
  console.log('  [S2] File snapshots: ' + tl2.fileSnapshots.length);
  console.log('  [S2] Actions: ' + tl2.actions.length);
  if (a2.length === 0) {
    console.log('  [S2] ✅ CLEAN');
  } else {
    a2.forEach(a => console.log('  [S2] ⚠ ' + a.severity + ': ' + a.message));
  }
  console.log('  [S2] Artifacts: ' + dir2);

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════════');
  console.log('  EVALUATION SUMMARY');
  console.log('══════════════════════════════════════════════════\n');

  const criticals = allAnomalies.filter(a => a.severity === 'critical');
  const warnings = allAnomalies.filter(a => a.severity === 'warning');

  if (criticals.length === 0 && warnings.length === 0) {
    console.log('  VERDICT: CLEAN (C:0 W:0)\n');
  } else {
    console.log('  VERDICT: ' + (criticals.length > 0 ? 'FAIL' : 'WARN') + ' (C:' + criticals.length + ' W:' + warnings.length + ')');
    allAnomalies.forEach(a => console.log('  ' + a.severity.toUpperCase() + ': ' + a.code + ' — ' + a.message));
    console.log('');
  }

  // Print recorded timeline summary
  console.log('  ── S1 Timeline ──');
  tl1.actions.forEach(a => console.log('    +' + a.atMs + 'ms  ' + a.action + ': ' + a.detail));
  console.log('  ── S1 File Snapshots ──');
  tl1.fileSnapshots.forEach(s => console.log('    ' + s.label + ': ' + s.length + ' chars, ' + s.lineCount + ' lines'));

  console.log('\n  ── S2 Timeline ──');
  tl2.actions.forEach(a => console.log('    +' + a.atMs + 'ms  ' + a.action + ': ' + a.detail));
  console.log('  ── S2 File Snapshots ──');
  tl2.fileSnapshots.forEach(s => console.log('    ' + s.label + ': ' + s.length + ' chars, ' + s.lineCount + ' lines'));

  console.log('');
  process.exit(criticals.length > 0 ? 1 : 0);
})();
