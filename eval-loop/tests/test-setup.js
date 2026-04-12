/**
 * Eval-loop test setup: shared page launch, editor focus, output directory.
 * Each scenario file imports this for consistent setup.
 */
const { test: base } = require('@playwright/test');
const path = require('path');
const {
  createTimeline, resetFrameCounter, capture, waitForStability,
  recordAction, screenshotFrame, finalize, wait,
} = require('../helpers');
const { ALL_TEMPORAL_CHECKERS } = require('../temporal-rules');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX_URL = '/index.html'; // Served via webServer in playwright.config.js
const OUTPUT_ROOT = path.join(ROOT, 'test-results', 'editor-eval');

/**
 * Run a complete eval-loop scenario.
 *
 * @param {string} tfId    - e.g. "TF-03"
 * @param {string} title   - e.g. "Heading Creation"
 * @param {string} category - e.g. "B. Block Transformations"
 * @param {(ctx: {page: import('@playwright/test').Page, timeline: any, cap: Function, rec: Function}) => Promise<void>} scenarioFn
 */
function evalTest(tfId, title, category, scenarioFn) {
  base(`eval: ${tfId} — ${title}`, async ({ page }) => {
    base.setTimeout(120_000);

    // Navigate and wait for editor
    await page.goto(INDEX_URL);
    await page.waitForSelector('#editor', { timeout: 15_000 });
    await page.click('#editor');
    await wait(300); // Let modules initialize

    // Create timeline
    resetFrameCounter();
    const timeline = createTimeline(tfId, title, category);
    timeline.metadata.browser = 'Chromium';

    // Shorthand helpers bound to this page + timeline
    const cap = (trigger) => capture(page, timeline, trigger);
    const rec = (step, action, detail) => recordAction(timeline, step, action, detail);

    // Run the scenario
    await scenarioFn({ page, timeline, cap, rec });

    // Stability wait
    await waitForStability(page, timeline, { threshold: 8, maxWaitMs: 5000 });

    // Final screenshot
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(OUTPUT_ROOT, `${tfId}-${ts}`);
    await screenshotFrame(page, outputDir, timeline.frames[timeline.frames.length - 1]);

    // Finalize: mutations, anomaly report, write artifacts
    const report = finalize(timeline, outputDir, ALL_TEMPORAL_CHECKERS);

    // Log verdict
    console.log(`\n  ${tfId} verdict: ${report.verdict} (C:${report.summary.critical} W:${report.summary.warning} I:${report.summary.info})`);
  });
}

module.exports = { evalTest, wait };
