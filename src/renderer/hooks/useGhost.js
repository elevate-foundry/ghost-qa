import { useState, useEffect, useCallback } from 'react';

// Custom hook for Ghost QA IPC communication
export function useGhost() {
  // Monkey Testing State
  const [isRunning, setIsRunning] = useState(false);
  const [stats, setStats] = useState({
    actionsPerformed: 0,
    errorsFound: 0,
    pagesVisited: 0,
    llmIssuesFound: 0,
    runtime: 0,
  });
  const [logs, setLogs] = useState([]);
  const [screenshot, setScreenshot] = useState(null);
  const [llmAnalysis, setLlmAnalysis] = useState(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState(null);
  const [recordedActions, setRecordedActions] = useState([]);
  const [recordingLogs, setRecordingLogs] = useState([]);

  // Sessions State
  const [sessions, setSessions] = useState([]);

  // Guardian State
  const [guardianRunning, setGuardianRunning] = useState(false);
  const [guardianStats, setGuardianStats] = useState(null);
  const [guardianLogs, setGuardianLogs] = useState([]);
  const [regressions, setRegressions] = useState([]);

  // Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(null);
  const [replayResults, setReplayResults] = useState(null);

  // Loading states
  const [isStarting, setIsStarting] = useState(false);

  // Load sessions
  const loadSessions = useCallback(async () => {
    const sessionList = await window.ghostAPI.getSessions();
    setSessions(sessionList);
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Monkey Testing listeners
    window.ghostAPI.onTestLog((log) => {
      setLogs((prev) => [...prev.slice(-99), log]);
    });

    window.ghostAPI.onTestError((error) => {
      setLogs((prev) => [
        ...prev.slice(-99),
        { level: 'error', message: `${error.type}: ${error.message}`, timestamp: error.timestamp },
      ]);
    });

    window.ghostAPI.onTestStats((newStats) => {
      setStats(newStats);
    });

    window.ghostAPI.onTestScreenshot((data) => {
      setScreenshot(data);
    });

    window.ghostAPI.onTestLLMAnalysis((analysis) => {
      setLlmAnalysis(analysis);
    });

    // Recording listeners
    window.ghostAPI.onRecordingStarted((data) => {
      setRecordingInfo(data);
    });

    window.ghostAPI.onRecordingStopped(() => {
      setIsRecording(false);
      setRecordingInfo(null);
      loadSessions();
    });

    window.ghostAPI.onRecordingAction((action) => {
      setRecordedActions((prev) => {
        // Check if this is an update to an existing action (LLM enhancement)
        const existingIdx = prev.findIndex(a => a.actionIndex === action.actionIndex);
        if (existingIdx !== -1) {
          // Update existing action with LLM-enhanced intent
          const updated = [...prev];
          updated[existingIdx] = action;
          return updated;
        }
        // New action - append
        return [...prev.slice(-99), action];
      });
    });

    window.ghostAPI.onRecordingLog((log) => {
      setRecordingLogs((prev) => [...prev.slice(-99), log]);
    });

    // Replay listeners
    window.ghostAPI.onReplayProgress((data) => {
      setReplayProgress(data);
    });

    window.ghostAPI.onReplayComplete((results) => {
      setIsReplaying(false);
      setReplayResults(results);
    });

    window.ghostAPI.onReplayLog((log) => {
      setRecordingLogs((prev) => [...prev.slice(-99), log]);
    });

    // Guardian listeners
    window.ghostAPI.onGuardianStarted(() => {
      setGuardianRunning(true);
    });

    window.ghostAPI.onGuardianStopped((stats) => {
      setGuardianRunning(false);
      setGuardianStats(stats);
    });

    window.ghostAPI.onGuardianCheckComplete((data) => {
      setGuardianStats(data.stats);
    });

    window.ghostAPI.onGuardianRegression((data) => {
      setRegressions((prev) => [...prev, data]);
    });

    window.ghostAPI.onGuardianLog((log) => {
      setGuardianLogs((prev) => [...prev.slice(-99), log]);
    });

    // Check initial status
    window.ghostAPI.getStatus().then((status) => {
      if (status.running) {
        setIsRunning(true);
        if (status.stats) setStats(status.stats);
      }
    });

    // Load sessions
    loadSessions();

    return () => {
      window.ghostAPI.removeAllListeners();
    };
  }, [loadSessions]);

  // Monkey Testing Actions
  const startTesting = useCallback(async (config) => {
    if (!config.url?.trim()) {
      throw new Error('Please enter a URL');
    }

    setIsStarting(true);
    try {
      const result = await window.ghostAPI.startTesting(config);
      if (result.success) {
        setIsRunning(true);
        setLogs([]);
        setScreenshot(null);
        setLlmAnalysis(null);
      } else {
        throw new Error(result.error);
      }
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopTesting = useCallback(async () => {
    await window.ghostAPI.stopTesting();
    setIsRunning(false);
  }, []);

  // Recording Actions
  const startRecording = useCallback(async (config) => {
    if (!config.url?.trim()) {
      throw new Error('Please enter a URL');
    }

    const sessionName = config.sessionName?.trim() || `session-${Date.now()}`;
    setIsStarting(true);

    try {
      const result = await window.ghostAPI.startRecording({
        ...config,
        sessionName,
      });

      if (result.success) {
        setIsRecording(true);
        setRecordedActions([]);
        setRecordingLogs([]);
      } else {
        throw new Error(result.error);
      }
    } finally {
      setIsStarting(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const result = await window.ghostAPI.stopRecording();
    if (result.success) {
      setIsRecording(false);
      setRecordingInfo(null);
      loadSessions();
    }
  }, [loadSessions]);

  // Replay Actions
  const replaySession = useCallback(async (sessionId, config = {}) => {
    setIsReplaying(true);
    setReplayProgress(null);
    setReplayResults(null);

    const result = await window.ghostAPI.replaySession(sessionId, config);
    if (!result.success) {
      setIsReplaying(false);
      throw new Error(result.error);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    await window.ghostAPI.deleteSession(sessionId);
    loadSessions();
  }, [loadSessions]);

  // Guardian Actions
  const startGuardian = useCallback(async (config) => {
    if (config.sessions.length === 0) {
      throw new Error('Please select at least one session to watch');
    }

    const result = await window.ghostAPI.startGuardian(config);
    if (result.success) {
      setGuardianRunning(true);
      setGuardianLogs([]);
      setRegressions([]);
    } else {
      throw new Error(result.error);
    }
  }, []);

  const stopGuardian = useCallback(async () => {
    await window.ghostAPI.stopGuardian();
    setGuardianRunning(false);
  }, []);

  return {
    // Monkey Testing
    isRunning,
    stats,
    logs,
    screenshot,
    llmAnalysis,
    startTesting,
    stopTesting,

    // Recording
    isRecording,
    recordingInfo,
    recordedActions,
    recordingLogs,
    startRecording,
    stopRecording,

    // Sessions
    sessions,
    loadSessions,
    deleteSession,

    // Replay
    isReplaying,
    replayProgress,
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
  };
}
