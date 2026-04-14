/**
 * Exhaustive Save Fidelity Eval Loop
 *
 * Protocol: OBSERVE → RECORD → EVALUATE
 *
 * Purpose: Catch ANY discrepancy between what's in the editor viewport
 * and what gets saved to disk, across all block types and transitions.
 *
 * Key principle: Compare line-by-line at every transition point.
 * The eval doesn't know what "correct" is — it observes what happens
 * and flags any CHANGE between stages.
 *
 * Stages per document:
 *   1. Write known markdown to file
 *   2. Open in Electron → capture editor markdown (what the user sees)
 *   3. Ctrl+S → read file from disk → compare line-by-line with stage 2
 *   4. Close app → reopen → capture editor markdown → compare with stage 3 file
 *   5. Ctrl+S again → read file → compare with stage 4 capture
 *   6. Close → reopen → Ctrl+S → read file → compare with stage 5 file
 *
 * This catches:
 *   - Extra blank lines inserted on save (heading gap, list gap, etc.)
 *   - Content lost on save (nested items, formatting)
 *   - Drift between viewport and file
 *   - Progressive corruption across cycles
 *
 * Usage: node eval-loop/tests/electron-save-fidelity-eval.js
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const ELECTRON_MAIN = path.join(ROOT, 'electron', 'main.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'save-fidelity');
const TEMP_DATA = path.join(OUTPUT_DIR, 'app-data');
const TEST_FILE = path.join(OUTPUT_DIR, 'fidelity-test.md');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DATA)) fs.mkdirSync(TEMP_DATA, { recursive: true });

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// Get markdown from the editor's own converter (what the user "sees" semantically)
const GET_EDITOR_MD = `(async () => {
  const m = await import('./js/modules/markdownConverter.js');
  return m.default.editorHtmlToMarkdown(document.getElementById('editor').innerHTML);
})()`;

// Get raw editor HTML for artifact logging
const GET_EDITOR_HTML = `document.getElementById('editor').innerHTML`;

async function launchApp() {
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

function diffLines(a, b) {
  const la = a.split('\n'), lb = b.split('\n');
  const diffs = [];
  const max = Math.max(la.length, lb.length);
  for (let i = 0; i < max; i++) {
    if (la[i] !== lb[i]) {
      diffs.push({
        line: i,
        expected: la[i] !== undefined ? la[i] : '(missing)',
        actual: lb[i] !== undefined ? lb[i] : '(missing)',
        type: la[i] === undefined ? 'inserted' :
              lb[i] === undefined ? 'deleted' :
              (la[i].trim() === '' || lb[i].trim() === '') ? 'blank-line-change' : 'content-change'
      });
    }
  }
  return diffs;
}

function classifyLine(line) {
  if (line === undefined) return 'missing';
  if (line.trim() === '') return 'blank';
  if (/^#{1,6}\s/.test(line)) return 'heading';
  if (/^\s*[-*+]\s/.test(line)) return 'ul-item';
  if (/^\s*\d+\.\s/.test(line)) return 'ol-item';
  if (/^>\s?/.test(line)) return 'blockquote';
  if (/^```/.test(line)) return 'code-fence';
  if (/^\|/.test(line)) return 'table-row';
  if (/^---/.test(line)) return 'hr';
  return 'paragraph';
}

function analyzeTransition(label, expected, actual, anomalies) {
  const diffs = diffLines(expected, actual);
  if (diffs.length === 0) return;

  // Classify each diff
  for (const d of diffs) {
    const prevLineType = d.line > 0 ? classifyLine(expected.split('\n')[d.line - 1]) : 'start';
    const nextLineType = classifyLine(expected.split('\n')[d.line + 1]);

    if (d.type === 'inserted' && d.actual.trim() === '') {
      // Extra blank line inserted
      anomalies.push({
        severity: 'critical',
        code: 'EXTRA_BLANK_LINE',
        message: label + ': Extra blank line inserted at line ' + d.line + ' (between ' + prevLineType + ' and ' + nextLineType + ')',
        context: { line: d.line, before: prevLineType, after: nextLineType }
      });
    } else if (d.type === 'deleted' && d.expected.trim() === '') {
      // Blank line removed
      anomalies.push({
        severity: 'warning',
        code: 'BLANK_LINE_REMOVED',
        message: label + ': Blank line removed at line ' + d.line + ' (between ' + prevLineType + ' and ' + nextLineType + ')',
        context: { line: d.line, before: prevLineType, after: nextLineType }
      });
    } else if (d.type === 'content-change') {
      anomalies.push({
        severity: 'critical',
        code: 'CONTENT_CHANGED',
        message: label + ': Line ' + d.line + ' changed: "' + d.expected.substring(0, 60) + '" -> "' + d.actual.substring(0, 60) + '"',
        context: { line: d.line, was: d.expected, now: d.actual }
      });
    } else if (d.type === 'inserted') {
      anomalies.push({
        severity: 'critical',
        code: 'LINE_INSERTED',
        message: label + ': Line inserted at ' + d.line + ': "' + d.actual.substring(0, 60) + '"'
      });
    } else if (d.type === 'deleted') {
      anomalies.push({
        severity: 'critical',
        code: 'LINE_DELETED',
        message: label + ': Line deleted at ' + d.line + ': "' + d.expected.substring(0, 60) + '"'
      });
    }
  }
}

// ═══════════════════════════════════════════════
//  TEST DOCUMENTS — covering all block type transitions
// ═══════════════════════════════════════════════

const DOCUMENTS = {
  // ── Heading transitions (the core gap) ──
  'D1-heading-no-blank-paragraph': {
    title: 'Heading immediately followed by paragraph (no blank line)',
    content: '# Title\nParagraph right after heading.'
  },

  'D2-heading-no-blank-list': {
    title: 'Heading immediately followed by list (no blank line)',
    content: '# Shopping List\n- Apples\n- Bananas\n- Cherries'
  },

  'D3-heading-no-blank-heading': {
    title: 'Heading immediately followed by heading (no blank line)',
    content: '# Title\n## Subtitle\n### Sub-sub\nContent here.'
  },

  'D4-heading-blank-paragraph': {
    title: 'Heading with blank line then paragraph (standard)',
    content: '# Title\n\nParagraph after blank line.'
  },

  'D5-multi-heading-no-blanks': {
    title: 'Multiple headings with content, no blank lines anywhere',
    content: '# Main\nIntro text.\n## Section A\nSection A content.\n### Detail\nDetail content.\n## Section B\nSection B content.'
  },

  'D6-heading-no-blank-code': {
    title: 'Heading immediately followed by code block',
    content: '# Code\n```javascript\nlet x = 1;\n```'
  },

  'D7-heading-no-blank-blockquote': {
    title: 'Heading immediately followed by blockquote',
    content: '# Quotes\n> A famous quote.'
  },

  // ── List transitions ──
  'D8-nested-lists': {
    title: 'Deeply nested unordered lists',
    content: '- Level 1 A\n  - Level 2 A1\n    - Level 3 deep\n  - Level 2 A2\n- Level 1 B'
  },

  'D9-mixed-ol-ul': {
    title: 'OL with nested UL',
    content: '1. First\n2. Second\n   - Nested bullet\n   - Another\n3. Third'
  },

  'D10-list-then-heading': {
    title: 'List followed by heading (no blank line)',
    content: '- Item A\n- Item B\n# Next Section\nContent here.'
  },

  // ── Mixed block transitions ──
  'D11-all-blocks-no-blanks': {
    title: 'All block types with no blank lines between any',
    content: '# Title\nParagraph.\n- List item\n> Quote\n## Section\n1. Ordered\nAnother paragraph.'
  },

  'D12-all-blocks-with-blanks': {
    title: 'All block types with blank lines between all (standard)',
    content: '# Title\n\nParagraph.\n\n- List item\n\n> Quote\n\n## Section\n\n1. Ordered\n\nAnother paragraph.'
  },

  // ── Edge cases ──
  'D13-single-heading': {
    title: 'Just a single heading, nothing else',
    content: '# Title'
  },

  'D14-heading-with-inline': {
    title: 'Heading with bold/italic content',
    content: '# **Bold Title**\nParagraph with *italic* word.\n## *Italic Heading*\nMore content.'
  },

  'D15-paragraph-heading-paragraph': {
    title: 'Paragraph then heading then paragraph, no blanks',
    content: 'First paragraph.\n# Middle Heading\nSecond paragraph.'
  },
};

// ═══════════════════════════════════════════════
//  MAIN EVAL LOOP
// ═══════════════════════════════════════════════
      'Introduction paragraph.',
      '',
      '## Section A',
      '',
      '- Item 1',
      '  - Sub item',
      '- Item 2',
      '',
      '### Sub-section',
// ═══════════════════════════════════════════════
//  MAIN EVAL LOOP
// ═══════════════════════════════════════════════

(async () => {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  EXHAUSTIVE SAVE FIDELITY EVAL');
  console.log('  ' + Object.keys(DOCUMENTS).length + ' documents × 3 cycles each');
  console.log('  Protocol: OBSERVE → RECORD → EVALUATE');
  console.log('══════════════════════════════════════════════════════\n');

  const allAnomalies = [];
  const docResults = [];

  for (const [docId, doc] of Object.entries(DOCUMENTS)) {
    console.log('── ' + docId + ': ' + doc.title + ' ──');

    const timeline = {
      docId, title: doc.title,
      stages: [],
      anomalies: []
    };

    // Stage 1: Write known markdown to file
    fs.writeFileSync(TEST_FILE, doc.content, 'utf8');
    timeline.stages.push({ label: 'initial-file', content: doc.content });

    // Stage 2: Open in Electron → capture what editor produces
    const { app, win } = await launchApp();
    const editorMd1 = await win.evaluate(GET_EDITOR_MD);
    const editorHtml1 = await win.evaluate(GET_EDITOR_HTML);
    timeline.stages.push({ label: 'editor-after-open', content: editorMd1, html: editorHtml1 });

    // Analyze: initial file vs what editor shows
    analyzeTransition('open', doc.content, editorMd1, timeline.anomalies);

    // Stage 3: Ctrl+S → read file → compare with editor capture
    await win.click('#editor');
    await win.keyboard.press('Control+s');
    await wait(1000);
    const fileMd1 = fs.readFileSync(TEST_FILE, 'utf8');
    timeline.stages.push({ label: 'file-after-save-1', content: fileMd1 });

    // Analyze: editor vs saved file (should match exactly — what you see = what you save)
    analyzeTransition('save-1-vs-editor', editorMd1, fileMd1, timeline.anomalies);

    // Stage 4: Close → reopen → capture editor markdown
    await app.close();
    await wait(1000);

    const { app: app2, win: win2 } = await launchApp();
    const editorMd2 = await win2.evaluate(GET_EDITOR_MD);
    timeline.stages.push({ label: 'editor-after-reopen', content: editorMd2 });

    // Analyze: saved file vs what editor shows after reopen
    analyzeTransition('reopen-vs-file', fileMd1, editorMd2, timeline.anomalies);

    // Stage 5: Ctrl+S again → read file → compare
    await win2.click('#editor');
    await win2.keyboard.press('Control+s');
    await wait(1000);
    const fileMd2 = fs.readFileSync(TEST_FILE, 'utf8');
    timeline.stages.push({ label: 'file-after-save-2', content: fileMd2 });

    // Analyze: reopen editor vs second save file
    analyzeTransition('save-2-vs-editor', editorMd2, fileMd2, timeline.anomalies);
    // Analyze: first save file vs second save file (stability)
    analyzeTransition('save-1-vs-save-2', fileMd1, fileMd2, timeline.anomalies);

    // Stage 6: One more cycle
    await app2.close();
    await wait(1000);

    const { app: app3, win: win3 } = await launchApp();
    await win3.click('#editor');
    await win3.keyboard.press('Control+s');
    await wait(1000);
    const fileMd3 = fs.readFileSync(TEST_FILE, 'utf8');
    timeline.stages.push({ label: 'file-after-save-3', content: fileMd3 });

    // Analyze: cycle 2 vs cycle 3 (should be stable by now)
    analyzeTransition('save-2-vs-save-3', fileMd2, fileMd3, timeline.anomalies);

    await app3.close();
    await wait(1000);

    // Report
    const criticals = timeline.anomalies.filter(a => a.severity === 'critical');
    const warnings = timeline.anomalies.filter(a => a.severity === 'warning');

    if (criticals.length === 0 && warnings.length === 0) {
      console.log('  ✅ CLEAN (6 stages, 0 diffs)');
    } else {
      console.log('  ⚠ C:' + criticals.length + ' W:' + warnings.length);
      // Show unique anomaly codes
      const codes = [...new Set(timeline.anomalies.map(a => a.code))];
      for (const code of codes) {
        const items = timeline.anomalies.filter(a => a.code === code);
        console.log('    ' + code + ' (' + items.length + 'x): ' + items[0].message);
      }
    }

    allAnomalies.push(...timeline.anomalies.map(a => ({ ...a, docId })));
    docResults.push(timeline);
  }

  // Write full artifacts
  const artifactDir = path.join(OUTPUT_DIR, 'results');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, 'all-timelines.json'), JSON.stringify(docResults, null, 2));
  fs.writeFileSync(path.join(artifactDir, 'all-anomalies.json'), JSON.stringify(allAnomalies, null, 2));

  // ── Summary ──
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  EVALUATION SUMMARY');
  console.log('══════════════════════════════════════════════════════\n');

  const criticals = allAnomalies.filter(a => a.severity === 'critical');
  const warnings = allAnomalies.filter(a => a.severity === 'warning');

  console.log('  Documents: ' + Object.keys(DOCUMENTS).length);
  console.log('  Total anomalies: C:' + criticals.length + ' W:' + warnings.length);
  console.log('  VERDICT: ' + (criticals.length > 0 ? 'FAIL' : 'CLEAN'));

  if (allAnomalies.length > 0) {
    // Group by code
    const byCode = {};
    for (const a of allAnomalies) {
      if (!byCode[a.code]) byCode[a.code] = [];
      byCode[a.code].push(a);
    }
    console.log('\n  ── Anomalies by type ──');
    for (const [code, items] of Object.entries(byCode)) {
      console.log('  ' + code + ': ' + items.length + ' occurrences');
      // Show affected documents
      const docs = [...new Set(items.map(i => i.docId))];
      console.log('    Documents: ' + docs.join(', '));
      // Show first 3 examples
      for (const item of items.slice(0, 3)) {
        console.log('    ' + item.message);
      }
      if (items.length > 3) console.log('    ... and ' + (items.length - 3) + ' more');
    }
  }

  console.log('\n  Artifacts: ' + artifactDir);
  console.log('');

  process.exit(criticals.length > 0 ? 1 : 0);
})();
