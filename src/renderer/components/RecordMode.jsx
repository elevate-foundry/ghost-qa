import React, { useState } from 'react';
import { styles, formatLogTime } from '../styles';
import { StatusIndicator } from './StatusIndicator';
import { StatsGrid } from './StatsGrid';
import { SessionList } from './SessionList';
import { ReplayResults } from './ReplayResults';

export function RecordMode({
  isRecording,
  recordingInfo,
  recordedActions,
  sessions,
  isReplaying,
  replayResults,
  isStarting,
  onStartRecording,
  onStopRecording,
  onReplaySession,
  onDeleteSession,
}) {
  const [config, setConfig] = useState({
    url: 'http://localhost:3000',
    sessionName: '',
    llmEnabled: true, // Enable by default for AI-powered intents
    llmProvider: 'ollama', // Local, no API key needed
  });

  const handleStart = async () => {
    try {
      await onStartRecording(config);
    } catch (err) {
      alert(err.message);
    }
  };

  // Recording in progress view
  if (isRecording) {
    return (
      <>
        <StatusIndicator
          message="Recording in progress..."
          color="#ef4444"
          bgColor="rgba(96, 165, 250, 0.1)"
          borderColor="rgba(96, 165, 250, 0.3)"
        />

        <StatsGrid
          type="recording"
          stats={{ actionCount: recordedActions.length, sessionName: recordingInfo?.sessionName }}
        />

        {/* Recorded Actions Log */}
        <div style={{ ...styles.logContainer, flex: 1, maxHeight: 'none' }}>
          <div style={{ ...styles.logHeader, background: 'rgba(96, 165, 250, 0.2)' }}>
            Recorded Actions (Natural Language Intent)
          </div>
          <div style={{ ...styles.logList, height: '250px' }}>
            {recordedActions.map((action, i) => (
              <div key={i} style={{ ...styles.logItem, background: 'transparent' }}>
                <span style={styles.logTime}>{formatLogTime(action.timestamp)}</span>
                <span style={{ color: action.llmIntent ? '#f472b6' : '#60a5fa', wordBreak: 'break-word' }}>
                  {action.intent || action.type}
                  {action.llmIntent && action.llmIntent !== action.localIntent && (
                    <span style={{ color: '#a0a0a0', fontSize: '10px', marginLeft: '4px' }}>✨</span>
                  )}
                </span>
              </div>
            ))}
            {recordedActions.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0', fontSize: '12px' }}>
                Interact with your app in the browser window...
              </div>
            )}
          </div>
        </div>

        <button style={{ ...styles.btn, ...styles.dangerBtn }} onClick={onStopRecording}>
          <span>■</span>
          Stop Recording & Save
        </button>
      </>
    );
  }

  // Config view
  return (
    <>
      <div style={{ padding: '12px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.3)', marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '8px' }}>
          <strong>🎬 Session Recording</strong>
        </p>
        <p style={{ fontSize: '11px', color: '#a0a0a0' }}>
          Record your natural interactions with your app. Ghost QA captures every action as AI-powered intent that can be replayed to detect regressions.
        </p>
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Target URL</label>
        <input
          type="url"
          style={styles.input}
          value={config.url}
          onChange={(e) => setConfig({ ...config, url: e.target.value })}
          placeholder="http://localhost:3000"
        />
      </div>

      <div style={styles.inputGroup}>
        <label style={styles.label}>Session Name (optional)</label>
        <input
          type="text"
          style={styles.input}
          value={config.sessionName}
          onChange={(e) => setConfig({ ...config, sessionName: e.target.value })}
          placeholder="e.g., login-flow, checkout-test"
        />
      </div>

      {/* AI Intent Toggle */}
      <div style={{ 
        padding: '10px 12px', 
        background: config.llmEnabled ? 'rgba(244, 114, 182, 0.1)' : '#16213e',
        border: config.llmEnabled ? '1px solid #f472b6' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🧠</span>
          <div>
            <div style={{ fontSize: '12px', color: config.llmEnabled ? '#f472b6' : '#a0a0a0' }}>
              AI-Powered Intents
            </div>
            <div style={{ fontSize: '10px', color: '#666' }}>
              {config.llmEnabled ? 'Ollama (local) • Real-time' : 'Disabled'}
            </div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={config.llmEnabled}
          onChange={(e) => setConfig({ ...config, llmEnabled: e.target.checked })}
          style={{ width: '18px', height: '18px', accentColor: '#f472b6' }}
        />
      </div>

      <button
        style={{ ...styles.btn, ...styles.primaryBtn, background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }}
        onClick={handleStart}
        disabled={isStarting}
      >
        <span>{isStarting ? '⏳' : '⏺'}</span>
        {isStarting ? 'Starting...' : 'Start Recording'}
      </button>

      {/* Saved Sessions */}
      <SessionList
        sessions={sessions}
        onReplay={onReplaySession}
        onDelete={onDeleteSession}
        isReplaying={isReplaying}
      />

      {/* Replay Results */}
      <ReplayResults results={replayResults} />
    </>
  );
}
