import React from 'react';
import { styles } from '../styles';

export function TitleBar() {
  return (
    <div style={styles.titlebar}>
      <div style={styles.title}>
        <span style={styles.ghostIcon}>👻</span>
        <span>Ghost QA</span>
      </div>
      <div style={styles.windowControls}>
        <button
          style={{ ...styles.controlBtn, background: '#fbbf24', color: '#000' }}
          onClick={() => {}}
        >
          −
        </button>
        <button
          style={{ ...styles.controlBtn, background: '#ef4444', color: '#fff' }}
          onClick={() => window.close()}
        >
          ×
        </button>
      </div>
    </div>
  );
}
