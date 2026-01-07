const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { GhostTester } = require('./ghost-tester');
const { SessionRecorder } = require('./session-recorder');
const { SessionReplayer } = require('./session-replayer');
const { GuardianWorker } = require('./guardian-worker');

let mainWindow;
let tray;
let ghostTester = null;
let sessionRecorder = null;
let sessionReplayer = null;
let guardianWorker = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: true,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // Make window draggable from anywhere
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  // Dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKoSURBVFiF7ZdNaBNBFMd/s5tNYpOmH6ZVW1GxKIgHQfDgQfCgeBBBPHjw4MGDBy8ePHjw4MGDBy8ePHjw4EHw4EHwoIgHQUQQxINYpFVbP9I0TZPsZnY8bDZNmk2yScCD/mGYnZ15//fmzZsZWGON/x3in1YgIgJQAFYBEZEHgDuA+E8cEJEHwHXgJHAMGANuiMgDEXnwT+gXkQdADrgKnABGgesi8kBEHvxd/SKyHbgGnAJ2AiPAdRF5ICIPVq1fRLYB14AzwC5gGLgmIg9E5EFH+kVkK3AVOAvsBoaAqyLyQEQedKRfRIaAK8A5YA8wCFwRkQci8qAt/SKyGbgMnAf2ApuAS8B9EXnQtn4R2QhcAi4A+4ANwEXgnog8aEu/iKwHLgIXgQPAeuACcFdEHrSlX0TWAReAi8BBYBi4ANwRkQct6xeRAeA8cAk4BAwB54HbIvKgZf0i0g+cAy4Dh4EB4BxwS0QetKxfRPqAs8AV4AgwAJwFborIg5b1i0gvcAa4ChwF+oEzwA0RedCyfhHpAU4D14BjQB9wGrguIg9a1i8i3cAp4DpwHOgFTgHXRORBy/pFpAs4CVwHTgC9wEngqog8aFm/iHQCJ4AbwEmgBzgBXBGRBy3rF5EO4DhwEzgFdAPHgcsi8qBl/SLSDhwDbgGngS7gGHBJRB60rF9E2oCjwG3gDNAJHAUuisiDlvWLSCtwBLgDnAU6gCPABRF50LJ+EWkBDgN3gXNAO3AYOCciD1rWLyLNwCHgHnAeaAMOAWdF5EHL+kWkCTgI3AcuAK3AQeCMiDxoWb+INAIHgAfARaAFOACcFpEHLesXkQZgP/AQuAS0APuBUyLyoGX9IlIP7AMeAZeBZmAfcFJEHqyxxv+OX3bPLfLaCMkwAAAAAElFTkSuQmCC'
  );
  
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Ghost QA', click: () => mainWindow.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('Ghost QA Tester');
  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.handle('start-testing', async (event, config) => {
  try {
    if (ghostTester) {
      await ghostTester.stop();
    }
    
    ghostTester = new GhostTester(config, {
      onError: (error) => {
        mainWindow.webContents.send('test-error', error);
        showNotification('Ghost QA: Error Found!', error.message);
      },
      onLog: (log) => {
        mainWindow.webContents.send('test-log', log);
      },
      onStats: (stats) => {
        mainWindow.webContents.send('test-stats', stats);
      },
      onScreenshot: (screenshot) => {
        mainWindow.webContents.send('test-screenshot', screenshot);
      },
      onLLMAnalysis: (analysis) => {
        mainWindow.webContents.send('test-llm-analysis', analysis);
        if (analysis.issues?.length > 0) {
          const highSeverity = analysis.issues.filter(i => i.severity === 'high').length;
          if (highSeverity > 0) {
            showNotification('Ghost QA: LLM Found Issues!', `${highSeverity} high severity issue(s) detected`);
          }
        }
      }
    });
    
    await ghostTester.start();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-testing', async () => {
  if (ghostTester) {
    await ghostTester.stop();
    ghostTester = null;
  }
  return { success: true };
});

ipcMain.handle('get-status', () => {
  return {
    running: ghostTester?.isRunning() || false,
    stats: ghostTester?.getStats() || null
  };
});

// ============ SESSION RECORDING ============

ipcMain.handle('start-recording', async (event, config) => {
  try {
    if (sessionRecorder) {
      await sessionRecorder.stop();
    }
    
    sessionRecorder = new SessionRecorder(config, {
      onRecordingStarted: (data) => {
        mainWindow.webContents.send('recording-started', data);
      },
      onRecordingStopped: (session) => {
        mainWindow.webContents.send('recording-stopped', session);
      },
      onAction: (action) => {
        mainWindow.webContents.send('recording-action', action);
      },
      onLog: (log) => {
        mainWindow.webContents.send('recording-log', log);
      }
    });
    
    await sessionRecorder.start();
    return { success: true, sessionName: config.sessionName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-recording', async () => {
  if (sessionRecorder) {
    const session = await sessionRecorder.stop();
    sessionRecorder = null;
    return { success: true, session };
  }
  return { success: false, error: 'No recording in progress' };
});

ipcMain.handle('pause-recording', async () => {
  if (sessionRecorder) {
    await sessionRecorder.pause();
    return { success: true };
  }
  return { success: false, error: 'No recording in progress' };
});

ipcMain.handle('resume-recording', async () => {
  if (sessionRecorder) {
    await sessionRecorder.resume();
    return { success: true };
  }
  return { success: false, error: 'No recording in progress' };
});

ipcMain.handle('get-recording-status', () => {
  return {
    recording: sessionRecorder?.isRecording() || false,
    info: sessionRecorder?.getSessionInfo() || null
  };
});

// ============ SESSION MANAGEMENT ============

ipcMain.handle('get-sessions', () => {
  return SessionRecorder.getSessions();
});

ipcMain.handle('get-session', (event, sessionId) => {
  return SessionRecorder.getSession(sessionId);
});

ipcMain.handle('delete-session', (event, sessionId) => {
  return SessionRecorder.deleteSession(sessionId);
});

// ============ SESSION REPLAY ============

ipcMain.handle('replay-session', async (event, sessionId, config = {}) => {
  try {
    const session = SessionRecorder.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    if (sessionReplayer) {
      sessionReplayer.abort();
    }
    
    sessionReplayer = new SessionReplayer(session, config, {
      onLog: (log) => {
        mainWindow.webContents.send('replay-log', log);
      },
      onActionComplete: (data) => {
        mainWindow.webContents.send('replay-progress', data);
      },
      onComplete: (results) => {
        mainWindow.webContents.send('replay-complete', results);
        if (results.status === 'failed') {
          showNotification('Ghost QA: Regression Found!', `${results.regressions.length} action(s) failed during replay`);
        }
      }
    });
    
    // Start replay in background
    sessionReplayer.start().then(() => {
      sessionReplayer = null;
    });
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-replay', () => {
  if (sessionReplayer) {
    sessionReplayer.abort();
    sessionReplayer = null;
    return { success: true };
  }
  return { success: false, error: 'No replay in progress' };
});

ipcMain.handle('get-replay-status', () => {
  return {
    running: sessionReplayer?.isRunning() || false,
    progress: sessionReplayer?.getProgress() || null
  };
});

// ============ GUARDIAN MODE ============

ipcMain.handle('start-guardian', async (event, config) => {
  try {
    if (guardianWorker) {
      await guardianWorker.stop();
    }
    
    guardianWorker = new GuardianWorker(config, {
      onStarted: (data) => {
        mainWindow.webContents.send('guardian-started', data);
      },
      onStopped: (stats) => {
        mainWindow.webContents.send('guardian-stopped', stats);
      },
      onCheckComplete: (data) => {
        mainWindow.webContents.send('guardian-check-complete', data);
      },
      onRegression: (data) => {
        mainWindow.webContents.send('guardian-regression', data);
        showNotification('👻 Ghost QA: Regression Detected!', 
          `Session "${data.sessionId}" failed with ${data.results.regressions.length} broken action(s)`);
      },
      onLog: (log) => {
        mainWindow.webContents.send('guardian-log', log);
      },
      onReplayProgress: (data) => {
        mainWindow.webContents.send('replay-progress', data);
      }
    });
    
    await guardianWorker.start();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-guardian', async () => {
  if (guardianWorker) {
    await guardianWorker.stop();
    guardianWorker = null;
    return { success: true };
  }
  return { success: false, error: 'Guardian not running' };
});

ipcMain.handle('get-guardian-status', () => {
  return {
    running: guardianWorker?.isRunning() || false,
    stats: guardianWorker?.getStats() || null,
    sessions: guardianWorker?.getWatchedSessions() || []
  };
});

ipcMain.handle('add-session-to-guardian', (event, sessionId) => {
  if (guardianWorker) {
    guardianWorker.addSession(sessionId);
    return { success: true };
  }
  return { success: false, error: 'Guardian not running' };
});

ipcMain.handle('remove-session-from-guardian', (event, sessionId) => {
  if (guardianWorker) {
    guardianWorker.removeSession(sessionId);
    return { success: true };
  }
  return { success: false, error: 'Guardian not running' };
});

ipcMain.handle('trigger-guardian-check', async () => {
  if (guardianWorker) {
    await guardianWorker.triggerCheck();
    return { success: true };
  }
  return { success: false, error: 'Guardian not running' };
});

function showNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (ghostTester) {
    await ghostTester.stop();
  }
  if (sessionRecorder) {
    await sessionRecorder.stop();
  }
  if (sessionReplayer) {
    sessionReplayer.abort();
  }
  if (guardianWorker) {
    await guardianWorker.stop();
  }
});
