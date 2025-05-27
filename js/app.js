// Helpers to save/restore selection state
function getSelectionState(el) {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
      // Fallback to localStorage if available for initial load or if selection is lost
      const sLine = parseInt(localStorage.getItem(localStorageSelectionStartLineKey), 10) || 0;
      const sOffset = parseInt(localStorage.getItem(localStorageSelectionStartOffsetKey), 10) || 0;
      const eLine = parseInt(localStorage.getItem(localStorageSelectionEndLineKey), 10) || sLine;
      const eOffset = parseInt(localStorage.getItem(localStorageSelectionEndOffsetKey), 10) || sOffset;
      const isCollapsed = localStorage.getItem(localStorageSelectionIsCollapsedKey) === 'true' || (sLine === eLine && sOffset === eOffset);
      return { startLineIndex: sLine, startOffsetInLine: sOffset, endLineIndex: eLine, endOffsetInLine: eOffset, isCollapsed: isCollapsed };
    }

    const range = selection.getRangeAt(0);

    // Helper to convert a DOM point (container + offset) to lineIndex and charOffsetInLine
    function getCoordsFromDomPoint(container, offsetInContainer, editorElement) {
      let lineElement = container;
      let charOffset = 0;

      // Traverse upwards to find the line's DIV element
      let tempNode = container;
      while (tempNode && tempNode.parentNode !== editorElement) {
        tempNode = tempNode.parentNode;
      }
      lineElement = tempNode;

      if (!lineElement || lineElement.parentNode !== editorElement) { // Should be a direct child DIV
        if (editorElement.childNodes.length > 0) lineElement = editorElement.childNodes[0];
        else return { lineIndex: 0, offsetInLine: 0 }; // Editor is empty
      }

      const lineIndex = Array.from(editorElement.childNodes).indexOf(lineElement);

      // Calculate character offset from the start of the lineElement to the container/offsetInContainer point
      const treeWalker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT, null);
      let currentNode;
      let accumulatedOffset = 0;
      let found = false;
      while (currentNode = treeWalker.nextNode()) {
        if (currentNode === container) {
          accumulatedOffset += offsetInContainer;
          found = true;
          break;
        }
        accumulatedOffset += currentNode.textContent.length;
      }
      
      if (!found) {
          // If container is the lineElement itself, offsetInContainer is a child index.
          if (container === lineElement) {
              accumulatedOffset = 0;
              for (let i = 0; i < offsetInContainer; i++) {
                  if (lineElement.childNodes[i]) {
                       accumulatedOffset += lineElement.childNodes[i].textContent.length;
                  }
              }
          } else {
               // Fallback if point is not directly in a text node child of a line div
               // This might happen with empty lines or complex structures not yet handled.
               // For a simple text node, offsetInContainer is already the char offset.
               if(container.nodeType === Node.TEXT_NODE) accumulatedOffset = offsetInContainer;
               else accumulatedOffset = 0;
          }
      }
      charOffset = accumulatedOffset;
      return { lineIndex: lineIndex < 0 ? 0 : lineIndex, offsetInLine: charOffset };
    }

    const startDetails = getCoordsFromDomPoint(range.startContainer, range.startOffset, el);
    const endDetails = range.collapsed ? startDetails : getCoordsFromDomPoint(range.endContainer, range.endOffset, el);

    return {
      startLineIndex: startDetails.lineIndex,
      startOffsetInLine: startDetails.offsetInLine,
      endLineIndex: endDetails.lineIndex,
      endOffsetInLine: endDetails.offsetInLine,
      isCollapsed: range.collapsed
    };
  }

  function setSelectionState(el, state) {
    el.focus();
    const selection = window.getSelection();
    const range = document.createRange();

    function findTextNodeAndInternalOffset(lineIndex, charOffsetInLineOverall) {
      if (lineIndex >= el.childNodes.length || lineIndex < 0) {
        lineIndex = Math.max(0, Math.min(lineIndex, el.childNodes.length - 1));
        if (el.childNodes.length === 0) return { node: el, offset: 0 }; // Editor empty
      }
      const lineElement = el.childNodes[lineIndex];
      if (!lineElement) return { node: el, offset: 0 }; // Should not happen

      let currentTextCharOffset = 0;
      const treeWalker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT, null);
      let walkerNode;
      while (walkerNode = treeWalker.nextNode()) {
        const nodeLength = walkerNode.textContent.length;
        if (currentTextCharOffset + nodeLength >= charOffsetInLineOverall) {
          return { node: walkerNode, offset: charOffsetInLineOverall - currentTextCharOffset };
        }
        currentTextCharOffset += nodeLength;
      }
      // If offset is beyond content, or line is empty/has no text nodes
      if (lineElement.firstChild && lineElement.firstChild.nodeType === Node.TEXT_NODE) {
        return { node: lineElement.firstChild, offset: lineElement.firstChild.textContent.length };
      }
      // If line is truly empty or has no text node, ensure one exists (e.g. \u200B)
      lineElement.innerHTML = '\u200B'; // Ensure a text node
      return { node: lineElement.firstChild, offset: Math.min(charOffsetInLineOverall, lineElement.firstChild.textContent.length) };
    }

    const startDomPoint = findTextNodeAndInternalOffset(state.startLineIndex, state.startOffsetInLine);
    try {
      range.setStart(startDomPoint.node, startDomPoint.offset);
    } catch (e) {
      console.warn("Error setting range start:", e, "Fallback to line start.");
      range.setStart(startDomPoint.node, 0); // Fallback
    }


    if (state.isCollapsed) {
      range.collapse(true);
    } else {
      const endDomPoint = findTextNodeAndInternalOffset(state.endLineIndex, state.endOffsetInLine);
      try {
          range.setEnd(endDomPoint.node, endDomPoint.offset);
      } catch (e) {
          console.warn("Error setting range end:", e, "Fallback to line end or start point.");
          // Fallback: try to set to end of start node or collapse
          try { range.setEnd(startDomPoint.node, startDomPoint.offset); range.collapse(true); } catch (e2) {}
      }
    }

    selection.removeAllRanges();
    selection.addRange(range);

    // Scroll the focus point of the selection into view
    const focusLineElement = el.childNodes[state.endLineIndex];
    if (focusLineElement) {
      // Simple scrollIntoView for the line, browser handles precise caret later
       focusLineElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  let mode = 'sentence'; // Default focus mode
  let fontSize = 16;
  const apiKey = '<YOUR_GOOGLE_FONTS_API_KEY>';
  const localStorageKey = 'markdownEditorContent';
  const localStorageSelectionStartLineKey = 'markdownEditorSelStartLine';
  const localStorageSelectionStartOffsetKey = 'markdownEditorSelStartOffset';
  const localStorageSelectionEndLineKey = 'markdownEditorSelEndLine';
  const localStorageSelectionEndOffsetKey = 'markdownEditorSelEndOffset';
  const localStorageSelectionIsCollapsedKey = 'markdownEditorSelIsCollapsed';
  const localStorageThemeKey = 'markdownEditorTheme';
  const localStorageFocusModeKey = 'markdownEditorFocusMode';
  const localStorageFontSizeKey = 'markdownEditorFontSize';

  const editor = document.getElementById('editor');
  const themeToggleButton = document.getElementById('toggle-theme');
  const themeToggleIcon = themeToggleButton.querySelector('img');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const toolbar = document.getElementById('toolbar');
  const hamburgerButton = document.getElementById('hamburger');

  function updateThemeToggleButtonIcon() {
    if (document.documentElement.hasAttribute('data-theme') && document.documentElement.getAttribute('data-theme') === 'dark') {
      themeToggleIcon.src = 'images/light-theme.svg';
      themeToggleIcon.alt = 'Switch to Light Theme';
      themeToggleButton.title = 'Switch to Light Theme';
    } else {
      themeToggleIcon.src = 'images/dark-theme.svg';
      themeToggleIcon.alt = 'Switch to Dark Theme';
      themeToggleButton.title = 'Switch to Dark Theme';
    }
  }

  function updateActiveModeButton() {
    modeButtons.forEach(btn => {
      btn.classList.remove('active-mode-btn');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active-mode-btn');
      }
    });
  }

  // Hide toolbar when clicking outside of it
  document.addEventListener('click', function(e) {
    // Check if toolbar is open and the click is not on toolbar or hamburger button
    if (toolbar.classList.contains('open') && 
        !toolbar.contains(e.target) && 
        e.target !== hamburgerButton) {
      // Close the toolbar
      toolbar.classList.remove('open');
    }
  });

  hamburgerButton.onclick = (e) => {
    // Prevent the document click handler from immediately closing the toolbar
    e.stopPropagation();
    toolbar.classList.toggle('open');
  };
  
  document.getElementById('save').onclick = saveFile;
  document.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); }});
  document.getElementById('open-file').onclick = () => document.getElementById('file-input').click();
  document.getElementById('file-input').onchange = handleFile;
  editor.addEventListener('dragover', e => e.preventDefault());
  editor.addEventListener('drop', handleDrop);
  
  document.getElementById('increase-font').onclick = () => { 
    fontSize += 2; 
    localStorage.setItem(localStorageFontSizeKey, fontSize);
    render(); 
  };
  document.getElementById('decrease-font').onclick = () => { 
    fontSize = Math.max(8, fontSize - 2); 
    localStorage.setItem(localStorageFontSizeKey, fontSize);
    render(); 
  };

  themeToggleButton.onclick = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem(localStorageThemeKey, 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem(localStorageThemeKey, 'dark');
    }
    updateThemeToggleButtonIcon();
  };
  document.getElementById('fullscreen').onclick = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); };
  document.querySelectorAll('.mode-btn').forEach(btn => btn.onclick = () => { 
    mode = btn.dataset.mode; 
    localStorage.setItem(localStorageFocusModeKey, mode);
    updateActiveModeButton(); // Update active class
    render(); 
  });
  document.getElementById('font-picker').onclick = () => { document.getElementById('font-modal').style.display='flex'; loadFonts(); };
  document.getElementById('close-font-modal').onclick = () => document.getElementById('font-modal').style.display='none';

  function saveFile() {
    const text = editor.innerText;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'document.md'; a.click(); URL.revokeObjectURL(url);
  }
  function handleFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => { 
      editor.innerText = reader.result; 
      render(); // render will also save to localStorage
    };
    reader.readAsText(file);
  }
  function handleDrop(e) {
    e.preventDefault(); const file = e.dataTransfer.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = () => {
      editor.innerText = reader.result;
      render(); // render will also save to localStorage
    };
    reader.readAsText(file);
  }

  // Track previous focus-range to avoid redundant logs
let prevFocusStart = -1;
let prevFocusEnd = -1;

// NEW: remember last logged caret coords
let prevCaretX = null;
let prevCaretY = null;

  function render() {
    const selectionDetails = getSelectionState(editor);
    const fullContent = editor.innerText; 
    const originalLines = fullContent.split('\n');
    editor.innerHTML = '';
    
    const focusLineIndexFromSelection = selectionDetails.endLineIndex; 
    
    let activeParaStart = -1; // Explicitly initialize for paragraph mode
    let activeParaEnd = -1;   // Explicitly initialize for paragraph mode
    const baseLineHeight = 1.4; 
    const bodyFontSize = fontSize;

    // --- Sentence Focus Mode: Pre-calculation ---
    let focusStartIndex = 0;
    let focusEndIndex = fullContent.length > 0 ? fullContent.length - 1 : 0;

    if (mode === 'sentence' && fullContent.trim().length > 0) {
      // 1. Calculate absolute cursor character offset
      let absoluteCursorOffset = 0;
      for (let i = 0; i < selectionDetails.endLineIndex; i++) {
        absoluteCursorOffset += (originalLines[i] || "").length + 1; // +1 for newline
      }
      absoluteCursorOffset += selectionDetails.endOffsetInLine;
      absoluteCursorOffset = Math.max(0, Math.min(absoluteCursorOffset, fullContent.length));

      // 2. Determine focusStartIndex
      // Check characters before cursor in descending order
      let terminatorsFoundBackwards = 0;
      
      for (let i = absoluteCursorOffset - 1; i >= 0; i--) {
        const char = fullContent[i];
        // Check if character is a sentence terminator
        if (char === '.' || char === '!' || char === '?' || char === '…') {
          terminatorsFoundBackwards++;
          
          // When we find the second terminator, set start position to caret position after this character
          if (terminatorsFoundBackwards === 2) {
            focusStartIndex = i + 1; // Position right after terminator
            
            // Skip any whitespace after the terminator
            while (focusStartIndex < fullContent.length && /\s/.test(fullContent[focusStartIndex])) {
              focusStartIndex++;
            }
            break;
          }
        }
      }
      // If fewer than 2 terminators found, focusStartIndex remains 0 (beginning of document)

      // 3. Determine focusEndIndex
      // Check characters after cursor in ascending order
      let terminatorsFoundForwards = 0;
      
      for (let i = absoluteCursorOffset; i < fullContent.length; i++) {
        const char = fullContent[i];
        // Check if character is a sentence terminator
        if (char === '.' || char === '!' || char === '?' || char === '…') {
          terminatorsFoundForwards++;
          
          // When we find the second terminator, set end position to this character's position
          if (terminatorsFoundForwards === 2) {
            focusEndIndex = i - 1; // position *before* the 2nd terminator
            break;
          }
        }
      }
      // If fewer than 2 terminators found, focusEndIndex remains fullContent.length - 1 (end of document)
    } else if (mode === 'sentence' && fullContent.trim().length === 0) {
      focusStartIndex = 0;
      focusEndIndex   = 0;
    }
    // --- End Sentence Focus Mode Pre-calculation ---

    // LOG the indices whenever they change
    if (mode === 'sentence' && (focusStartIndex !== prevFocusStart || focusEndIndex !== prevFocusEnd)) {
      console.log(`Sentence focus range updated: start=${focusStartIndex}, end=${focusEndIndex}`);
      prevFocusStart = focusStartIndex;
      prevFocusEnd   = focusEndIndex;
    }

    if (mode === 'paragraph') {
      // This logic identifies the paragraph containing the cursor.
      // A paragraph is a sequence of non-blank lines.
      // If the cursor is on a blank line, no paragraph is focused.
      if (originalLines.length > 0 && 
          focusLineIndexFromSelection >= 0 && 
          focusLineIndexFromSelection < originalLines.length && 
          originalLines[focusLineIndexFromSelection].trim() !== '') {
        
        // Start with the cursor's line as part of the current paragraph
        activeParaStart = focusLineIndexFromSelection;
        // Expand upwards: move to previous lines as long as they are not blank
        while (activeParaStart > 0 && originalLines[activeParaStart - 1].trim() !== '') {
          activeParaStart--;
        }
        
        // Start with the cursor's line as part of the current paragraph
        activeParaEnd = focusLineIndexFromSelection;
        // Expand downwards: move to next lines as long as they are not blank
        while (activeParaEnd < originalLines.length - 1 && originalLines[activeParaEnd + 1].trim() !== '') {
          activeParaEnd++;
        }
      } 
      // If the initial check fails (e.g., cursor on a blank line, or editor is empty),
      // activeParaStart and activeParaEnd remain -1, resulting in no paragraph being focused.
    }
    
    let currentLineCharOffset = 0;
    originalLines.forEach((lineText, i) => {
      const div = document.createElement('div');
      let currentLineFontSize = bodyFontSize;
      let isHeading = false;
      
      div.style.marginTop = '0px';

      // Heading detection and styling (remains line-based)
      if (lineText.startsWith("# ")) { isHeading = true; currentLineFontSize = bodyFontSize * 3; }
      else if (lineText.startsWith("## ")) { isHeading = true; currentLineFontSize = bodyFontSize * 2; }
      else if (lineText.startsWith("### ")) { isHeading = true; currentLineFontSize = bodyFontSize * 1.6; }
      else if (lineText.startsWith("#### ")) { isHeading = true; currentLineFontSize = bodyFontSize * 1.2; }
      else if (lineText.startsWith("##### ")) { isHeading = true; currentLineFontSize = bodyFontSize * 1; }

      div.style.fontSize = currentLineFontSize + 'px';
      div.style.lineHeight = String(baseLineHeight);

      if (isHeading) {
          div.style.fontWeight = 'bold';
          div.style.marginTop = (1.3 * currentLineFontSize) + 'px';
      } else {
          const isNonBlankCurrentLine = lineText.trim() !== '';
          const isPreviousLineBlank = i > 0 && originalLines[i - 1].trim() === '';
          if (isNonBlankCurrentLine) {
              if (i > 0 && isPreviousLineBlank) { 
                  div.style.marginTop = (0.6 * baseLineHeight) + 'em';
              }
          }
      }
      if (i === 0) {
          div.style.marginTop = '0px';
      }

      /* ---- build line DOM ---- */
      if (mode !== 'sentence') {
        /* keep old behaviour for paragraph / full */
        div.textContent = lineText || '\u200B';
      } else {
        /* sentence-focus : split the line into spans if needed            *
         * line range  : [lineStart , lineEndInclusive]                    *
         * focus range : [focusStartIndex , focusEndIndex]                 */
        const lineStart        = currentLineCharOffset;
        const lineEndInclusive = currentLineCharOffset + lineText.length - 1;

        const overlapStart = Math.max(lineStart,        focusStartIndex);
        const overlapEnd   = Math.min(lineEndInclusive, focusEndIndex);

        if (overlapStart > overlapEnd) {
          /* no overlap ⇒ whole line dimmed */
          div.textContent = lineText || '\u200B';
          div.style.color = 'var(--dim)';
        } else if (lineStart === overlapStart && lineEndInclusive === overlapEnd) {
          /* full overlap ⇒ whole line focused */
          div.textContent = lineText || '\u200B';
          div.style.color = 'var(--fg)';
        } else {
          /* partial overlap ⇒ split into three spans */
          const before = lineText.slice(0, overlapStart - lineStart);
          const focus  = lineText.slice(overlapStart - lineStart,
                                        overlapEnd   - lineStart + 1);
          const after  = lineText.slice(overlapEnd + 1 - lineStart);

          if (before) {
            const s = document.createElement('span');
            s.textContent = before;
            s.style.color = 'var(--dim)';
            div.append(s);
          }
          if (focus) {
            const s = document.createElement('span');
            s.textContent = focus;
            s.style.color = 'var(--fg)';
            div.append(s);
          }
          if (after) {
            const s = document.createElement('span');
            s.textContent = after;
            s.style.color = 'var(--dim)';
            div.append(s);
          }
        }
      }

      /* colour handling for paragraph/full that was removed above */
      if (mode === 'paragraph') {
        const inPara = activeParaStart !== -1 && i >= activeParaStart && i <= activeParaEnd;
        div.style.color = inPara ? 'var(--fg)' : 'var(--dim)';
      } else if (mode === 'full') {
        div.style.color = 'var(--fg)';
      }

      editor.append(div);
      /* advance char offset (newline only if not last line) */
      currentLineCharOffset += lineText.length + (i < originalLines.length - 1 ? 1 : 0);
    });
    setSelectionState(editor, selectionDetails);

    // NEW: log caret coords & apply auto-scroll
    const caret = getCaretViewportCoords();
    if (caret) {
        // logging when changed
        if (caret.x !== prevCaretX || caret.y !== prevCaretY) {
            console.log(`Caret viewport coords: x=${caret.x}, y=${caret.y}`);
            prevCaretX = caret.x;
            prevCaretY = caret.y;
        }

        // auto-scroll if caret outside 25 %-75 % vertical band
        const vh      = window.innerHeight;
        const bandTop = vh * 0.25;
        const bandBot = vh * 0.75;
        if (caret.y < bandTop || caret.y > bandBot) {
            const delta = caret.y - vh * 0.5;        // move caret to 50 % vh
            window.scrollBy({ top: delta, behavior: 'smooth' });
        }
    }

    // Save to localStorage after rendering
    try {
      localStorage.setItem(localStorageKey, fullContent);
      localStorage.setItem(localStorageSelectionStartLineKey, selectionDetails.startLineIndex);
      localStorage.setItem(localStorageSelectionStartOffsetKey, selectionDetails.startOffsetInLine);
      localStorage.setItem(localStorageSelectionEndLineKey, selectionDetails.endLineIndex);
      localStorage.setItem(localStorageSelectionEndOffsetKey, selectionDetails.endOffsetInLine);
      localStorage.setItem(localStorageSelectionIsCollapsedKey, selectionDetails.isCollapsed);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  editor.addEventListener('input', render);
  editor.addEventListener('click', () => setTimeout(render, 0));
  editor.addEventListener('mouseup', () => setTimeout(render, 0));

  editor.addEventListener('keydown', e => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
         'Home','End','PageUp','PageDown'].includes(e.key)) {
      setTimeout(render, 0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const selectionDetails = getSelectionState(editor); // Use start of selection for splitting
      const { startLineIndex: lineIndex, startOffsetInLine: offsetInLine } = selectionDetails;
      
      let currentText = editor.innerText;
      let linesArray = currentText.split('\n');

      while(linesArray.length <= lineIndex) {
        linesArray.push("");
      }

      const currentLineText = linesArray[lineIndex] || "";
      
      const textBeforeCursor = currentLineText.substring(0, offsetInLine);
      const textAfterCursor = currentLineText.substring(offsetInLine);
      
      linesArray[lineIndex] = textBeforeCursor;
      linesArray.splice(lineIndex + 1, 0, textAfterCursor);
      
      editor.innerText = linesArray.join('\n');
      
      render(); // render will also save to localStorage
      // Set caret to start of the new line
      setSelectionState(editor, { 
          startLineIndex: lineIndex + 1, startOffsetInLine: 0, 
          endLineIndex: lineIndex + 1, endOffsetInLine: 0, 
          isCollapsed: true 
      });
    }
  });

  async function loadFonts() {
    const list = document.getElementById('font-list'); if (list.childElementCount) return;
    const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${AIzaSyAO5qSsbS5UTtv1cVVYMKRCfoVQIsxwOX0}`);
    const data = await res.json();
    data.items.slice(0,50).forEach(f => {
      const btn = document.createElement('button'); btn.textContent = f.family;
      btn.onclick = () => {
        const link = document.createElement('link'); link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g,'+')}&display=swap`;
        document.head.append(link);
        editor.style.fontFamily = `'${f.family}', monospace`;
      };
      list.append(btn);
    });
  }

  // Load UI settings from localStorage on startup
  function loadUISettings() {
    const savedTheme = localStorage.getItem(localStorageThemeKey);
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme'); // Default to light
    }

    const savedMode = localStorage.getItem(localStorageFocusModeKey);
    if (savedMode) {
      mode = savedMode;
    } // Else, `mode` keeps its default 'sentence'
    // updateActiveModeButton(); // Moved to after initial render

    const savedFontSize = localStorage.getItem(localStorageFontSizeKey);
    if (savedFontSize) {
      fontSize = parseInt(savedFontSize, 10) || 16;
    } // Else, `fontSize` keeps its default 16
  }

  // Load content from localStorage on startup
  function loadFromLocalStorage() {
    let loadedContent = "";
    let sLine = 0, sOffset = 0, eLine = 0, eOffset = 0;
    let isCollapsed = true;
    try {
      const savedContent = localStorage.getItem(localStorageKey);
      if (savedContent !== null) loadedContent = savedContent;
      
      sLine = parseInt(localStorage.getItem(localStorageSelectionStartLineKey), 10) || 0;
      sOffset = parseInt(localStorage.getItem(localStorageSelectionStartOffsetKey), 10) || 0;
      eLine = parseInt(localStorage.getItem(localStorageSelectionEndLineKey), 10) || sLine;
      eOffset = parseInt(localStorage.getItem(localStorageSelectionEndOffsetKey), 10) || sOffset;
      const collapsedStr = localStorage.getItem(localStorageSelectionIsCollapsedKey);
      isCollapsed = (collapsedStr === 'true') || (sLine === eLine && sOffset === eOffset);

    } catch (error) {
      console.error("Error loading from localStorage:", error);
    }
    return { content: loadedContent, selection: { startLineIndex: sLine, startOffsetInLine: sOffset, endLineIndex: eLine, endOffsetInLine: eOffset, isCollapsed: isCollapsed } };
  }

  loadUISettings(); // Load UI settings first
  const initialLoadData = loadFromLocalStorage();
  editor.innerText = initialLoadData.content || ""; // Ensure content is not null
  if (editor.innerText === "") { // If loaded content is empty, ensure a ZWS for proper rendering
    editor.innerHTML = '<div>\u200B</div>'; 
  }
  // Initial render builds the DOM structure based on innerText
  render(); 
  // After the DOM is built by render, set the selection state.
  // The render() call itself will try to restore selection, but this ensures the loaded one is prioritized for the very first load.
  setSelectionState(editor, initialLoadData.selection); 
  updateThemeToggleButtonIcon(); // Set initial theme icon
  updateActiveModeButton(); // Set initial active mode button after settings are loaded and DOM might be ready

/**
 * Returns the caret’s viewport coordinates ({ x, y }) or null if none.
 * Viewport == coordinates relative to window, so (0,0) is top-left of the visible page.
 */
function getCaretViewportCoords() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;

  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);                     // we only need the caret

  // Try the fast path first
  let rect = range.getClientRects()[0] || range.getBoundingClientRect();
  if (rect && rect.width + rect.height) {
    return { x: rect.left, y: rect.top };
  }

  // Fallback – inject a zero-width span to obtain a rect
  const span = document.createElement('span');
  span.appendChild(document.createTextNode('\u200B'));
  range.insertNode(span);
  rect = span.getBoundingClientRect();
  span.parentNode.removeChild(span);

  // Restore original selection just in case
  sel.removeAllRanges();
  sel.addRange(range);

  return rect ? { x: rect.left, y: rect.top } : null;
}

/* ---------- viewport-centred-caret helpers ---------- */
function updateEditorPadding() {
  const pad = (window.innerHeight / 2) + 'px';   // 50 vh
  editor.style.paddingTop    = pad;
  editor.style.paddingBottom = pad;
}
window.addEventListener('resize', updateEditorPadding);
updateEditorPadding();           // initial call
/* ---------------------------------------------------- */