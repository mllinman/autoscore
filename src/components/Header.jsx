import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { INSTRUMENTS } from '../utils/constants';
import {
  Music, FileAudio, Download, Settings, ChevronDown,
  FolderOpen, Save, FileText, X
} from 'lucide-react';

export default function Header() {
  const { state, dispatch } = useApp();
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileMenuRef = useRef(null);

  // Close file menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setShowFileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        {/* Branding */}
        <div className="header-brand">
          <div className="brand-icon">
            <Music size={16} />
          </div>
          <span className="brand-text">AutoScore</span>
        </div>

        {/* File Menu */}
        <div className="header-menu" ref={fileMenuRef}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowFileMenu(!showFileMenu)}
            style={{ fontSize: 'var(--text-sm)' }}
          >
            File <ChevronDown size={12} />
          </button>

          {showFileMenu && (
            <div className="dropdown-menu" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              minWidth: 180,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              padding: 'var(--space-xs)',
              overflow: 'hidden',
            }}>
              <button className="dropdown-item" onClick={() => {
                dispatch({ type: 'TOGGLE_OPEN_DIALOG' });
                setShowFileMenu(false);
              }}>
                <FolderOpen size={14} /> Open...
              </button>
              <button className="dropdown-item" disabled>
                <Save size={14} /> Save Project
              </button>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
              <button className="dropdown-item" onClick={() => {
                dispatch({ type: 'TOGGLE_EXPORT_DIALOG' });
                setShowFileMenu(false);
              }}>
                <Download size={14} /> Export...
              </button>
              <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
              <button className="dropdown-item" onClick={() => {
                dispatch({ type: 'TOGGLE_SETTINGS' });
                setShowFileMenu(false);
              }}>
                <Settings size={14} /> Preferences
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Filename & info */}
      <div className="header-center">
        {state.fileName && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
          }}>
            <FileAudio size={14} />
            <span>{state.fileName}</span>
            {state.notes.length > 0 && (
              <span style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                background: 'var(--bg-tertiary)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
              }}>
                {state.notes.length} notes
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="header-right">
        {/* Instrument selector */}
        <select
          className="select header-select"
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

        {/* Open button */}
        <button
          className="btn btn-sm"
          onClick={() => dispatch({ type: 'TOGGLE_OPEN_DIALOG' })}
          title="Open file"
        >
          <FolderOpen size={14} />
        </button>

        {/* Export button */}
        {state.notes.length > 0 && (
          <button
            className="btn btn-sm btn-primary"
            onClick={() => dispatch({ type: 'TOGGLE_EXPORT_DIALOG' })}
          >
            <Download size={14} />
            Export
          </button>
        )}

        {/* Settings */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
