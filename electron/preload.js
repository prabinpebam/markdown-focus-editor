const { contextBridge, ipcRenderer } = require('electron');

// One-way: renderer → main
const validSendChannels = [
  'window-minimize',
  'window-maximize',
  'window-close',
  'title-bar-unsaved',
  'save-content',
];

// Two-way: renderer → main → renderer
const validInvokeChannels = [
  'dialog:openFile',
  'dialog:saveFile',
  'file:save',
  'file:reload',
  'file:getPath',
  'file:getRecent',
];

// One-way: main → renderer
const validReceiveChannels = [
  'file-opened',
  'file-error',
  'file-external-change',
  'title-bar-update',
  'request-content-for-save',
];

contextBridge.exposeInMainWorld('electronAPI', {
  // Send fire-and-forget messages to main
  send: (channel, ...args) => {
    if (validSendChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // Invoke and wait for response from main
  invoke: (channel, ...args) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid invoke channel: ${channel}`));
  },

  // Listen for messages from main (returns cleanup function)
  on: (channel, callback) => {
    if (validReceiveChannels.includes(channel)) {
      const handler = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
    return () => {};
  },

  // Platform info
  platform: process.platform,
});
