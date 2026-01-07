import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { styles, globalStyles, getModeTabStyle } from './styles';
import { useGhost } from './hooks/useGhost';
import { TitleBar, RecordMode, GuardianMode } from './components';

function App() {
  const [mode, setMode] = useState('record');
  
  const {
    // Recording
    isRecording,
    recordingInfo,
    recordedActions,
    startRecording,
    stopRecording,

    // Sessions
    sessions,
    deleteSession,

    // Replay
    isReplaying,
    replayResults,
    replaySession,

    // Guardian
    guardianRunning,
    guardianStats,
    guardianLogs,
    regressions,
    startGuardian,
    stopGuardian,

    // Loading
    isStarting,
  } = useGhost();

  // Don't show mode tabs when actively recording or guardian is running
  const showModeTabs = !isRecording && !guardianRunning;

  return (
    <div style={styles.window}>
      <TitleBar />

      <div style={styles.content}>
        {/* Mode Tabs */}
        {showModeTabs && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button style={getModeTabStyle(mode, 'record')} onClick={() => setMode('record')}>
              🎬 Record
            </button>
            <button style={getModeTabStyle(mode, 'guardian')} onClick={() => setMode('guardian')}>
              🛡️ Guardian
            </button>
          </div>
        )}

        {/* Record Mode */}
        {mode === 'record' && (
          <RecordMode
            isRecording={isRecording}
            recordingInfo={recordingInfo}
            recordedActions={recordedActions}
            sessions={sessions}
            isReplaying={isReplaying}
            replayResults={replayResults}
            isStarting={isStarting}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onReplaySession={(id) => replaySession(id, { headless: false })}
            onDeleteSession={(id) => {
              if (confirm(`Delete session "${id}"?`)) {
                deleteSession(id);
              }
            }}
          />
        )}

        {/* Guardian Mode */}
        {mode === 'guardian' && (
          <GuardianMode
            sessions={sessions}
            guardianRunning={guardianRunning}
            guardianStats={guardianStats}
            guardianLogs={guardianLogs}
            regressions={regressions}
            onStartGuardian={startGuardian}
            onStopGuardian={stopGuardian}
          />
        )}
      </div>

      <style>{globalStyles}</style>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
