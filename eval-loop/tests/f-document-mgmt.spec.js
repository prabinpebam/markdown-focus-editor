/**
 * Category F: Document Management — TF-28 through TF-33
 */
const { evalTest, wait } = require('./test-setup');

// ── TF-28: Save Existing Document ──
evalTest('TF-28', 'Save Existing Document', 'F. Document Management', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Content to save');
  await page.keyboard.type('Content to save');
  await cap('after-type');

  rec(2, 'shortcut', 'Ctrl+S');
  await page.keyboard.press('Control+s');
  await wait(500);
  await cap('after-save');
});

// ── TF-29: Save As ──
evalTest('TF-29', 'Save As', 'F. Document Management', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Content for save-as');
  await page.keyboard.type('Content for save-as');
  await cap('after-type');

  // Ctrl+Shift+S triggers a prompt — we handle the dialog
  page.on('dialog', async (dialog) => {
    await dialog.accept('New Document Name');
  });

  rec(2, 'shortcut', 'Ctrl+Shift+S');
  await page.keyboard.press('Control+Shift+s');
  await wait(500);
  await cap('after-save');
});

// ── TF-30: New Document ──
evalTest('TF-30', 'New Document', 'F. Document Management', async ({ page, cap, rec }) => {
  rec(1, 'type', 'Existing content');
  await page.keyboard.type('Existing content');
  await cap('after-type');

  page.on('dialog', async (dialog) => {
    await dialog.accept('Test New Doc');
  });

  rec(2, 'shortcut', 'Ctrl+N');
  await page.keyboard.press('Control+n');
  await wait(500);
  await cap('after-new-doc');
});

// ── TF-31: Open Document Modal ──
evalTest('TF-31', 'Open Document Modal', 'F. Document Management', async ({ page, cap, rec }) => {
  await cap('initial');

  rec(1, 'shortcut', 'Ctrl+O');
  await page.keyboard.press('Control+o');
  await wait(500);
  await cap('after-modal');

  rec(2, 'press', 'Escape');
  await page.keyboard.press('Escape');
  await wait(300);
  await cap('after-modal');
});

// ── TF-32: Load Document from Modal ──
evalTest('TF-32', 'Load Document from Modal', 'F. Document Management', async ({ page, cap, rec }) => {
  // Create a second document first
  page.on('dialog', async (dialog) => {
    await dialog.accept('Second Doc');
  });
  await page.keyboard.press('Control+n');
  await wait(500);
  await page.keyboard.type('Second doc content');
  await page.keyboard.press('Control+s');
  await wait(500);
  await cap('after-setup');

  // Open modal and click first thumbnail
  rec(1, 'shortcut', 'Ctrl+O');
  await page.keyboard.press('Control+o');
  await wait(500);
  await cap('modal-open');

  rec(2, 'click', 'first thumbnail');
  const thumbnail = page.locator('#document-grid > *').first();
  if (await thumbnail.count() > 0) {
    await thumbnail.click();
    await wait(500);
  }
  await cap('after-load');
});

// ── TF-33: Delete Document ──
evalTest('TF-33', 'Delete Document', 'F. Document Management', async ({ page, cap, rec }) => {
  // Open modal
  rec(1, 'shortcut', 'Ctrl+O');
  await page.keyboard.press('Control+o');
  await wait(500);
  await cap('modal-open');

  // Hover a thumbnail to reveal delete button
  rec(2, 'hover', 'thumbnail');
  const thumbnail = page.locator('#document-grid > *').first();
  if (await thumbnail.count() > 0) {
    await thumbnail.hover();
    await wait(300);

    // Accept confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click delete button (look for × button inside thumbnail)
    const deleteBtn = thumbnail.locator('button, .delete-btn, [class*="delete"]').first();
    if (await deleteBtn.count() > 0) {
      rec(3, 'click', 'delete button');
      await deleteBtn.click();
      await wait(500);
    }
  }
  await cap('after-delete');
});
