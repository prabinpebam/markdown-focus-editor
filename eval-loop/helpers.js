/**
 * Eval-loop helpers: timeline management, fingerprinting, stability detection,
 * anomaly aggregation, and artifact writing.
 */
const fs = require('fs');
const path = require('path');
const { CAPTURE_FN } = require(path.join(__dirname, 'capture-fn'));

// ── Timeline creation ──

function createTimeline(taskflowId, title, category) {
  return {
    schema: 'md-focus-editor-timeline/1.0',
    metadata: {
      taskflow: taskflowId,
      title,
      category,
      browser: '',
      startTimestamp: Date.now(),
      totalFrames: 0,
      totalDurationMs: 0,
      captureIntervalMs: 200,
      stabilityThresholdPolls: 10,
      userActions: [],
    },
    frames: [],
    mutations: [],
    anomalyReport: { verdict: 'PENDING', summary: { critical: 0, warning: 0, info: 0 }, anomalies: [] },
  };
}

// ── Snapshot capture ──

let _frameCounter = 0;
let _startTime = 0;

function resetFrameCounter() {
  _frameCounter = 0;
  _startTime = Date.now();
}

async function capture(page, timeline, trigger) {
  const snapshot = await page.evaluate(CAPTURE_FN);
  snapshot.frameId = _frameCounter++;
  snapshot.elapsedMs = Date.now() - _startTime;
  snapshot.trigger = trigger;
  // Tag inline anomalies with frame reference
  for (const a of snapshot.anomalies) {
    a.trigger = `frame-${snapshot.frameId}`;
  }
  timeline.frames.push(snapshot);
  timeline.metadata.totalFrames = timeline.frames.length;
  timeline.metadata.totalDurationMs = snapshot.elapsedMs;
  return snapshot;
}

// ── Fingerprinting (structural change detection) ──

function buildFingerprint(visual) {
  return JSON.stringify({
    blocks: visual.blocks.map(function (b) {
      return {
        type: b.type,
        hasMarker: b.hasMarker,
        isEmpty: b.isEmpty,
        listItemCount: b.listItems ? b.listItems.length : 0,
        boldCount: b.boldCount,
        italicCount: b.italicCount,
        strikeCount: b.strikeCount,
      };
    }),
    focusEnabled: visual.focusMode.toggleChecked,
    focusY: Math.round(visual.focusMode.focusLineY / 10) * 10,
    modalOpen: visual.modal.isOpen,
    theme: visual.theme,
  });
}

// ── Stability-awaited capture loop ──

async function waitForStability(page, timeline, opts = {}) {
  const interval = opts.intervalMs || 200;
  const threshold = opts.threshold || 10;
  const maxWait = opts.maxWaitMs || 10000;

  let lastFp = '';
  let stableCount = 0;
  const start = Date.now();

  while (stableCount < threshold && Date.now() - start < maxWait) {
    const snap = await capture(page, timeline, 'poll-200ms');
    const fp = buildFingerprint(snap.visual);
    if (fp !== lastFp) {
      stableCount = 0;
      lastFp = fp;
    } else {
      stableCount++;
    }
    await page.waitForTimeout(interval);
  }
  // Mark last frame as stable
  if (timeline.frames.length > 0) {
    timeline.frames[timeline.frames.length - 1].trigger = 'stable';
  }
}

// ── Record a user action in the metadata ──

function recordAction(timeline, step, action, detail) {
  timeline.metadata.userActions.push({
    step,
    action,
    detail,
    atMs: Date.now() - _startTime,
  });
}

// ── Small wait helper ──

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Screenshot at key frames ──

async function screenshotFrame(page, outputDir, frame) {
  const name = `frame-${String(frame.frameId).padStart(4, '0')}-${frame.trigger}.png`;
  await page.screenshot({ path: path.join(outputDir, 'screenshots', name), fullPage: true });
}

// ── Finalize: build mutations, aggregate anomalies, write files ──

function finalize(timeline, outputDir, temporalCheckers = []) {
  // Build mutation timeline
  timeline.mutations = buildMutationTimeline(timeline.frames);

  // Aggregate all inline anomalies from all frames
  const allAnomalies = [];
  for (const frame of timeline.frames) {
    for (const a of frame.anomalies) {
      allAnomalies.push(a);
    }
  }

  // Run temporal checkers
  for (const checker of temporalCheckers) {
    const found = checker(timeline.mutations);
    allAnomalies.push(...found);
  }

  const critical = allAnomalies.filter((a) => a.severity === 'critical').length;
  const warning = allAnomalies.filter((a) => a.severity === 'warning').length;
  const info = allAnomalies.filter((a) => a.severity === 'info').length;

  timeline.anomalyReport = {
    verdict: critical === 0 && warning === 0 ? 'CLEAN' : 'FAIL',
    summary: { critical, warning, info },
    anomalies: allAnomalies,
  };

  // Write artifacts
  fs.mkdirSync(path.join(outputDir, 'screenshots'), { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'timeline.json'), JSON.stringify(timeline, null, 2));
  fs.writeFileSync(path.join(outputDir, 'mutations.json'), JSON.stringify(timeline.mutations, null, 2));
  fs.writeFileSync(
    path.join(outputDir, 'anomaly-report.json'),
    JSON.stringify(timeline.anomalyReport, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(timeline.metadata, null, 2)
  );

  return timeline.anomalyReport;
}

// ── Mutation timeline builder ──

function buildMutationTimeline(frames) {
  const mutations = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1];
    const curr = frames[i];
    const prevBlocks = prev.visual.blocks;
    const currBlocks = curr.visual.blocks;
    const maxLen = Math.max(prevBlocks.length, currBlocks.length);

    for (let b = 0; b < maxLen; b++) {
      const prevB = b < prevBlocks.length ? prevBlocks[b] : null;
      const currB = b < currBlocks.length ? currBlocks[b] : null;

      if (!prevB && currB) {
        mutations.push({
          frameId: i, timestamp: curr.timestamp, nodeId: currB.id, nodeType: currB.type,
          field: 'existence', oldValue: null, newValue: 'created', parentId: 'editor', parentType: 'editor',
        });
        continue;
      }
      if (prevB && !currB) {
        mutations.push({
          frameId: i, timestamp: curr.timestamp, nodeId: prevB.id, nodeType: prevB.type,
          field: 'existence', oldValue: 'present', newValue: null, parentId: 'editor', parentType: 'editor',
        });
        continue;
      }
      if (prevB && currB) {
        const fields = ['type', 'contentHash', 'hasMarker', 'boldCount', 'italicCount',
          'strikeCount', 'zwspCount', 'emptyInlineCount', 'textLength', 'isEmpty', 'hasBr'];
        for (const f of fields) {
          if (prevB[f] !== currB[f]) {
            mutations.push({
              frameId: i, timestamp: curr.timestamp, nodeId: currB.id, nodeType: currB.type,
              field: f, oldValue: prevB[f], newValue: currB[f], parentId: 'editor', parentType: 'editor',
            });
          }
        }
      }
    }

    // Focus mode changes
    if (prev.visual.focusMode.toggleChecked !== curr.visual.focusMode.toggleChecked) {
      mutations.push({
        frameId: i, timestamp: curr.timestamp, nodeId: 'focus-mode', nodeType: 'focus',
        field: 'toggleChecked', oldValue: prev.visual.focusMode.toggleChecked,
        newValue: curr.visual.focusMode.toggleChecked, parentId: 'editor', parentType: 'editor',
      });
    }
    // Modal changes
    if (prev.visual.modal.isOpen !== curr.visual.modal.isOpen) {
      mutations.push({
        frameId: i, timestamp: curr.timestamp, nodeId: 'modal', nodeType: 'modal',
        field: 'isOpen', oldValue: prev.visual.modal.isOpen,
        newValue: curr.visual.modal.isOpen, parentId: 'editor', parentType: 'editor',
      });
    }
    // Theme changes
    if (prev.visual.theme !== curr.visual.theme) {
      mutations.push({
        frameId: i, timestamp: curr.timestamp, nodeId: 'theme', nodeType: 'theme',
        field: 'theme', oldValue: prev.visual.theme,
        newValue: curr.visual.theme, parentId: 'editor', parentType: 'editor',
      });
    }
  }
  return mutations;
}

module.exports = {
  createTimeline,
  resetFrameCounter,
  capture,
  buildFingerprint,
  waitForStability,
  recordAction,
  wait,
  screenshotFrame,
  finalize,
  buildMutationTimeline,
};
