import React, { useState } from 'react';
import { styles, formatLogTime, logColors } from '../styles';
import { StatusIndicator } from './StatusIndicator';
import { StatsGrid } from './StatsGrid';
import { SessionList } from './SessionList';

export function GuardianMode({
  sessions,
  guardianRunning,
  guardianStats,
  guardianLogs,
  regressions,
  onStartGuardian,
  onStopGuardian,
}) {
  const [config, setConfig] = useState({
    sessions: [],
    interval: 60000,
    headless: true,
  });

  const toggleSession = (sessionId) => {
    setConfig((prev) => {
      const sessions = prev.sessions.includes(sessionId)
        ? prev.sessions.filter((id) => id !== sessionId)
        : [...prev.sessions, sessionId];
      return { ...prev, sessions };
    });
  };

  const handleStart = async () => {
    try {
      await onStartGuardian(config);
    } catch (err) {
      alert(err.message);
    }
  };

  // Guardian running view
  if (guardianRunning) {
    return (
      <>
        <StatusIndicator
          message="Guardian is watching..."
          color="#4ade80"
          bgColor="rgba(74, 222, 128, 0.1)"
          borderColor="rgba(74, 222, 128, 0.3)"
        />

        <StatsGrid type="guardian" stats={guardianStats} />

        {/* Regressions */}
        {regressions.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', marginBottom: '8px' }}>
              ⚠️ Regressions Detected ({regressions.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
              {regressions.map((reg, i) => (
                <div key={i} style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid #ef4444' }}>
                  <div style={{ fontSize: '11px', color: '#ef4444' }}>
                    {reg.sessionId}: {reg.results.regressions.length} broken action(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guardian Log */}
        <div style={{ ...styles.logContainer, flex: 1, maxHeight: 'none' }}>
          <div style={{ ...styles.logHeader, background: 'rgba(74, 222, 128, 0.2)' }}>
            Guardian Activity
          </div>
          <div style={{ ...styles.logList, height: '150px' }}>
            {guardianLogs.map((log, i) => (
              <div key={i} style={{ ...styles.logItem, background: log.level === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'transparent' }}>
                <span style={styles.logTime}>{formatLogTime(log.timestamp)}</span>
                <span style={{ color: logColors[log.level] || '#4ade80', wordBreak: 'break-word' }}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button style={{ ...styles.btn, ...styles.dangerBtn }} onClick={onStopGuardian}>
          <span>■</span>
          Stop Guardian
        </button>
      </>
    );
  }

  // Config view
  return (
    <>
      <div style={{ padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.3)', marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '8px' }}>
          <strong>🛡️ Guardian Mode</strong>
        </p>
        <p style={{ fontSize: '11px', color: '#a0a0a0' }}>
          Select recorded sessions to watch. Guardian replays them periodically in the background and alerts you if any actions fail — catching regressions before you commit.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#a0a0a0', fontSize: '12px' }}>
          No sessions recorded yet. Switch to Record mode to create your first session.
        </div>
      ) : (
        <>
          <SessionList
            sessions={sessions}
            selectable={true}
            selectedSessions={config.sessions}
            onToggleSelect={toggleSession}
            title="Select Sessions to Watch"
          />

          <div style={{ ...styles.inputGroup, marginTop: '12px' }}>
            <label style={styles.label}>Check Interval</label>
            <select
              style={{ ...styles.input, cursor: 'pointer' }}
              value={config.interval}
              onChange={(e) => setConfig({ ...config, interval: parseInt(e.target.value) })}
            >
              <option value={30000}>Every 30 seconds</option>
              <option value={60000}>Every 1 minute</option>
              <option value={300000}>Every 5 minutes</option>
              <option value={600000}>Every 10 minutes</option>
            </select>
          </div>

          <div style={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="headless"
              checked={config.headless}
              onChange={(e) => setConfig({ ...config, headless: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: '#4ade80' }}
            />
            <label htmlFor="headless" style={{ fontSize: '13px', color: '#a0a0a0' }}>
              Run headless (no visible browser)
            </label>
          </div>

          <button
            style={{ ...styles.btn, ...styles.primaryBtn, background: 'linear-gradient(135deg, #4ade80, #22c55e)' }}
            onClick={handleStart}
            disabled={config.sessions.length === 0}
          >
            <span>🛡️</span>
            Start Guardian
          </button>
        </>
      )}
    </>
  );
}
