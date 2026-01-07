import React from 'react';

export function ReplayResults({ results }) {
  if (!results) return null;

  const isPassed = results.status === 'passed';

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: isPassed ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: `1px solid ${isPassed ? '#4ade80' : '#ef4444'}`,
      borderRadius: '8px',
    }}>
      <div style={{ fontSize: '12px', color: isPassed ? '#4ade80' : '#ef4444', marginBottom: '4px' }}>
        {isPassed 
          ? '✅ Replay Passed!' 
          : `❌ Replay Failed (${results.regressions?.length || 0} regression(s))`}
      </div>
      <div style={{ fontSize: '11px', color: '#a0a0a0' }}>
        {results.successfulActions}/{results.totalActions} actions • {results.successRate}% success rate
      </div>
    </div>
  );
}
