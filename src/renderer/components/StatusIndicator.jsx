import React from 'react';
import { styles } from '../styles';

export function StatusIndicator({ message, color = '#4ade80', bgColor = 'rgba(74, 222, 128, 0.1)', borderColor = 'rgba(74, 222, 128, 0.3)' }) {
  return (
    <div style={{ ...styles.statusIndicator, background: bgColor, borderColor }}>
      <div style={{ ...styles.pulse, background: color }}></div>
      <span style={{ fontSize: '13px', color }}>{message}</span>
    </div>
  );
}
