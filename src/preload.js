const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ghostAPI', {
  // Monkey Testing
  startTesting: (config) => ipcRenderer.invoke('start-testing', config),
  stopTesting: () => ipcRenderer.invoke('stop-testing'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  
  // Session Recording
  startRecording: (config) => ipcRenderer.invoke('start-recording', config),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  pauseRecording: () => ipcRenderer.invoke('pause-recording'),
  resumeRecording: () => ipcRenderer.invoke('resume-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),
  
  // Session Management
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getSession: (sessionId) => ipcRenderer.invoke('get-session', sessionId),
  deleteSession: (sessionId) => ipcRenderer.invoke('delete-session', sessionId),
  
  // Session Replay
  replaySession: (sessionId, config) => ipcRenderer.invoke('replay-session', sessionId, config),
  stopReplay: () => ipcRenderer.invoke('stop-replay'),
  getReplayStatus: () => ipcRenderer.invoke('get-replay-status'),
  
  // Guardian Mode
  startGuardian: (config) => ipcRenderer.invoke('start-guardian', config),
  stopGuardian: () => ipcRenderer.invoke('stop-guardian'),
  getGuardianStatus: () => ipcRenderer.invoke('get-guardian-status'),
  addSessionToGuardian: (sessionId) => ipcRenderer.invoke('add-session-to-guardian', sessionId),
  removeSessionFromGuardian: (sessionId) => ipcRenderer.invoke('remove-session-from-guardian', sessionId),
  triggerGuardianCheck: () => ipcRenderer.invoke('trigger-guardian-check'),
  
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
  onTestLLMAnalysis: (callback) => {
    ipcRenderer.on('test-llm-analysis', (event, analysis) => callback(analysis));
  },
  
  // Recording events
  onRecordingStarted: (callback) => {
    ipcRenderer.on('recording-started', (event, data) => callback(data));
  },
  onRecordingStopped: (callback) => {
    ipcRenderer.on('recording-stopped', (event, session) => callback(session));
  },
  onRecordingAction: (callback) => {
    ipcRenderer.on('recording-action', (event, action) => callback(action));
  },
  onRecordingLog: (callback) => {
    ipcRenderer.on('recording-log', (event, log) => callback(log));
  },
  
  // Replay events
  onReplayProgress: (callback) => {
    ipcRenderer.on('replay-progress', (event, data) => callback(data));
  },
  onReplayComplete: (callback) => {
    ipcRenderer.on('replay-complete', (event, results) => callback(results));
  },
  onReplayLog: (callback) => {
    ipcRenderer.on('replay-log', (event, log) => callback(log));
  },
  
  // Guardian events
  onGuardianStarted: (callback) => {
    ipcRenderer.on('guardian-started', (event, data) => callback(data));
  },
  onGuardianStopped: (callback) => {
    ipcRenderer.on('guardian-stopped', (event, stats) => callback(stats));
  },
  onGuardianCheckComplete: (callback) => {
    ipcRenderer.on('guardian-check-complete', (event, data) => callback(data));
  },
  onGuardianRegression: (callback) => {
    ipcRenderer.on('guardian-regression', (event, data) => callback(data));
  },
  onGuardianLog: (callback) => {
    ipcRenderer.on('guardian-log', (event, log) => callback(log));
  },
  
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('test-error');
    ipcRenderer.removeAllListeners('test-log');
    ipcRenderer.removeAllListeners('test-stats');
    ipcRenderer.removeAllListeners('test-screenshot');
    ipcRenderer.removeAllListeners('test-llm-analysis');
    ipcRenderer.removeAllListeners('recording-started');
    ipcRenderer.removeAllListeners('recording-stopped');
    ipcRenderer.removeAllListeners('recording-action');
    ipcRenderer.removeAllListeners('recording-log');
    ipcRenderer.removeAllListeners('replay-progress');
    ipcRenderer.removeAllListeners('replay-complete');
    ipcRenderer.removeAllListeners('replay-log');
    ipcRenderer.removeAllListeners('guardian-started');
    ipcRenderer.removeAllListeners('guardian-stopped');
    ipcRenderer.removeAllListeners('guardian-check-complete');
    ipcRenderer.removeAllListeners('guardian-regression');
    ipcRenderer.removeAllListeners('guardian-log');
  }
});
