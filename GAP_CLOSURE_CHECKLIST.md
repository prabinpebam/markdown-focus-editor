# Gap Closure Action Checklist

This checklist tracks progress on closing the gaps identified in the comprehensive analysis.

**Related Documents:**
- Full Analysis: `GAP_ANALYSIS_REPORT.md`
- Quick Summary: `QUICK_GAP_SUMMARY.md`

---

## 🚨 URGENT - Week 1 (Priority 1)

### [ ] 1. Fix README.md Documentation (2 hours)
**Why:** Currently misleading users with false claims  
**Files:** `README.md`

**Specific Changes Needed:**
- [ ] Remove "Implemented" checkmark from "Word Count" (line 15, 89)
- [ ] Remove "Implemented" checkmark from "Recent Files" (line 16, 89)
- [ ] Remove "Implemented" checkmark from "Adjustable Dimming Level" (line 17, 93)
- [ ] Remove keyboard shortcuts: `Alt+L`, `Alt+Shift+Up/Down` (lines 73-75)
- [ ] Update "Auto Save" description from "every 30 seconds" to "on every content change" (line 14)
- [ ] Move false claims to "Future Enhancements" section with unchecked boxes

**Verification:**
- [ ] README accurately reflects current implementation
- [ ] No false feature claims remain
- [ ] Users won't be misled

---

## 🔴 CRITICAL - Week 1-2 (Priority 2)

### [ ] 2. Implement Import Conflict Resolution UI (1-2 days)
**Why:** Core functionality for multi-device users  
**Files:** `js/modules/modalManager.js`, `style/main.css`

**Tasks:**
- [ ] Add visual indicators (red/yellow borders) for conflicted docs
- [ ] Create conflict resolution overlay with two buttons per conflict
- [ ] Implement "Keep current" vs "Keep imported" logic
- [ ] Add floating toolbar with "Keep all" / "Discard all" buttons
- [ ] Display import statistics (docs imported, conflicts)
- [ ] Test with sample backup file

**Spec Reference:** `documentations/files-storage-backup-spec.md` lines 35-50

**Verification:**
- [ ] Import backup shows conflicts visually
- [ ] User can resolve each conflict individually
- [ ] Batch operations work correctly
- [ ] Final state persisted correctly

---

### [ ] 3. Add Inline Code Support (3-4 hours)
**Why:** Common markdown feature users expect  
**Files:** `js/modules/inlineStyleManager.js`, `style/main.css`

**Tasks:**
- [ ] Add inline code pattern to `inlineStyleManager.patterns`
- [ ] Pattern: `` `code` `` → `<code>code</code>` with `` ` `` markers
- [ ] Add CSS styling for `code` elements
- [ ] Test typing `` `text `` converts properly
- [ ] Test caret positioning after transformation
- [ ] Test undo/redo

**Spec Reference:** `documentations/tech-detail.md` Basic Text Styles section

**Verification:**
- [ ] Typing `` `code` `` creates inline code
- [ ] Markers visible in contenteditable
- [ ] Styled appropriately (monospace font, background)
- [ ] Works with other inline styles

---

### [ ] 4. Add Blockquote Support (2-3 hours)
**Why:** Common markdown feature  
**Files:** `js/modules/editor.js` or new `blockquoteManager.js`, `style/main.css`

**Tasks:**
- [ ] Detect `> ` at start of line (similar to heading detection)
- [ ] Transform DIV to `<blockquote>` element
- [ ] Add non-editable marker `>` (like heading markers)
- [ ] Add CSS styling for blockquotes
- [ ] Test typing `> text` converts properly
- [ ] Handle reversion if marker deleted
- [ ] Test undo/redo

**Spec Reference:** `documentations/tech-detail.md` Basic Text Styles section

**Verification:**
- [ ] Typing `> text` creates blockquote
- [ ] Visual distinction from regular text
- [ ] Breaking blockquote reverts to div
- [ ] Works in nested structures

---

## 🟠 IMPORTANT - Week 2-3 (Priority 3)

### [ ] 5. Fix Focus Mode to Match Spec (1-2 days)
**Choose One Path:**

**Option A: Implement Sentence-Level Focus**
- [ ] Add sentence detection logic (regex for `.`, `!`, `?` boundaries)
- [ ] Update `focusMode.js` to use sentence boundaries
- [ ] Adjust SVG mask to highlight current sentence
- [ ] Test with various sentence structures

**Option B: Update Spec to Reflect Line-Level**
- [ ] Update `documentations/app-spec.md` to say "line" instead of "sentence"
- [ ] Document current line-level behavior as intended
- [ ] Keep implementation as-is

**Both Paths:**
- [ ] Add adjustable dimming level controls
- [ ] Implement `Alt+L` keyboard shortcut for toggle
- [ ] Implement `Alt+Shift+Up/Down` for dimming adjustment
- [ ] Persist dimming level setting
- [ ] Update README with working shortcuts

**Spec Reference:** `documentations/app-spec.md` Key Experience #4, `README.md` lines 73-75

**Verification:**
- [ ] Focus mode matches documented behavior
- [ ] Keyboard shortcuts work
- [ ] Dimming adjustable via keyboard
- [ ] Settings persist across sessions

---

### [ ] 6. Implement HTML Paste Handling (1 day)
**Why:** Users paste from Word/Google Docs frequently  
**Files:** `js/modules/pasteManager.js` or update `editor.js handlePaste()`

**Tasks:**
- [ ] Detect HTML in clipboard (use `getData('text/html')`)
- [ ] Parse HTML structure (DOM parser)
- [ ] Convert headings: `<h1>` → `# `, `<h2>` → `## `, etc.
- [ ] Convert lists: `<ul>/<ol>` → markdown lists
- [ ] Convert inline styles: `<strong>` → `**`, `<em>` → `*`, etc.
- [ ] Strip unsupported tags, keep text content
- [ ] Insert converted content as proper DOM structure
- [ ] Test with Word document paste
- [ ] Test with Google Docs paste
- [ ] Test with rich email paste

**Spec Reference:** `documentations/app-spec.md` Copy paste support section

**Verification:**
- [ ] Pasted HTML converts to markdown equivalents
- [ ] Structure preserved (headings, lists)
- [ ] Unsupported tags stripped cleanly
- [ ] No empty tags inserted

---

### [ ] 7. Complete Font Selection (4-6 hours)
**Why:** Feature partially built, easy to complete  
**Files:** `js/modules/toolbar.js`, add `js/modules/fontManager.js`

**Tasks:**
- [ ] Populate font list in `#font-modal` (Roboto Mono, Arial, etc.)
- [ ] Add click handlers for font selection
- [ ] Apply selected font to editor
- [ ] Persist font choice to localStorage
- [ ] Load font on startup
- [ ] Add Google Fonts import if needed
- [ ] Test font switching

**Spec Reference:** `documentations/app-spec.md` User Controls section

**Verification:**
- [ ] Font modal shows available fonts
- [ ] Clicking font applies it to editor
- [ ] Font choice persists across sessions
- [ ] All fonts render correctly

---

## 🟡 VALUABLE - Week 3-4 (Priority 4)

### [ ] 8. Add Word Count Feature (4-6 hours)
**Why:** Users want to track document length  
**Files:** New `js/modules/wordCount.js`, update `index.html`, `style/main.css`

**Tasks:**
- [ ] Add word count display to UI (status bar or toolbar)
- [ ] Calculate total document word count
- [ ] Calculate current section word count (heading-based)
- [ ] Update count on content change
- [ ] Add CSS styling for word count display
- [ ] Test accuracy with various content

**Spec Reference:** `README.md` line 15 (currently false claim)

**Verification:**
- [ ] Word count visible in UI
- [ ] Counts update in real-time
- [ ] Current section count accurate
- [ ] Total count accurate

---

### [ ] 9. Implement Recent Files List (4-6 hours)
**Why:** Improves workflow for frequent documents  
**Files:** `js/modules/documentStore.js`, `js/modules/modalManager.js`

**Tasks:**
- [ ] Track last 10 opened documents in localStorage
- [ ] Add "Recent" section to document modal
- [ ] Sort by last opened time (not just last edited)
- [ ] Add visual distinction for recent docs
- [ ] Add keyboard shortcut for recent files (optional)
- [ ] Test with multiple document opens

**Spec Reference:** `README.md` line 16 (currently false claim)

**Verification:**
- [ ] Recent files tracked correctly
- [ ] Recent section visible in modal
- [ ] Opens from recent list work
- [ ] List updates when opening docs

---

### [ ] 10. Add Missing Keyboard Shortcuts (1 day)
**Why:** Improve keyboard-only workflow  
**Files:** Various module files

**Tasks:**
- [ ] `Alt+L`: Toggle focus mode (update `focusMode.js`)
- [ ] `Alt+Shift+Up/Down`: Adjust dimming (update `focusMode.js`)
- [ ] `Alt+Up/Down`: Previous/Next section navigation (verify exists)
- [ ] Test all shortcuts don't conflict
- [ ] Update README with working shortcuts

**Verification:**
- [ ] All documented shortcuts work
- [ ] No conflicts with browser shortcuts
- [ ] Cross-platform compatible (Ctrl/Cmd)

---

## 🟢 NICE TO HAVE - Future (Priority 5)

### [ ] 11. Command Palette (2-3 days)
- [ ] Implement `Ctrl+Shift+P` trigger
- [ ] Create command palette UI (modal overlay)
- [ ] Add searchable command list
- [ ] Wire commands to existing functions

### [ ] 12. Outline View / TOC (2-3 days)
- [ ] Create outline panel (sidebar or modal)
- [ ] Parse document headings
- [ ] Show hierarchical structure
- [ ] Click to jump to section

### [ ] 13. Export to HTML (2 days)
- [ ] Convert contenteditable to markdown
- [ ] Render markdown to HTML
- [ ] Add download button
- [ ] Style exported HTML

### [ ] 14. Export to PDF (3-5 days)
- [ ] Choose PDF library (jsPDF or html2pdf)
- [ ] Convert content to PDF format
- [ ] Add download button
- [ ] Test PDF output quality

### [ ] 15. Add Testing (1-2 weeks)
- [ ] Choose test framework (Jest, Vitest, etc.)
- [ ] Write unit tests for modules
- [ ] Write integration tests
- [ ] Set up CI/CD testing

---

## Progress Tracking

**Last Updated:** 2025-12-22

| Priority | Tasks | Completed | In Progress | Not Started |
|----------|-------|-----------|-------------|-------------|
| P1 (Urgent) | 1 | 0 | 0 | 1 |
| P2 (Critical) | 3 | 0 | 0 | 3 |
| P3 (Important) | 4 | 0 | 0 | 4 |
| P4 (Valuable) | 3 | 0 | 0 | 3 |
| P5 (Future) | 5 | 0 | 0 | 5 |
| **Total** | **16** | **0** | **0** | **16** |

**Estimated Total Effort:** 8-11 days (not counting P5 future items)

---

## How to Use This Checklist

1. **Pick a task** from the highest priority section
2. **Check off sub-tasks** as you complete them
3. **Test thoroughly** using the verification checklist
4. **Update progress tracking** when task is complete
5. **Commit changes** with reference to this checklist item
6. **Move to next task**

**Remember:** Fix README.md FIRST (2 hours) - it's the highest impact quickest win!

---

**See also:**
- `GAP_ANALYSIS_REPORT.md` - Full detailed analysis
- `QUICK_GAP_SUMMARY.md` - Executive summary
