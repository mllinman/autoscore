import React from 'react';
import { useApp } from '../context/AppContext';
import { INSTRUMENTS, EXPORT_FORMATS } from '../utils/constants';
import { Music, Download, Settings, FileAudio, Zap } from 'lucide-react';

export default function Header() {
  const { state, dispatch } = useApp();

  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo-icon">
          <Music size={16} />
        </div>
        <h1>AutoScore</h1>
      </div>

      <div className="header-center">
        {state.fileName && (
          <span style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}>
            <FileAudio size={14} />
            {state.fileName}
          </span>
        )}

        {state.audioBuffer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <label style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>Instrument:</label>
            <select
              className="select"
              value={state.instrument.id}
              onChange={(e) => {
                const inst = INSTRUMENTS.find(i => i.id === e.target.value);
                if (inst) dispatch({ type: 'SET_INSTRUMENT', payload: inst });
              }}
            >
              {INSTRUMENTS.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="header-actions">
        {state.notes.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => dispatch({ type: 'TOGGLE_EXPORT_DIALOG' })}
          >
            <Download size={14} />
            Export
          </button>
        )}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
