/**
 * Electron Launch Benchmark
 *
 * Measures cold-start performance by:
 * 1. Clearing Electron cache/session data
 * 2. Launching the app via Playwright's Electron API
 * 3. Recording timestamps at each milestone
 * 4. Reporting a breakdown of where time is spent
 *
 * Usage: node eval-loop/tests/electron-launch-bench.js [--runs N]
 */
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const ELECTRON_MAIN = path.join(ROOT, 'electron', 'main.js');
const OUTPUT_DIR = path.join(ROOT, 'test-results', 'launch-bench');
const TEMP_DATA = path.join(OUTPUT_DIR, 'temp-userdata');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const NUM_RUNS = parseInt(process.argv.find(a => a.startsWith('--runs='))?.split('=')[1] || '3');

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function clearDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function benchmarkRun(runIndex) {
  const times = {};

  // Clear cache for cold start
  clearDir(TEMP_DATA);
  fs.mkdirSync(TEMP_DATA, { recursive: true });

  times.benchStart = performance.now();

  // Launch Electron
  const electronApp = await electron.launch({
    args: [ELECTRON_MAIN],
    env: {
      ...process.env,
      PORTABLE_EXECUTABLE_DIR: TEMP_DATA,
    },
  });
  times.electronLaunched = performance.now();

  // Collect console messages from renderer for timing
  const consoleLogs = [];
  const rendererTimestamps = {};

  const window = await electronApp.firstWindow();
  times.firstWindowObtained = performance.now();

  // Attach console listener immediately
  window.on('console', msg => {
    const text = msg.text();
    const ts = performance.now();
    consoleLogs.push({ ts, text });

    // Track key init milestones
    if (text.includes('[App] DOM content loaded')) rendererTimestamps.domContentLoaded = ts;
    if (text.includes('[App] Editor initialized')) rendererTimestamps.editorInit = ts;
    if (text.includes('[App] Toolbar initialized')) rendererTimestamps.toolbarInit = ts;
    if (text.includes('[Storage] Loading settings')) rendererTimestamps.storageLoadStart = ts;
    if (text.includes('[Storage] Applied theme')) rendererTimestamps.themeApplied = ts;
    if (text.includes('[Storage] Applied font size')) rendererTimestamps.fontSizeApplied = ts;
    if (text.includes('[Storage] Set focus toggle')) rendererTimestamps.focusToggleSet = ts;
    if (text.includes('[Storage] Created and loaded first')) rendererTimestamps.firstDocCreated = ts;
    if (text.includes('[Storage] Loaded most recent')) rendererTimestamps.docLoaded = ts;
    if (text.includes('[FocusMode] Initialized')) rendererTimestamps.focusModeInit = ts;
    if (text.includes('[ElectronBridge]')) {
      if (!rendererTimestamps.electronBridgeFirst) rendererTimestamps.electronBridgeFirst = ts;
      rendererTimestamps.electronBridgeLast = ts;
    }
  });

  // Wait for editor to be ready
  await window.waitForSelector('#editor', { timeout: 30_000 });
  times.editorReady = performance.now();

  // Wait a bit for all async init to settle
  await wait(500);
  times.settled = performance.now();

  // Measure DOM complexity
  const domStats = await window.evaluate(`(() => {
    const editor = document.getElementById('editor');
    const all = document.querySelectorAll('*');
    const scripts = document.querySelectorAll('script');
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const styles = document.querySelectorAll('style');
    return {
      totalElements: all.length,
      editorChildren: editor ? editor.children.length : 0,
      scriptTags: scripts.length,
      stylesheets: links.length,
      inlineStyles: styles.length,
      isElectron: !!window.electronAPI,
      titleBarVisible: document.getElementById('title-bar')?.style.display === 'flex',
    };
  })()`);

  // Measure performance entries if available
  const perfEntries = await window.evaluate(`(() => {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      return {
        navigation: nav ? {
          domContentLoaded: nav.domContentLoadedEventEnd,
          loadComplete: nav.loadEventEnd,
          domInteractive: nav.domInteractive,
          responseEnd: nav.responseEnd,
        } : null,
        resources: resources.map(r => ({
          name: r.name.split('/').pop(),
          duration: Math.round(r.duration),
          type: r.initiatorType,
        })).filter(r => r.duration > 5).sort((a, b) => b.duration - a.duration).slice(0, 15),
      };
    } catch(e) { return { error: e.message }; }
  })()`);

  // Take screenshot
  await window.screenshot({ path: path.join(OUTPUT_DIR, `run-${runIndex + 1}.png`) });

  await electronApp.close();
  times.closed = performance.now();

  return { times, rendererTimestamps, consoleLogs, domStats, perfEntries };
}

(async () => {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ELECTRON LAUNCH BENCHMARK');
  console.log(`  Runs: ${NUM_RUNS} (cold start, cache cleared each time)`);
  console.log('══════════════════════════════════════════════════\n');

  const results = [];

  for (let i = 0; i < NUM_RUNS; i++) {
    console.log(`── Run ${i + 1}/${NUM_RUNS} ──`);
    const result = await benchmarkRun(i);
    results.push(result);

    const t = result.times;
    const base = t.benchStart;

    console.log(`  Electron launched:   +${(t.electronLaunched - base).toFixed(0)}ms`);
    console.log(`  First window:        +${(t.firstWindowObtained - base).toFixed(0)}ms`);
    console.log(`  Editor #editor ready:+${(t.editorReady - base).toFixed(0)}ms`);
    console.log(`  Settled (all init):  +${(t.settled - base).toFixed(0)}ms`);

    // Renderer performance entries
    if (result.perfEntries?.navigation) {
      const nav = result.perfEntries.navigation;
      console.log(`  [Renderer] DOMContentLoaded: ${nav.domContentLoaded.toFixed(0)}ms`);
      console.log(`  [Renderer] DOM interactive:  ${nav.domInteractive.toFixed(0)}ms`);
      console.log(`  [Renderer] Load complete:    ${nav.loadComplete.toFixed(0)}ms`);
    }

    // Slow resources
    if (result.perfEntries?.resources?.length > 0) {
      console.log(`  [Renderer] Slowest resources:`);
      result.perfEntries.resources.slice(0, 8).forEach(r => {
        console.log(`    ${r.duration}ms ${r.type.padEnd(8)} ${r.name}`);
      });
    }

    // DOM stats
    console.log(`  [DOM] Elements: ${result.domStats.totalElements}, Editor children: ${result.domStats.editorChildren}`);
    console.log(`  [DOM] Scripts: ${result.domStats.scriptTags}, Stylesheets: ${result.domStats.stylesheets}`);

    console.log('');
  }

  // Summary across runs
  console.log('══════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('══════════════════════════════════════════════════\n');

  const editorReadyTimes = results.map(r => r.times.editorReady - r.times.benchStart);
  const launchTimes = results.map(r => r.times.electronLaunched - r.times.benchStart);
  const windowTimes = results.map(r => r.times.firstWindowObtained - r.times.benchStart);

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);

  console.log(`  Electron launch:    avg=${avg(launchTimes).toFixed(0)}ms  min=${min(launchTimes).toFixed(0)}ms  max=${max(launchTimes).toFixed(0)}ms`);
  console.log(`  First window:       avg=${avg(windowTimes).toFixed(0)}ms  min=${min(windowTimes).toFixed(0)}ms  max=${max(windowTimes).toFixed(0)}ms`);
  console.log(`  Editor ready:       avg=${avg(editorReadyTimes).toFixed(0)}ms  min=${min(editorReadyTimes).toFixed(0)}ms  max=${max(editorReadyTimes).toFixed(0)}ms`);

  // Render-side DOMContentLoaded averages
  const dclTimes = results.map(r => r.perfEntries?.navigation?.domContentLoaded).filter(Boolean);
  if (dclTimes.length > 0) {
    console.log(`  DCL (renderer):     avg=${avg(dclTimes).toFixed(0)}ms  min=${min(dclTimes).toFixed(0)}ms  max=${max(dclTimes).toFixed(0)}ms`);
  }

  const loadTimes = results.map(r => r.perfEntries?.navigation?.loadComplete).filter(Boolean);
  if (loadTimes.length > 0) {
    console.log(`  Load complete:      avg=${avg(loadTimes).toFixed(0)}ms  min=${min(loadTimes).toFixed(0)}ms  max=${max(loadTimes).toFixed(0)}ms`);
  }

  // All console logs from last run
  console.log('\n── Renderer Console (last run, first 2s) ──');
  const lastRun = results[results.length - 1];
  const base = lastRun.times.benchStart;
  lastRun.consoleLogs
    .filter(l => (l.ts - base) < 3000)
    .forEach(l => console.log(`  +${(l.ts - base).toFixed(0)}ms  ${l.text}`));

  // Slowest resources aggregated
  console.log('\n── Slowest Resources (avg across runs) ──');
  const resourceMap = {};
  results.forEach(r => {
    (r.perfEntries?.resources || []).forEach(res => {
      if (!resourceMap[res.name]) resourceMap[res.name] = [];
      resourceMap[res.name].push(res.duration);
    });
  });
  Object.entries(resourceMap)
    .sort((a, b) => avg(b[1]) - avg(a[1]))
    .slice(0, 10)
    .forEach(([name, durations]) => {
      console.log(`  ${avg(durations).toFixed(0)}ms avg  ${name}`);
    });

  // Save full results
  const reportPath = path.join(OUTPUT_DIR, 'benchmark-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results.map(r => ({
    times: Object.fromEntries(Object.entries(r.times).map(([k, v]) => [k, v - r.times.benchStart])),
    rendererTimestamps: r.rendererTimestamps,
    domStats: r.domStats,
    perfEntries: r.perfEntries,
  })), null, 2));
  console.log(`\n  Full report: ${reportPath}`);

  console.log('\n[DONE]\n');
  clearDir(TEMP_DATA);
})();
