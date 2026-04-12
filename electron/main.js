const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Settings persistence ──
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[Main] Settings corrupted, using defaults:', e.message);
    // Back up corrupted file
    try { fs.renameSync(SETTINGS_PATH, SETTINGS_PATH + '.bak'); } catch(_) {}
  }
  return {};
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('[Main] Failed to save settings:', e.message);
  }
}

let mainWindow = null;
let currentFilePath = null;
let fileWatcher = null;
let settings = {};
let lastSaveTime = 0;

// ── App lifecycle ──

app.whenReady().then(() => {
  settings = loadSettings();
  createWindow();

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Window creation ──

function createWindow() {
  const windowState = settings.windowState || {};

  mainWindow = new BrowserWindow({
    width: windowState.width || 1200,
    height: windowState.height || 800,
    x: windowState.x,
    y: windowState.y,
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Load the editor HTML
  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Open file from command line argument
    const fileArg = process.argv.find(a => a.endsWith('.md') || a.endsWith('.txt') || a.endsWith('.markdown'));
    if (fileArg && fs.existsSync(fileArg)) {
      openFile(path.resolve(fileArg));
    } else if (settings.lastFilePath && fs.existsSync(settings.lastFilePath)) {
      openFile(settings.lastFilePath);
    } else {
      updateTitleBar('Untitled', 'untitled');
    }
  });

  // Save window state on close
  mainWindow.on('close', () => {
    // Force save current file
    if (currentFilePath) {
      mainWindow.webContents.send('request-content-for-save');
    }

    // Save window state
    const bounds = mainWindow.getBounds();
    settings.windowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: mainWindow.isMaximized(),
    };
    settings.lastFilePath = currentFilePath;
    saveSettings(settings);
  });
}

// ── File operations ──

function openFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    currentFilePath = filePath;

    // Start file watcher
    startFileWatcher(filePath);

    // Send to renderer
    mainWindow.webContents.send('file-opened', {
      path: filePath,
      name: path.basename(filePath),
      content: content,
    });

    updateTitleBar(path.basename(filePath), 'normal');
    settings.lastFilePath = filePath;
    saveSettings(settings);

    // Add to recent files
    addToRecentFiles(filePath);

    console.log(`[Main] Opened: ${filePath}`);
  } catch (e) {
    console.error(`[Main] Failed to open ${filePath}:`, e.message);
    mainWindow.webContents.send('file-error', {
      action: 'open',
      message: `Could not open file: ${e.message}`,
    });
  }
}

function saveFile(filePath, content) {
  try {
    // Atomic write: write to temp, then rename
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, filePath);
    lastSaveTime = Date.now();
    updateTitleBar(path.basename(filePath), 'normal');
    console.log(`[Main] Saved: ${filePath} (${content.length} chars)`);
    return true;
  } catch (e) {
    console.error(`[Main] Save failed for ${filePath}:`, e.message);
    mainWindow.webContents.send('file-error', {
      action: 'save',
      message: `Save failed: ${e.message}`,
    });

    // Retry once after 2 seconds
    setTimeout(() => {
      try {
        fs.writeFileSync(filePath, content, 'utf8');
        lastSaveTime = Date.now();
        updateTitleBar(path.basename(filePath), 'normal');
        console.log(`[Main] Retry save succeeded: ${filePath}`);
      } catch (retryErr) {
        console.error(`[Main] Retry save also failed:`, retryErr.message);
      }
    }, 2000);

    return false;
  }
}

function updateTitleBar(filename, state) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('title-bar-update', { filename, state });
  }
}

// ── File watching ──

function startFileWatcher(filePath) {
  stopFileWatcher();
  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      // Debounce: ignore changes within 1s of our own save
      if (Date.now() - lastSaveTime < 1000) return;

      // Check if file still exists
      if (!fs.existsSync(filePath)) {
        mainWindow.webContents.send('file-external-change', {
          type: 'deleted',
          path: filePath,
        });
        updateTitleBar(path.basename(filePath), 'deleted');
        return;
      }

      mainWindow.webContents.send('file-external-change', {
        type: 'modified',
        path: filePath,
      });
    });
  } catch (e) {
    console.error(`[Main] Could not watch ${filePath}:`, e.message);
  }
}

function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

// ── Recent files ──

function addToRecentFiles(filePath) {
  let recent = settings.recentFiles || [];
  recent = recent.filter(f => f !== filePath);
  recent.unshift(filePath);
  recent = recent.slice(0, 10);
  settings.recentFiles = recent;
  saveSettings(settings);
}

// ── IPC handlers ──

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    openFile(result.filePaths[0]);
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: currentFilePath || 'Untitled.md',
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (!result.canceled && result.filePath) {
    currentFilePath = result.filePath;
    startFileWatcher(result.filePath);
    addToRecentFiles(result.filePath);
    return result.filePath;
  }
  return null;
});

ipcMain.handle('file:save', async (event, filePath, content) => {
  return saveFile(filePath, content);
});

ipcMain.handle('file:reload', async () => {
  if (currentFilePath && fs.existsSync(currentFilePath)) {
    const content = fs.readFileSync(currentFilePath, 'utf8');
    mainWindow.webContents.send('file-opened', {
      path: currentFilePath,
      name: path.basename(currentFilePath),
      content: content,
    });
    return true;
  }
  return false;
});

ipcMain.handle('file:getPath', async () => {
  return currentFilePath;
});

ipcMain.handle('file:getRecent', async () => {
  return (settings.recentFiles || []).map(f => ({
    path: f,
    name: path.basename(f),
    exists: fs.existsSync(f),
  }));
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

ipcMain.on('title-bar-unsaved', (event, isUnsaved) => {
  // Renderer tells us content changed — update title bar dot
  const name = currentFilePath ? path.basename(currentFilePath) : 'Untitled';
  const state = currentFilePath ? (isUnsaved ? 'unsaved' : 'normal') : 'untitled';
  updateTitleBar(name, state);
});

ipcMain.on('save-content', (event, content) => {
  if (currentFilePath) {
    saveFile(currentFilePath, content);
  }
});
