const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { GhostTester } = require('./ghost-tester');

let mainWindow;
let tray;
let ghostTester = null;

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
});
