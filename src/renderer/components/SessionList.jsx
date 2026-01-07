import React from 'react';
import { styles } from '../styles';

export function SessionList({ 
  sessions, 
  onReplay, 
  onDelete, 
  isReplaying = false,
  selectable = false,
  selectedSessions = [],
  onToggleSelect = null,
  title = 'Saved Sessions'
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ fontSize: '11px', color: '#a0a0a0', textTransform: 'uppercase', marginBottom: '8px' }}>
        {title} ({sessions.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
        {sessions.map((session) => (
          <div
            key={session.id}
            style={{
              padding: '10px 12px',
              background: selectable && selectedSessions.includes(session.id) 
                ? 'rgba(74, 222, 128, 0.1)' 
                : '#16213e',
              border: selectable && selectedSessions.includes(session.id)
                ? '1px solid #4ade80'
                : '1px solid transparent',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: selectable ? 'pointer' : 'default',
            }}
            onClick={selectable && onToggleSelect ? () => onToggleSelect(session.id) : undefined}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {selectable && (
                <input
                  type="checkbox"
                  checked={selectedSessions.includes(session.id)}
                  onChange={() => {}}
                  style={{ width: '16px', height: '16px', accentColor: '#4ade80' }}
                />
              )}
              <div>
                <div style={{ fontSize: '12px', color: '#fff', marginBottom: '2px' }}>{session.id}</div>
                <div style={{ fontSize: '10px', color: '#a0a0a0' }}>
                  {session.actionCount} actions • {new Date(session.startTime).toLocaleDateString()}
                </div>
              </div>
            </div>
            {!selectable && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  style={{ ...styles.controlBtn, background: '#4ade80', color: '#000', fontSize: '10px' }}
                  onClick={(e) => { e.stopPropagation(); onReplay(session.id); }}
                  disabled={isReplaying}
                  title="Replay"
                >
                  ▶
                </button>
                <button
                  style={{ ...styles.controlBtn, background: '#ef4444', color: '#fff', fontSize: '10px' }}
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
