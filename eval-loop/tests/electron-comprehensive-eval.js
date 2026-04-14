/**
 * Comprehensive Electron Save & Format Eval Loop
 *
 * Protocol: OBSERVE → RECORD → EVALUATE
 *
 * Scenarios:
 *  S1: Paste markdown content → observe DOM → auto-save → read file → compare
 *  S2: Type nested lists → auto-save → close → reopen → observe
 *  S3: Heading backspace behavior → observe DOM mutations
 *  S4: Complex document with all block types → multi-cycle roundtrip
 *
 * Usage: node eval-loop/tests/electron-comprehensive-eval.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const ELECTRON_MAIN = path.join(ROOT, 'electron', 'main.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'electron-comprehensive');
const TEMP_DATA = path.join(OUTPUT_DIR, 'app-data');
const TEST_FILE = path.join(OUTPUT_DIR, 'eval-document.md');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DATA)) fs.mkdirSync(TEMP_DATA, { recursive: true });

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Agnostic snapshot ──
const SNAPSHOT_FN = `(() => {
  var editor = document.getElementById('editor');
  var notifBar = document.getElementById('notification-bar');
  var notifText = document.getElementById('notification-text');

  var editorHTML = editor ? editor.innerHTML : '';
  var editorText = editor ? editor.textContent : '';
  var blockCount = editor ? editor.children.length : 0;
  var blocks = [];
  if (editor) {
    for (var i = 0; i < editor.children.length; i++) {
      var el = editor.children[i];
      var tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
      // For lists, capture nesting depth
      var listDepth = 0;
      var listItemCount = 0;
      if (tag === 'ul' || tag === 'ol') {
        function countDepth(list, d) {
          var maxD = d;
          var lis = list.querySelectorAll(':scope > li');
          listItemCount += lis.length;
          for (var li of lis) {
            var sub = li.querySelector('ul, ol');
            if (sub) maxD = Math.max(maxD, countDepth(sub, d + 1));
          }
          return maxD;
        }
        listDepth = countDepth(el, 1);
      }
      // For headings, capture marker state
      var marker = el.querySelector && el.querySelector('.heading-marker');
      blocks.push({
        tag: tag,
        text: (el.textContent || '').replace(/\\u200B/g, '').substring(0, 200),
        isEmpty: (el.textContent || '').replace(/\\u200B/g, '').trim().length === 0,
        hasBr: !!el.querySelector('br'),
        childCount: el.children.length,
        listDepth: listDepth,
        listItemCount: listItemCount,
        hasMarker: !!marker,
        markerText: marker ? marker.textContent : '',
        classes: el.className || ''
      });
    }
  }

  var notifVisible = false;
  var notifMessage = '';
  if (notifBar) {
    var ns = window.getComputedStyle(notifBar);
    notifVisible = notifBar.style.display !== 'none' && ns.display !== 'none';
    notifMessage = notifText ? notifText.textContent : '';
  }

  var hasFocus = document.activeElement === editor;
  var caretInfo = null;
  try {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor) {
      var range = sel.getRangeAt(0);
      var node = sel.anchorNode;
      var blockIdx = -1;
      var current = node;
      while (current && current.parentNode !== editor) current = current.parentNode;
      if (current && current.parentNode === editor) {
        blockIdx = [].indexOf.call(editor.children, current);
      }
      caretInfo = {
        blockIndex: blockIdx,
        offset: sel.anchorOffset,
        collapsed: range.collapsed,
        anchorNodeType: node ? node.nodeType : null,
        anchorText: node && node.nodeType === 3 ? node.textContent.substring(0, 50) : null
      };
    }
  } catch(e) {}

  return {
    timestamp: Date.now(),
    editor: { html: editorHTML, textLength: editorText.length, blockCount: blockCount, blocks: blocks, hasFocus: hasFocus, caret: caretInfo },
    notification: { visible: notifVisible, message: notifMessage }
  };
})()`;

function createTimeline(id, title) {
  return { scenario: id, title: title, startTime: Date.now(), frames: [], fileSnapshots: [], actions: [] };
}

async function snap(win, tl, trigger) {
  const f = await win.evaluate(SNAPSHOT_FN);
  f.trigger = trigger;
  f.frameId = tl.frames.length;
  f.elapsedMs = Date.now() - tl.startTime;
  tl.frames.push(f);
  return f;
}

function snapFile(tl, label) {
  const exists = fs.existsSync(TEST_FILE);
  const content = exists ? fs.readFileSync(TEST_FILE, 'utf8') : null;
  const entry = { label, exists, content, length: content ? content.length : 0, lineCount: content ? content.split('\n').length : 0, elapsedMs: Date.now() - tl.startTime };
  tl.fileSnapshots.push(entry);
  return entry;
}

function act(tl, action, detail) {
  tl.actions.push({ action, detail, atMs: Date.now() - tl.startTime });
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
  await app.evaluate(async (mod, fp) => {
    const { ipcMain } = mod;
    ipcMain.removeHandler('file:getPath');
    ipcMain.handle('file:getPath', async () => fp);
  }, TEST_FILE);
  return { app, win };
}

function writeArtifacts(id, tl, anomalies) {
  const dir = path.join(OUTPUT_DIR, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify(tl, null, 2));
  fs.writeFileSync(path.join(dir, 'anomalies.json'), JSON.stringify(anomalies, null, 2));
  return dir;
}

function diffLines(a, b) {
  if (!a || !b) return [];
  const la = a.split('\n'), lb = b.split('\n'), d = [];
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) d.push({ line: i, was: (la[i] || ''), now: (lb[i] || '') });
  }
  return d;
}

// ═══════════════════════════════════════════════
//  EVALUATION (runs AFTER observation)
// ═══════════════════════════════════════════════

function evaluate(tl) {
  const anomalies = [];

  // ── E1: False external modification alert ──
  for (const f of tl.frames) {
    if (f.notification.visible && f.notification.message.includes('modified externally')) {
      anomalies.push({ severity: 'critical', code: 'FALSE_ALERT', message: '"' + f.notification.message + '" at frame ' + f.frameId + ' (' + f.trigger + ')' });
    }
  }

  // ── E2: File content drift (no user action between saves) ──
  const saves = tl.fileSnapshots.filter(s => s.label.startsWith('save'));
  for (let i = 1; i < saves.length; i++) {
    const prev = saves[i-1], curr = saves[i];
    const actionBetween = tl.actions.some(a => (a.action === 'type' || a.action === 'press' || a.action === 'paste') && a.atMs >= prev.elapsedMs && a.atMs <= curr.elapsedMs);
    if (!actionBetween && curr.content !== prev.content) {
      anomalies.push({ severity: 'critical', code: 'FILE_CONTENT_DRIFT', message: '"' + prev.label + '" (' + prev.length + ') -> "' + curr.label + '" (' + curr.length + ')', detail: diffLines(prev.content, curr.content) });
    }
  }

  // ── E3: Blank line proliferation ──
  for (let i = 1; i < tl.fileSnapshots.length; i++) {
    const prev = tl.fileSnapshots[i-1], curr = tl.fileSnapshots[i];
    if (prev.content && curr.content) {
      const pBlanks = (prev.content.match(/^\s*$/gm) || []).length;
      const cBlanks = (curr.content.match(/^\s*$/gm) || []).length;
      // Allow growth proportional to content growth, flag if blanks outpace content
      const contentGrew = curr.length > prev.length;
      if (cBlanks > pBlanks + 2 && !contentGrew) {
        anomalies.push({ severity: 'critical', code: 'BLANK_PROLIFERATION', message: 'Blanks ' + pBlanks + '->' + cBlanks + ' between "' + prev.label + '" and "' + curr.label + '"' });
      }
    }
  }

  // ── E4: Nested list depth loss ──
  for (let i = 1; i < tl.frames.length; i++) {
    const prev = tl.frames[i-1], curr = tl.frames[i];
    for (const pb of prev.editor.blocks) {
      if (pb.listDepth > 1) {
        // Find matching list in current frame
        const cb = curr.editor.blocks.find(b => (b.tag === 'ul' || b.tag === 'ol') && b.text.includes(pb.text.substring(0, 20)));
        if (cb && cb.listDepth < pb.listDepth) {
          anomalies.push({ severity: 'critical', code: 'NESTING_DEPTH_LOSS', message: 'List depth ' + pb.listDepth + '->' + cb.listDepth + ' between frames ' + (i-1) + ' and ' + i + ' (' + prev.trigger + '->' + curr.trigger + ')' });
        }
      }
    }
  }

  // ── E5: Roundtrip fidelity ──
  const beforeClose = tl.fileSnapshots.find(s => s.label === 'save-before-close');
  const afterReopen = tl.fileSnapshots.find(s => s.label === 'save-after-reopen');
  if (beforeClose && afterReopen && beforeClose.content !== afterReopen.content) {
    anomalies.push({ severity: 'critical', code: 'ROUNDTRIP_DRIFT', message: 'Close/reopen changed content: ' + beforeClose.length + '->' + afterReopen.length, detail: diffLines(beforeClose.content, afterReopen.content) });
  }

  // ── E6: Heading structure anomalies ──
  for (const f of tl.frames) {
    for (const b of f.editor.blocks) {
      if (/^h[1-6]$/.test(b.tag)) {
        if (!b.hasMarker) anomalies.push({ severity: 'critical', code: 'HEADING_NO_MARKER', message: b.tag + ' missing marker at frame ' + f.frameId + ' (' + f.trigger + '): "' + b.text.substring(0, 40) + '"' });
      }
      // Detect raw # in a div (heading not converted)
      if (b.tag === 'div' && /^#{1,6}\s/.test(b.text)) {
        anomalies.push({ severity: 'critical', code: 'RAW_HEADING_IN_DIV', message: 'Unconverted heading in div at frame ' + f.frameId + ': "' + b.text.substring(0, 40) + '"' });
      }
    }
  }

  // ── E7: List item count preservation ──
  const listFrames = tl.frames.filter(f => f.editor.blocks.some(b => b.listItemCount > 0));
  if (listFrames.length >= 2) {
    const first = listFrames[0], last = listFrames[listFrames.length - 1];
    const firstItems = first.editor.blocks.reduce((sum, b) => sum + b.listItemCount, 0);
    const lastItems = last.editor.blocks.reduce((sum, b) => sum + b.listItemCount, 0);
    // Only check if no typing happened (items should be stable)
    const typingHappened = tl.actions.some(a => a.action === 'type' && a.atMs > first.elapsedMs);
    if (!typingHappened && lastItems < firstItems) {
      anomalies.push({ severity: 'critical', code: 'LIST_ITEMS_LOST', message: 'List items ' + firstItems + '->' + lastItems + ' between frames ' + first.frameId + ' and ' + last.frameId });
    }
  }

  return anomalies;
}

// ═══════════════════════════════════════════════
//  SCENARIOS
// ═══════════════════════════════════════════════

async function S1_paste_and_save() {
  console.log('\n── S1: Paste complex markdown → auto-save → verify ──');
  const tl = createTimeline('S1', 'Paste content and auto-save');

  // Complex markdown with all block types
  const md = '# Main Title\n\n## Section One\n\nA paragraph with **bold** and *italic*.\n\n- Item 1\n  - Sub item A\n    - Deep nested\n  - Sub item B\n- Item 2\n- Item 3\n\n1. First\n2. Second\n   - Mixed nesting\n3. Third\n\n> A blockquote\n\nFinal paragraph.';
  const { app, win } = await launchApp(md);

  act(tl, 'launch', 'Opened with complex markdown');
  await snap(win, tl, 'after-launch');
  snapFile(tl, 'initial-file');

  // Ctrl+S to trigger save
  act(tl, 'press', 'Ctrl+S');
  await win.click('#editor');
  await win.keyboard.press('Control+s');
  await wait(1000);
  await snap(win, tl, 'after-save-1');
  snapFile(tl, 'save-1');

  // Second save
  act(tl, 'press', 'Ctrl+S again');
  await win.keyboard.press('Control+s');
  await wait(1000);
  snapFile(tl, 'save-2');

  // Now type something and let auto-save handle it
  act(tl, 'type', 'Adding content');
  await win.keyboard.press('End');
  await win.keyboard.press('Enter');
  await win.keyboard.type('New paragraph after editing.');
  await wait(2000);
  await snap(win, tl, 'after-autosave');
  snapFile(tl, 'save-after-edit');

  // Save again to check stability
  act(tl, 'press', 'Ctrl+S post-edit');
  await win.keyboard.press('Control+s');
  await wait(1000);
  snapFile(tl, 'save-post-edit-2');

  snapFile(tl, 'save-before-close');
  await win.screenshot({ path: path.join(OUTPUT_DIR, 'S1.png') });
  await app.close();
  await wait(1000);

  // Reopen
  act(tl, 'reopen', 'Fresh instance');
  const { app: a2, win: w2 } = await launchApp(null);
  await snap(w2, tl, 'after-reopen');

  act(tl, 'press', 'Ctrl+S after reopen');
  await w2.click('#editor');
  await w2.keyboard.press('Control+s');
  await wait(1000);
  await snap(w2, tl, 'after-reopen-save');
  snapFile(tl, 'save-after-reopen');

  await w2.screenshot({ path: path.join(OUTPUT_DIR, 'S1-reopen.png') });
  await a2.close();
  await wait(1000);
  return tl;
}

async function S2_heading_backspace() {
  console.log('\n── S2: Heading backspace behavior ──');
  const tl = createTimeline('S2', 'Heading creation and backspace deletion');

  const md = '# Title to delete\n\nSome content below.';
  const { app, win } = await launchApp(md);

  act(tl, 'launch', 'Opened with heading');
  await snap(win, tl, 'after-launch');

  // Place caret at start of heading text (after ZWSP)
  act(tl, 'click', 'Click start of heading');
  await win.click('#editor h1');
  await wait(100);
  await win.keyboard.press('Home');
  await wait(100);
  await snap(win, tl, 'caret-at-heading-start');

  // Try to delete the # marker with backspace
  act(tl, 'press', 'Backspace at heading start');
  await win.keyboard.press('Backspace');
  await wait(300);
  await snap(win, tl, 'after-backspace-1');

  // Multiple backspaces
  for (let i = 2; i <= 5; i++) {
    act(tl, 'press', 'Backspace ' + i);
    await win.keyboard.press('Backspace');
    await wait(200);
  }
  await snap(win, tl, 'after-backspace-5');

  // Now try typing a heading from scratch
  act(tl, 'press', 'Ctrl+A then Delete');
  await win.keyboard.press('Control+a');
  await win.keyboard.press('Delete');
  await wait(300);
  await snap(win, tl, 'after-clear');

  // Type "# New Title"
  act(tl, 'type', '# New Title');
  await win.keyboard.type('# New Title', { delay: 50 });
  await wait(500);
  await snap(win, tl, 'after-type-heading');

  // Press Enter to create a new line
  act(tl, 'press', 'Enter');
  await win.keyboard.press('Enter');
  await wait(300);
  await snap(win, tl, 'after-enter');

  // Type content
  act(tl, 'type', 'Body text');
  await win.keyboard.type('Body text here.');
  await wait(300);
  await snap(win, tl, 'after-body-text');

  // Now go back to heading and try backspace
  act(tl, 'press', 'ArrowUp to heading');
  await win.keyboard.press('ArrowUp');
  await win.keyboard.press('Home');
  await wait(200);
  await snap(win, tl, 'caret-at-new-heading-start');

  // Backspace should revert heading to div
  act(tl, 'press', 'Backspace to revert heading');
  await win.keyboard.press('Backspace');
  await wait(300);
  await snap(win, tl, 'after-heading-revert-attempt');

  await win.screenshot({ path: path.join(OUTPUT_DIR, 'S2.png') });
  await app.close();
  await wait(1000);
  return tl;
}

async function S3_nested_list_autosave() {
  console.log('\n── S3: Type nested list → auto-save → reopen ──');
  const tl = createTimeline('S3', 'Nested list typed and auto-saved');

  const { app, win } = await launchApp('');  // Start with empty file

  act(tl, 'launch', 'Empty document');
  await snap(win, tl, 'after-launch');

  // Type a nested list using the editor's own list creation
  await win.click('#editor');
  act(tl, 'type', 'Create list via typing');
  await win.keyboard.type('- Parent item 1');
  await wait(500);
  await snap(win, tl, 'after-first-item');

  act(tl, 'press', 'Enter for next item');
  await win.keyboard.press('Enter');
  await wait(200);

  act(tl, 'type', 'Second item');
  await win.keyboard.type('Child of parent 1');
  await wait(200);

  act(tl, 'press', 'Tab to indent');
  await win.keyboard.press('Tab');
  await wait(300);
  await snap(win, tl, 'after-tab-indent');

  act(tl, 'press', 'Enter for next');
  await win.keyboard.press('Enter');
  act(tl, 'type', 'Deep nested');
  await win.keyboard.type('Deep nested item');
  await wait(200);
  act(tl, 'press', 'Tab for deeper');
  await win.keyboard.press('Tab');
  await wait(300);
  await snap(win, tl, 'after-deep-indent');

  act(tl, 'press', 'Enter');
  await win.keyboard.press('Enter');
  act(tl, 'press', 'Shift+Tab to outdent');
  await win.keyboard.press('Shift+Tab');
  await wait(200);
  act(tl, 'type', 'Sibling of child');
  await win.keyboard.type('Sibling of child');
  await wait(200);
  await snap(win, tl, 'after-sibling');

  act(tl, 'press', 'Enter');
  await win.keyboard.press('Enter');
  act(tl, 'press', 'Shift+Tab');
  await win.keyboard.press('Shift+Tab');
  await wait(200);
  act(tl, 'type', 'Parent item 2');
  await win.keyboard.type('Parent item 2');
  await wait(200);
  await snap(win, tl, 'after-full-list');

  // Wait for auto-save
  act(tl, 'wait', '2s for auto-save');
  await wait(2000);
  snapFile(tl, 'save-after-list-typed');
  await snap(win, tl, 'after-autosave');

  // Ctrl+S for explicit save
  act(tl, 'press', 'Ctrl+S');
  await win.keyboard.press('Control+s');
  await wait(1000);
  snapFile(tl, 'save-explicit');

  snapFile(tl, 'save-before-close');
  await win.screenshot({ path: path.join(OUTPUT_DIR, 'S3.png') });
  await app.close();
  await wait(1000);

  // Reopen
  act(tl, 'reopen', 'Fresh instance');
  const { app: a2, win: w2 } = await launchApp(null);
  await snap(w2, tl, 'after-reopen');
  act(tl, 'press', 'Ctrl+S after reopen');
  await w2.click('#editor');
  await w2.keyboard.press('Control+s');
  await wait(1000);
  await snap(w2, tl, 'after-reopen-save');
  snapFile(tl, 'save-after-reopen');

  await w2.screenshot({ path: path.join(OUTPUT_DIR, 'S3-reopen.png') });
  await a2.close();
  await wait(1000);
  return tl;
}

// ═══════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════

(async () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE ELECTRON EVAL LOOP');
  console.log('  Protocol: OBSERVE → RECORD → EVALUATE');
  console.log('══════════════════════════════════════════════════');

  const allAnomalies = [];

  const tl1 = await S1_paste_and_save();
  const a1 = evaluate(tl1);
  writeArtifacts('S1', tl1, a1);
  allAnomalies.push(...a1.map(a => ({ ...a, scenario: 'S1' })));
  console.log('\n  [S1] Frames: ' + tl1.frames.length + ', Snapshots: ' + tl1.fileSnapshots.length);
  if (a1.length === 0) console.log('  [S1] ✅ CLEAN');
  else a1.forEach(a => console.log('  [S1] ' + a.severity + ': ' + a.code + ' — ' + a.message));

  const tl2 = await S2_heading_backspace();
  const a2 = evaluate(tl2);
  writeArtifacts('S2', tl2, a2);
  allAnomalies.push(...a2.map(a => ({ ...a, scenario: 'S2' })));
  console.log('\n  [S2] Frames: ' + tl2.frames.length);
  if (a2.length === 0) console.log('  [S2] ✅ CLEAN');
  else a2.forEach(a => console.log('  [S2] ' + a.severity + ': ' + a.code + ' — ' + a.message));

  // Print heading frame details for S2
  console.log('  [S2] Block progression:');
  for (const f of tl2.frames) {
    const tags = f.editor.blocks.map(b => b.tag + (b.hasMarker ? '*' : '') + '("' + b.text.substring(0, 25) + '")');
    console.log('    ' + f.trigger + ': ' + tags.join(', '));
  }

  const tl3 = await S3_nested_list_autosave();
  const a3 = evaluate(tl3);
  writeArtifacts('S3', tl3, a3);
  allAnomalies.push(...a3.map(a => ({ ...a, scenario: 'S3' })));
  console.log('\n  [S3] Frames: ' + tl3.frames.length + ', Snapshots: ' + tl3.fileSnapshots.length);
  if (a3.length === 0) console.log('  [S3] ✅ CLEAN');
  else a3.forEach(a => console.log('  [S3] ' + a.severity + ': ' + a.code + ' — ' + a.message));

  // Print file snapshots for S3
  console.log('  [S3] File snapshots:');
  for (const s of tl3.fileSnapshots) {
    console.log('    ' + s.label + ': ' + s.length + ' chars, ' + s.lineCount + ' lines');
    if (s.content) console.log('      ' + JSON.stringify(s.content).substring(0, 120));
  }

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════════');
  console.log('  EVALUATION SUMMARY');
  console.log('══════════════════════════════════════════════════\n');

  const criticals = allAnomalies.filter(a => a.severity === 'critical');
  const warnings = allAnomalies.filter(a => a.severity === 'warning');
  console.log('  VERDICT: ' + (criticals.length > 0 ? 'FAIL' : 'CLEAN') + ' (C:' + criticals.length + ' W:' + warnings.length + ')');
  if (allAnomalies.length > 0) {
    allAnomalies.forEach(a => console.log('  [' + a.scenario + '] ' + a.severity + ': ' + a.code + ' — ' + a.message));
  }
  console.log('');

  process.exit(criticals.length > 0 ? 1 : 0);
})();
