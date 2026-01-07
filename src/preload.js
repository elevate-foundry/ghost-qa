const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ghostAPI', {
  startTesting: (config) => ipcRenderer.invoke('start-testing', config),
  stopTesting: () => ipcRenderer.invoke('stop-testing'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  onTestError: (callback) => {
    ipcRenderer.on('test-error', (event, error) => callback(error));
  },
  onTestLog: (callback) => {
    ipcRenderer.on('test-log', (event, log) => callback(log));
  },
  onTestStats: (callback) => {
    ipcRenderer.on('test-stats', (event, stats) => callback(stats));
  },
  onTestScreenshot: (callback) => {
    ipcRenderer.on('test-screenshot', (event, screenshot) => callback(screenshot));
  },
  
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('test-error');
    ipcRenderer.removeAllListeners('test-log');
    ipcRenderer.removeAllListeners('test-stats');
    ipcRenderer.removeAllListeners('test-screenshot');
  }
});
