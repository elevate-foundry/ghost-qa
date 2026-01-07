// DOM Elements
const configSection = document.getElementById('config-section');
const runningSection = document.getElementById('running-section');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const urlInput = document.getElementById('url');
const intervalInput = document.getElementById('interval');
const maxActionsInput = document.getElementById('maxActions');
const screenshotCheckbox = document.getElementById('screenshotOnError');
const logList = document.getElementById('log-list');

// Stats elements
const statActions = document.getElementById('stat-actions');
const statErrors = document.getElementById('stat-errors');
const statPages = document.getElementById('stat-pages');
const statTime = document.getElementById('stat-time');

// Window controls
document.getElementById('minimize').addEventListener('click', () => {
  // Electron doesn't have a direct minimize for frameless windows
  // This could be implemented via IPC if needed
});

document.getElementById('close').addEventListener('click', () => {
  window.close();
});

// Start testing
startBtn.addEventListener('click', async () => {
  const config = {
    url: urlInput.value.trim(),
    interval: parseInt(intervalInput.value) || 2000,
    maxActions: parseInt(maxActionsInput.value) || 100,
    screenshotOnError: screenshotCheckbox.checked
  };
  
  if (!config.url) {
    alert('Please enter a URL');
    return;
  }
  
  startBtn.disabled = true;
  startBtn.innerHTML = '<span class="btn-icon">⏳</span> Starting...';
  
  const result = await window.ghostAPI.startTesting(config);
  
  if (result.success) {
    configSection.classList.add('hidden');
    runningSection.classList.remove('hidden');
    logList.innerHTML = '';
  } else {
    alert('Failed to start: ' + result.error);
    startBtn.disabled = false;
    startBtn.innerHTML = '<span class="btn-icon">▶</span> Start Testing';
  }
});

// Stop testing
stopBtn.addEventListener('click', async () => {
  stopBtn.disabled = true;
  stopBtn.innerHTML = '<span class="btn-icon">⏳</span> Stopping...';
  
  await window.ghostAPI.stopTesting();
  
  configSection.classList.remove('hidden');
  runningSection.classList.add('hidden');
  startBtn.disabled = false;
  startBtn.innerHTML = '<span class="btn-icon">▶</span> Start Testing';
  stopBtn.disabled = false;
  stopBtn.innerHTML = '<span class="btn-icon">■</span> Stop Testing';
});

// Listen for logs
window.ghostAPI.onTestLog((log) => {
  addLogEntry(log);
});

// Listen for errors
window.ghostAPI.onTestError((error) => {
  addLogEntry({
    level: 'error',
    message: `${error.type}: ${error.message}`,
    timestamp: error.timestamp
  });
});

// Listen for stats updates
window.ghostAPI.onTestStats((stats) => {
  statActions.textContent = stats.actionsPerformed;
  statErrors.textContent = stats.errorsFound;
  statPages.textContent = stats.pagesVisited;
  statTime.textContent = formatTime(stats.runtime);
});

function addLogEntry(log) {
  const entry = document.createElement('div');
  entry.className = `log-item ${log.level}`;
  
  const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  entry.innerHTML = `
    <span class="time">${time}</span>
    <span class="message">${escapeHtml(log.message)}</span>
  `;
  
  logList.appendChild(entry);
  logList.scrollTop = logList.scrollHeight;
  
  // Keep only last 100 entries
  while (logList.children.length > 100) {
    logList.removeChild(logList.firstChild);
  }
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Check initial status on load
(async () => {
  const status = await window.ghostAPI.getStatus();
  if (status.running) {
    configSection.classList.add('hidden');
    runningSection.classList.remove('hidden');
    if (status.stats) {
      statActions.textContent = status.stats.actionsPerformed;
      statErrors.textContent = status.stats.errorsFound;
      statPages.textContent = status.stats.pagesVisited;
      statTime.textContent = formatTime(status.stats.runtime);
    }
  }
})();
