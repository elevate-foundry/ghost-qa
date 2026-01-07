import React from 'react';
import { styles, formatTime } from '../styles';

export function StatsGrid({ stats, type = 'monkey' }) {
  if (type === 'monkey') {
    return (
      <div style={styles.statsGrid}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.actionsPerformed}</span>
          <span style={styles.statLabel}>Actions</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: stats.errorsFound > 0 ? '#ef4444' : '#fff' }}>
            {stats.errorsFound}
          </span>
          <span style={styles.statLabel}>Errors</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.pagesVisited}</span>
          <span style={styles.statLabel}>Pages</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{formatTime(stats.runtime)}</span>
          <span style={styles.statLabel}>Runtime</span>
        </div>
      </div>
    );
  }

  if (type === 'recording') {
    return (
      <div style={styles.statsGrid}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.actionCount || 0}</span>
          <span style={styles.statLabel}>Actions</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats.sessionName?.slice(0, 10) || '-'}</span>
          <span style={styles.statLabel}>Session</span>
        </div>
      </div>
    );
  }

  if (type === 'guardian') {
    return (
      <div style={styles.statsGrid}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats?.totalRuns || 0}</span>
          <span style={styles.statLabel}>Runs</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: '#4ade80' }}>{stats?.passedRuns || 0}</span>
          <span style={styles.statLabel}>Passed</span>
        </div>
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: (stats?.failedRuns || 0) > 0 ? '#ef4444' : '#fff' }}>
            {stats?.failedRuns || 0}
          </span>
          <span style={styles.statLabel}>Failed</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statValue}>{stats?.passRate || 100}%</span>
          <span style={styles.statLabel}>Pass Rate</span>
        </div>
      </div>
    );
  }

  return null;
}
