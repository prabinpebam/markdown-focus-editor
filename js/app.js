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

  document.getElementById('hamburger').onclick = () => document.getElementById('toolbar').classList.toggle('open');
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

  function render() {
    const selectionDetails = getSelectionState(editor);
    const fullContent = editor.innerText; 
    const originalLines = fullContent.split('\n');
    editor.innerHTML = '';
    
    const focusLineIndexFromSelection = selectionDetails.endLineIndex; 
    
    let activeParaStart = -1;
    let activeParaEnd = -1;
    const baseLineHeight = 1.4; 
    const bodyFontSize = fontSize;

    // --- Sentence Focus Mode: Pre-calculation ---
    let sentences = []; // Ensure sentences is declared here to be accessible later
    let focusedSentenceIndices = new Set();
    if (mode === 'sentence') {
      // 1. Calculate absolute cursor character offset
      let absoluteCursorOffset = 0;
      for (let i = 0; i < selectionDetails.endLineIndex; i++) {
        absoluteCursorOffset += (originalLines[i] || "").length + 1; // +1 for newline
      }
      absoluteCursorOffset += selectionDetails.endOffsetInLine;
      // Ensure cursor offset is within bounds of fullContent
      absoluteCursorOffset = Math.max(0, Math.min(absoluteCursorOffset, fullContent.length));


      // 2. Parse fullContent into sentences: { text, start, end }
      if (fullContent.trim().length > 0) {
        let sentenceStartCharIndex = 0;
        for (let i = 0; i < fullContent.length; i++) {
          if (fullContent[i] === '.') {
            if (i === fullContent.length - 1 || /\s/.test(fullContent[i + 1])) {
              sentences.push({
                text: fullContent.substring(sentenceStartCharIndex, i + 1),
                start: sentenceStartCharIndex,
                end: i
              });
              sentenceStartCharIndex = i + 1;
              // Skip whitespace following the period for the start of the next sentence
              while (sentenceStartCharIndex < fullContent.length && /\s/.test(fullContent[sentenceStartCharIndex])) {
                sentenceStartCharIndex++;
              }
            }
          }
        }
        // Add the last part if it doesn't end with a period or if content remains
        if (sentenceStartCharIndex < fullContent.length) {
          sentences.push({
            text: fullContent.substring(sentenceStartCharIndex),
            start: sentenceStartCharIndex,
            end: fullContent.length - 1
          });
        }
      }
      
      if (sentences.length === 0 && fullContent.trim().length > 0) { // Handle text with no periods
          sentences.push({ text: fullContent, start: 0, end: fullContent.length - 1});
      }

      // 3. Identify current sentence index
      let currentSentenceIndex = -1;
      for (let i = 0; i < sentences.length; i++) {
        // A cursor is in a sentence if its offset is between sentence start and end (inclusive of end).
        // Or, if at the start of the sentence.
        if (absoluteCursorOffset >= sentences[i].start && absoluteCursorOffset <= sentences[i].end + 1) {
           // The +1 for sentences[i].end allows cursor to be right after the period.
          currentSentenceIndex = i;
          break;
        }
      }
       if (currentSentenceIndex === -1 && sentences.length > 0) { // Default to first or last if cursor is outside
          if (absoluteCursorOffset <= sentences[0].start) currentSentenceIndex = 0;
          else currentSentenceIndex = sentences.length - 1;
      }


      // 4. Determine focused sentence indices (current, previous, next)
      if (currentSentenceIndex !== -1) {
        focusedSentenceIndices.add(currentSentenceIndex);
        if (currentSentenceIndex > 0) {
          focusedSentenceIndices.add(currentSentenceIndex - 1);
        }
        if (currentSentenceIndex < sentences.length - 1) {
          focusedSentenceIndices.add(currentSentenceIndex + 1);
        }
      }
      // Ensure `sentences` is populated for the loop below if mode is 'sentence'
    }
    // --- End Sentence Focus Mode Pre-calculation ---


    if (mode === 'paragraph') {
      if (originalLines.length > 0 && focusLineIndexFromSelection >= 0 && focusLineIndexFromSelection < originalLines.length && originalLines[focusLineIndexFromSelection].trim() !== '') {
        activeParaStart = focusLineIndexFromSelection;
        while (activeParaStart > 0 && originalLines[activeParaStart - 1].trim() !== '') {
          activeParaStart--;
        }
        activeParaEnd = focusLineIndexFromSelection;
        while (activeParaEnd < originalLines.length - 1 && originalLines[activeParaEnd + 1].trim() !== '') {
          activeParaEnd++;
        }
      }
    }
    
    let currentLineCharOffset = 0;
    originalLines.forEach((lineText, i) => {
      const div = document.createElement('div');
      let currentLineFontSize = bodyFontSize;
      let isHeading = false;
      
      div.style.marginTop = '0px';

      // Heading detection and styling (remains line-based)
      if (lineText.startsWith("# ")) { isHeading = true; currentLineFontSize = bodyFontSize * 3; }
      else if (lineText.startsWith("## ")) { isHeading = true; currentLineFontSize = bodyFontSize * 2.5; }
      else if (lineText.startsWith("### ")) { isHeading = true; currentLineFontSize = bodyFontSize * 2; }
      else if (lineText.startsWith("#### ")) { isHeading = true; currentLineFontSize = bodyFontSize * 1.5; }
      else if (lineText.startsWith("##### ")) { isHeading = true; currentLineFontSize = bodyFontSize * 1; }

      div.textContent = lineText || '\u200B';
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

      // Apply color based on focus mode
      if (mode === 'full') {
        div.style.color = 'var(--fg)';
      } else if (mode === 'sentence') {
        let isLineInFocusedSentence = false;
        // Ensure `sentences` is available from the pre-calculation block
        if (sentences && sentences.length > 0 && focusedSentenceIndices.size > 0) {
          const lineStartOffset = currentLineCharOffset;
          const lineEndOffset = currentLineCharOffset + lineText.length;
          
          for (const sentenceIdx of focusedSentenceIndices) {
            // Check if sentenceIdx is a valid index for the sentences array
            if (sentenceIdx >= 0 && sentenceIdx < sentences.length) {
              const s = sentences[sentenceIdx];
              // Check for overlap: (LineStart is before or at SentenceEnd) AND (LineEnd is after or at SentenceStart)
              if (lineStartOffset <= s.end && lineEndOffset >= s.start) {
                isLineInFocusedSentence = true;
                break;
              }
            }
          }
          div.style.color = isLineInFocusedSentence ? 'var(--fg)' : 'var(--dim)';
        } else { 
          // If no sentences were parsed or no focused sentences, dim the line
          // Or, if content is empty, this path might be taken.
          div.style.color = (fullContent.trim() === "") ? 'var(--fg)' : 'var(--dim)';
        }
      } else if (mode === 'paragraph') {
        const isInFocusedParagraph = (activeParaStart !== -1 && i >= activeParaStart && i <= activeParaEnd);
        div.style.color = isInFocusedParagraph ? 'var(--fg)' : 'var(--dim)';
      }
      
      editor.append(div);
      currentLineCharOffset += lineText.length + 1; // +1 for the newline character
    });
    setSelectionState(editor, selectionDetails);
    
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
  editor.innerText = initialLoadData.content;
  // Initial render builds the DOM structure based on innerText
  render(); 
  // After the DOM is built by render, set the selection state.
  // The render() call itself will try to restore selection, but this ensures the loaded one is prioritized for the very first load.
  setSelectionState(editor, initialLoadData.selection); 
  updateThemeToggleButtonIcon(); // Set initial theme icon