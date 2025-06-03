class CaretLineFocus {
  constructor(editableElement, options = {}) {
    this.el = editableElement;
    this.options = Object.assign({
      classAbove: 'focus-above',
      classCurrent: 'focus-current',
      classBelow: 'focus-below'
    }, options);

    this._handleSelectionChange = this._handleSelectionChange.bind(this);
    document.addEventListener('selectionchange', this._handleSelectionChange);
  }

  destroy() {
    document.removeEventListener('selectionchange', this._handleSelectionChange);
    this._clearFocus();
  }

  _handleSelectionChange() {
    if (!this.el.contains(document.activeElement)) return;
    this._applyFocusToLines();
  }

  _clearFocus() {
    const { classAbove, classCurrent, classBelow } = this.options;
    this.el.querySelectorAll(`.${classAbove}, .${classCurrent}, .${classBelow}`).forEach(span => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
      parent.normalize();
    });
  }

  _wrapRangeWithSpan(range, className) {
    const span = document.createElement('span');
    span.className = className;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
  }

  _applyFocusToLines() {
    this._clearFocus();

    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const caretRange = sel.getRangeAt(0).cloneRange();
    caretRange.collapse(true);
    const rects = [...caretRange.getClientRects()];
    if (!rects.length) return;

    const currentTop = rects[0].top;

    const allTextNodes = [];
    const walker = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) allTextNodes.push(walker.currentNode);

    const lineRects = {
      above: [],
      current: [],
      below: []
    };

    for (const node of allTextNodes) {
      for (let i = 0; i < node.length; i++) {
        const r = document.createRange();
        r.setStart(node, i);
        r.setEnd(node, i + 1);
        const rectList = r.getClientRects();
        if (!rectList.length) continue;

        const rect = rectList[0];
        const delta = rect.top - currentTop;

        if (Math.abs(delta) < 1) lineRects.current.push(r.cloneRange());
        else if (delta < 0 && !lineRects.above.length) lineRects.above.push(r.cloneRange());
        else if (delta > 0 && !lineRects.below.length) lineRects.below.push(r.cloneRange());
      }
    }

    const applyFocus = (group, className) => {
      const ranges = lineRects[group];
      if (!ranges.length) return;

      const first = ranges[0];
      const last = ranges[ranges.length - 1];
      const fullRange = document.createRange();
      fullRange.setStart(first.startContainer, first.startOffset);
      fullRange.setEnd(last.endContainer, last.endOffset);

      this._wrapRangeWithSpan(fullRange, className);
    };

    applyFocus('above', this.options.classAbove);
    applyFocus('current', this.options.classCurrent);
    applyFocus('below', this.options.classBelow);
  }
}
