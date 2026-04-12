/**
 * CAPTURE_FN — Injected into the browser via page.evaluate().
 * Reads #editor DOM, localStorage, SVG mask state.
 * Returns a structured snapshot per the dom-state-capture-guide spec.
 *
 * RULES:
 *  - ES5 syntax only (serialized across process boundary)
 *  - No side effects (read-only)
 *  - Self-contained (no closures, no imports)
 *  - Tolerant of missing elements (never throw)
 */

const CAPTURE_FN = `(function() {
  function qsa(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }
  function qs(root, sel) { return root.querySelector(sel); }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
  }

  function getText(el) {
    return el ? (el.textContent || '').trim().substring(0, 300) : '';
  }

  function getAttr(el, attr) {
    return el ? (el.getAttribute(attr) || '') : '';
  }

  function countChar(str, ch) {
    var c = 0;
    for (var i = 0; i < str.length; i++) {
      if (str[i] === ch) c++;
    }
    return c;
  }

  function countZwsp(el) {
    try {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var count = 0;
      var node;
      while (node = walker.nextNode()) {
        count += countChar(node.textContent, '\\u200B');
      }
      return count;
    } catch(e) { return 0; }
  }

  function buildListItems(listEl, baseId, level) {
    var items = [];
    var directLis = [];
    for (var c = 0; c < listEl.children.length; c++) {
      if (listEl.children[c].tagName === 'LI') {
        directLis.push(listEl.children[c]);
      }
    }
    for (var i = 0; i < directLis.length; i++) {
      var li = directLis[i];
      var id = baseId + '-' + i;
      var text = '';
      for (var n = 0; n < li.childNodes.length; n++) {
        var child = li.childNodes[n];
        if (child.nodeType === 3) text += child.textContent;
        else if (child.nodeType === 1 && child.tagName !== 'UL' && child.tagName !== 'OL') {
          text += child.textContent;
        }
      }
      text = text.trim().substring(0, 200);
      var subList = qs(li, 'ul') || qs(li, 'ol');
      var subItems = subList ? buildListItems(subList, id, level + 1) : [];
      items.push({
        id: id, position: i, contentHash: hashStr(text),
        textLength: text.length, isEmpty: text.length === 0,
        nestingLevel: level, subItems: subItems
      });
    }
    return items;
  }

  function getMaxDepth(items, currentMax) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].nestingLevel > currentMax) currentMax = items[i].nestingLevel;
      if (items[i].subItems.length > 0) {
        currentMax = getMaxDepth(items[i].subItems, currentMax);
      }
    }
    return currentMax;
  }

  // ── Visual Layer ──
  var editor = document.getElementById('editor');
  var blocks = [];

  if (editor) {
    var children = editor.children;
    for (var i = 0; i < children.length; i++) {
      var el = children[i];
      var tag = el.tagName ? el.tagName.toLowerCase() : 'unknown';
      var text = getText(el);
      var blockId = 'block-' + i;

      var marker = qs(el, '.heading-marker');
      var hasMarker = !!marker;
      var markerText = marker ? getText(marker) : '';
      var markerEditable = marker ? getAttr(marker, 'contenteditable') !== 'false' : false;
      var headingTextAfterMarker = '';
      if (hasMarker && marker.nextSibling) {
        headingTextAfterMarker = (marker.nextSibling.textContent || '').replace(/^\\u200B/, '').substring(0, 100);
      }

      var listItems = [];
      var maxNestingDepth = 0;
      if (tag === 'ul' || tag === 'ol') {
        listItems = buildListItems(el, 'li-' + i, 0);
        maxNestingDepth = getMaxDepth(listItems, 0);
      }

      var boldEls = qsa(el, 'b, strong');
      var italicEls = qsa(el, 'i, em');
      var strikeEls = qsa(el, 's');
      var emptyInlineCount = 0;
      var allInline = [].concat(boldEls, italicEls, strikeEls);
      for (var j = 0; j < allInline.length; j++) {
        var inlineText = (allInline[j].textContent || '').replace(/\\u200B/g, '');
        if (inlineText.length === 0) emptyInlineCount++;
      }

      blocks.push({
        type: tag, id: blockId, position: i,
        contentHash: hashStr(text),
        visible: el.offsetParent !== null || el.offsetHeight > 0,
        textLength: text.length,
        isEmpty: text.replace(/\\u200B/g, '').length === 0,
        hasBr: !!qs(el, 'br'),
        hasMarker: hasMarker, markerText: markerText,
        markerEditable: markerEditable,
        headingTextAfterMarker: headingTextAfterMarker,
        listItems: listItems, maxNestingDepth: maxNestingDepth,
        boldCount: boldEls.length, italicCount: italicEls.length,
        strikeCount: strikeEls.length, emptyInlineCount: emptyInlineCount,
        zwspCount: countZwsp(el), children: []
      });
    }
  }

  // Caret
  var caretBlock = null;
  try {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editor) {
      var current = sel.anchorNode;
      while (current && current.parentNode !== editor) { current = current.parentNode; }
      if (current && current.parentNode === editor) {
        caretBlock = [].indexOf.call(editor.children, current);
      }
    }
  } catch(e) {}

  // Focus mode
  var focusToggle = document.getElementById('focus-toggle');
  var focusLine = document.getElementById('focus-line');
  var editorWrapper = qs(document, '.editor-wrapper');
  var maskImage = '';
  try {
    // Check inline style first (where focusMode.js sets it directly)
    if (editorWrapper) {
      maskImage = editorWrapper.style.maskImage || editorWrapper.style.webkitMaskImage || '';
    }
    // Fallback to computed style
    if (!maskImage || maskImage === 'none') {
      if (editorWrapper) {
        var ws = window.getComputedStyle(editorWrapper);
        maskImage = ws.maskImage || ws.webkitMaskImage || ws.getPropertyValue('-webkit-mask-image') || '';
      }
    }
    if (!maskImage || maskImage === 'none') {
      if (editor) {
        maskImage = editor.style.maskImage || editor.style.webkitMaskImage || '';
      }
    }
  } catch(e) {}
  var focusState = {
    toggleChecked: focusToggle ? focusToggle.checked : false,
    maskApplied: maskImage.indexOf('url') !== -1,
    focusLineY: focusLine ? parseFloat(focusLine.getAttribute('y') || '0') : 0,
    focusLineHeight: focusLine ? parseFloat(focusLine.getAttribute('height') || '0') : 0,
    focusLineWidth: focusLine ? parseFloat(focusLine.getAttribute('width') || '0') : 0,
    maskBaseOpacity: 0
  };
  try {
    var maskBase = document.getElementById('mask-base');
    if (maskBase) {
      var fill = maskBase.getAttribute('fill') || '';
      var match = fill.match(/[\\d.]+/g);
      if (match && match.length >= 4) focusState.maskBaseOpacity = parseFloat(match[3]);
    }
  } catch(e) {}

  // Toolbar
  var toolbar = document.getElementById('toolbar');
  var toolbarState = {
    isExpanded: toolbar ? toolbar.classList.contains('is-toolbar-active') : false,
    focusToggleChecked: focusToggle ? focusToggle.checked : false
  };

  // Modal
  var modalOverlay = document.getElementById('document-modal-overlay');
  var docGrid = document.getElementById('document-grid');
  var storageBar = document.getElementById('storage-progress-bar');
  var modalState = {
    isOpen: false,
    thumbnailCount: docGrid ? docGrid.children.length : 0,
    storagePercent: storageBar ? parseFloat(storageBar.style.width || '0') : 0
  };
  try {
    if (modalOverlay) {
      var mStyle = window.getComputedStyle(modalOverlay);
      modalState.isOpen = mStyle.display !== 'none' && mStyle.visibility !== 'hidden';
    }
  } catch(e) {}

  var theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';

  var visual = {
    blockCount: blocks.length,
    viewportState: blocks.length === 0 ? 'empty' : 'has-content',
    blocks: blocks, focusMode: focusState, toolbar: toolbarState,
    modal: modalState, theme: theme, caretBlock: caretBlock
  };

  // ── Store Layer ──
  var storeState = null;
  try {
    var docsRaw = localStorage.getItem('mdFocusEditorDocs') || localStorage.getItem('markdownFocusEditorDocs');
    var docs = docsRaw ? JSON.parse(docsRaw) : [];
    var currentDocId = localStorage.getItem('currentDocId');
    var currentDoc = null;
    for (var d = 0; d < docs.length; d++) {
      if (docs[d].id === currentDocId) { currentDoc = docs[d]; break; }
    }
    var storageBytes = 0;
    for (var k = 0; k < localStorage.length; k++) {
      var key = localStorage.key(k);
      storageBytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
    storeState = {
      currentDocId: currentDocId || null,
      currentDocName: currentDoc ? (currentDoc.name || currentDoc.title || '') : '',
      documentCount: docs.length,
      storageUsedBytes: storageBytes,
      storageLimitBytes: 5242880,
      focusEnabled: localStorage.getItem('focusEnabled') === 'true',
      fontSize: parseInt(localStorage.getItem('fontSize') || '16', 10),
      theme: localStorage.getItem('theme') || 'light',
      storedContentHash: currentDoc ? hashStr(currentDoc.content || '') : 0,
      undoStackDepth: 0,
      redoStackDepth: 0
    };
  } catch(e) {
    storeState = {
      currentDocId: null, currentDocName: '', documentCount: 0,
      storageUsedBytes: 0, storageLimitBytes: 5242880,
      focusEnabled: false, fontSize: 16, theme: 'light',
      storedContentHash: 0, undoStackDepth: 0, redoStackDepth: 0
    };
  }

  // ── Inline Anomalies ──
  var anomalies = [];
  var bodyText = editor ? (editor.textContent || '').substring(0, 5000) : '';

  if (bodyText.indexOf('[object Object]') !== -1) {
    anomalies.push({ code: 'OBJECT_OBJECT_VISIBLE', severity: 'critical', category: 'rendering', message: '[object Object] visible in editor', trigger: 'capture' });
  }
  if (editor && editor.querySelectorAll('script').length > 0) {
    anomalies.push({ code: 'SCRIPT_TAG_IN_EDITOR', severity: 'critical', category: 'security', message: '<script> tag in editor DOM', trigger: 'capture' });
  }
  if (editor) {
    for (var t = 0; t < editor.childNodes.length; t++) {
      var cn = editor.childNodes[t];
      if (cn.nodeType === 3 && cn.textContent.trim().length > 0) {
        anomalies.push({ code: 'ORPHAN_TEXT_NODE', severity: 'critical', category: 'structure', message: 'Bare text node: "' + cn.textContent.trim().substring(0, 50) + '"', trigger: 'capture' });
      }
    }
  }
  for (var h = 0; h < blocks.length; h++) {
    var b = blocks[h];
    if (/^h[1-6]$/.test(b.type)) {
      if (!b.hasMarker) anomalies.push({ code: 'HEADING_MISSING_MARKER', severity: 'critical', category: 'structure', message: b.type.toUpperCase() + ' at pos ' + b.position + ' missing marker', trigger: 'capture' });
      if (b.hasMarker && b.markerEditable) anomalies.push({ code: 'HEADING_MARKER_EDITABLE', severity: 'critical', category: 'structure', message: b.type.toUpperCase() + ' marker at pos ' + b.position + ' is editable', trigger: 'capture' });
      if (b.hasBr) anomalies.push({ code: 'BR_IN_HEADING', severity: 'warning', category: 'structure', message: b.type.toUpperCase() + ' at pos ' + b.position + ' has <br>', trigger: 'capture' });
    }
  }
  var allLis = editor ? qsa(editor, 'li') : [];
  for (var li = 0; li < allLis.length; li++) {
    var par = allLis[li].parentElement;
    if (!par || (par.tagName !== 'UL' && par.tagName !== 'OL')) {
      anomalies.push({ code: 'ORPHAN_LIST_ITEM', severity: 'critical', category: 'structure', message: '<li> not inside <ul>/<ol>', trigger: 'capture' });
    }
  }
  var totalEmpty = 0;
  for (var ei = 0; ei < blocks.length; ei++) totalEmpty += blocks[ei].emptyInlineCount;
  if (totalEmpty > 0) {
    anomalies.push({ code: 'EMPTY_STYLE_WRAPPER', severity: 'warning', category: 'style', message: totalEmpty + ' empty inline wrappers', trigger: 'capture' });
  }
  if (!focusState.toggleChecked && focusState.maskApplied) {
    anomalies.push({ code: 'FOCUS_MASK_WHEN_TOGGLE_OFF', severity: 'critical', category: 'focus', message: 'Mask on but toggle off', trigger: 'capture' });
  }
  if (focusState.toggleChecked && !focusState.maskApplied && blocks.length > 0) {
    anomalies.push({ code: 'FOCUS_MASK_MISSING_WHEN_ON', severity: 'warning', category: 'focus', message: 'Toggle on but mask not applied', trigger: 'capture' });
  }

  return { timestamp: Date.now(), visual: visual, store: storeState, anomalies: anomalies };
})()`;

module.exports = { CAPTURE_FN };
