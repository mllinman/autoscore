import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Music, 
  Trash2, 
  Circle, 
  Minus, 
  Hash, 
  Type,
  ChevronDown,
  Zap
} from 'lucide-react';

const DURATIONS = [
  { id: 'whole', label: 'Whole', icon: Circle },
  { id: 'half', label: 'Half', icon: Circle }, // Should use custom SVGs for better representation
  { id: 'quarter', label: 'Quarter', icon: Music },
  { id: 'eighth', label: 'Eighth', icon: Music },
  { id: 'sixteenth', label: 'Sixteenth', icon: Music },
];

const ACCIDENTALS = [
  { id: 'sharp', label: 'Sharp', symbol: '♯' },
  { id: 'flat', label: 'Flat', symbol: '♭' },
  { id: 'natural', label: 'Natural', symbol: '♮' },
];

export default function NotationToolbar() {
  const { state, dispatch } = useApp();
  const { notationDuration, notationAccidental, activeTool } = state;

  return (
    <div className="notation-toolbar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      padding: 'var(--space-xs) var(--space-md)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      height: '40px',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      {/* Selection Tool */}
      <button 
        className={`btn btn-sm btn-icon ${activeTool === 'select' ? 'active' : ''}`}
        onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' })}
        title="Select (V)"
      >
        <Zap size={16} />
      </button>

      <div className="toolbar-separator" />

      {/* Durations */}
      <div className="btn-group">
        {DURATIONS.map(d => (
          <button
            key={d.id}
            className={`btn btn-sm btn-icon ${notationDuration === d.id && activeTool === 'notation' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_NOTATION_DURATION', payload: d.id })}
            title={`${d.label} Note`}
          >
            <d.icon size={16} />
          </button>
        ))}
      </div>

      <div className="toolbar-separator" />

      {/* Accidentals */}
      <div className="btn-group">
        {ACCIDENTALS.map(a => (
          <button
            key={a.id}
            className={`btn btn-sm btn-icon ${notationAccidental === a.id ? 'active' : ''}`}
            onClick={() => dispatch({ 
              type: 'SET_NOTATION_ACCIDENTAL', 
              payload: notationAccidental === a.id ? null : a.id 
            })}
            title={a.label}
            style={{ fontSize: '16px', fontWeight: 'bold' }}
          >
            {a.symbol}
          </button>
        ))}
      </div>

      <div className="toolbar-separator" />

      {/* Operations */}
      <button 
        className="btn btn-sm btn-icon text-danger"
        onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
        title="Delete (Del)"
      >
        <Trash2 size={16} />
      </button>

      <div style={{ flex: 1 }} />

      {/* Status Info */}
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
         <span>Selection: {state.selectedNotes.length} notes</span>
         <div className="toolbar-separator" />
         <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
           {activeTool === 'notation' ? `Tool: ${notationDuration} note` : 'Tool: Select'}
         </span>
      </div>
    </div>
  );
}
