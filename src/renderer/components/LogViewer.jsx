import React, { useRef, useEffect } from 'react';
import { styles, logColors, formatLogTime } from '../styles';

export function LogViewer({ logs, title = 'Activity Log', headerBg = '#0f3460', height = '80px', flex = false }) {
  const logListRef = useRef(null);

  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{ ...styles.logContainer, ...(flex ? { flex: 1, maxHeight: 'none' } : {}) }}>
      <div style={{ ...styles.logHeader, background: headerBg }}>{title}</div>
      <div style={{ ...styles.logList, height }} ref={logListRef}>
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              ...styles.logItem,
              background: log.level === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                         log.level === 'llm' ? 'rgba(244, 114, 182, 0.1)' : 'transparent',
            }}
          >
            <span style={styles.logTime}>{formatLogTime(log.timestamp)}</span>
            <span style={{ color: logColors[log.level] || '#fff', wordBreak: 'break-word' }}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
