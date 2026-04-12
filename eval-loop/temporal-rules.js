/**
 * Temporal invariant rule checkers.
 * Run over the mutation timeline to catch violations that span multiple frames.
 */

// ── Rule 1: Block type transitions must follow allowed paths ──
function checkBlockTypeTransitions(mutations) {
  const valid = {
    div: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'],
    h1: ['div'], h2: ['div'], h3: ['div'],
    h4: ['div'], h5: ['div'], h6: ['div'],
    ul: ['div'], ol: ['div'],
  };
  return mutations
    .filter((m) => m.field === 'type')
    .filter((m) => {
      const allowed = valid[m.oldValue] || [];
      return allowed.indexOf(m.newValue) === -1;
    })
    .map((m) => ({
      code: 'ILLEGAL_BLOCK_TRANSITION',
      severity: 'critical',
      category: 'temporal',
      message: `Block "${m.nodeId}" transitioned ${m.oldValue} → ${m.newValue} (not allowed) at frame ${m.frameId}`,
      trigger: `frame-${m.frameId}`,
    }));
}

// ── Rule 2: Heading creation must be paired with marker appearance ──
function checkMarkerAppearance(mutations) {
  const anomalies = [];
  const pending = {};

  for (const m of mutations) {
    if (m.field === 'type' && /^h[1-6]$/.test(m.newValue)) {
      pending[m.nodeId] = m.frameId;
    }
    if (m.field === 'hasMarker' && m.newValue === true && pending[m.nodeId] != null) {
      delete pending[m.nodeId];
    }
  }

  for (const id in pending) {
    anomalies.push({
      code: 'HEADING_CREATED_WITHOUT_MARKER',
      severity: 'critical',
      category: 'temporal',
      message: `${id} became heading at frame ${pending[id]} but never got a marker`,
      trigger: `frame-${pending[id]}`,
    });
  }
  return anomalies;
}

// ── Rule 3: ZWSP count should not grow unboundedly ──
function checkZwspGrowth(mutations) {
  const anomalies = [];
  for (const m of mutations) {
    if (m.field === 'zwspCount' && typeof m.newValue === 'number' && m.newValue > 10) {
      anomalies.push({
        code: 'ZWSP_OVERFLOW',
        severity: 'warning',
        category: 'temporal',
        message: `${m.nodeId} has ${m.newValue} ZWSPs at frame ${m.frameId}`,
        trigger: `frame-${m.frameId}`,
      });
    }
  }
  return anomalies;
}

// ── Rule 4: Blocks should not disappear without user action ──
function checkBlockDisappearance(mutations) {
  return mutations
    .filter((m) => m.field === 'existence' && m.newValue === null)
    .map((m) => ({
      code: 'BLOCK_DISAPPEARED',
      severity: 'info',
      category: 'temporal',
      message: `${m.nodeType} "${m.nodeId}" disappeared at frame ${m.frameId}`,
      trigger: `frame-${m.frameId}`,
    }));
}

// ── All temporal checkers as an array ──
const ALL_TEMPORAL_CHECKERS = [
  checkBlockTypeTransitions,
  checkMarkerAppearance,
  checkZwspGrowth,
  checkBlockDisappearance,
];

module.exports = {
  checkBlockTypeTransitions,
  checkMarkerAppearance,
  checkZwspGrowth,
  checkBlockDisappearance,
  ALL_TEMPORAL_CHECKERS,
};
