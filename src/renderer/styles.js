// Shared styles for Ghost QA components
export const styles = {
  window: {
    width: '100%',
    height: '100vh',
    background: '#1a1a2e',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
  },
  titlebar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#16213e',
    WebkitAppRegion: 'drag',
    cursor: 'move',
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 600,
    fontSize: '14px',
    color: '#fff',
  },
  ghostIcon: {
    fontSize: '20px',
    animation: 'float 3s ease-in-out infinite',
  },
  windowControls: {
    display: 'flex',
    gap: '8px',
    WebkitAppRegion: 'no-drag',
  },
  controlBtn: {
    width: '24px',
    height: '24px',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '20px',
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    color: '#a0a0a0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '12px 14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    background: '#16213e',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
  },
  inputRow: {
    display: 'flex',
    gap: '12px',
  },
  halfInput: {
    flex: 1,
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 20px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
    color: 'white',
  },
  dangerBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid #ef4444',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'rgba(74, 222, 128, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(74, 222, 128, 0.3)',
  },
  pulse: {
    width: '12px',
    height: '12px',
    background: '#4ade80',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    background: '#16213e',
    borderRadius: '8px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#fff',
  },
  statLabel: {
    fontSize: '10px',
    color: '#a0a0a0',
    textTransform: 'uppercase',
    marginTop: '4px',
  },
  screenshotContainer: {
    background: '#16213e',
    borderRadius: '8px',
    overflow: 'hidden',
    flex: 1,
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
  },
  screenshotHeader: {
    padding: '10px 14px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#a0a0a0',
    background: '#0f3460',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    background: '#000',
  },
  screenshotPlaceholder: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a0a0a0',
    fontSize: '13px',
  },
  logContainer: {
    background: '#16213e',
    borderRadius: '8px',
    overflow: 'hidden',
    maxHeight: '120px',
  },
  logHeader: {
    padding: '10px 14px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#a0a0a0',
    background: '#0f3460',
  },
  logList: {
    height: '80px',
    overflowY: 'auto',
    padding: '8px',
  },
  logItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '4px 8px',
    fontSize: '11px',
    borderRadius: '4px',
    marginBottom: '2px',
  },
  logTime: {
    color: '#a0a0a0',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '12px',
  },
  tab: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: '#a0a0a0',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    background: '#e94560',
    borderColor: '#e94560',
    color: '#fff',
  },
};

export const logColors = {
  error: '#ef4444',
  success: '#4ade80',
  warning: '#fbbf24',
  action: '#60a5fa',
  navigation: '#a78bfa',
  info: '#a0a0a0',
  llm: '#f472b6',
};

// Helper functions
export const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatLogTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

// Mode tab style generator
export const getModeTabStyle = (currentMode, targetMode) => ({
  flex: 1,
  padding: '10px',
  background: currentMode === targetMode ? '#e94560' : 'transparent',
  border: currentMode === targetMode ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '6px',
  color: currentMode === targetMode ? '#fff' : '#a0a0a0',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
});

// Global CSS string for animations
export const globalStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
  }
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: transparent;
    overflow: hidden;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #16213e;
  }
  ::-webkit-scrollbar-thumb {
    background: #0f3460;
    border-radius: 3px;
  }
  input:focus {
    border-color: #e94560 !important;
    box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.2);
  }
  button:hover {
    transform: translateY(-2px);
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;
