import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLayout } from '../context/LayoutContext';
import { INSTRUMENTS } from '../utils/constants';
import {
  Music, FileAudio, Download, Settings, ChevronDown, ChevronRight,
  FolderOpen, Save, FileText, X, Plus, History, LayoutList, RefreshCw, Search
} from 'lucide-react';

export default function Header() {
  const { state, dispatch } = useApp();
  const { layout, layoutDispatch } = useLayout();
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const fileMenuRef = useRef(null);
  const viewMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setShowFileMenu(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target)) {
        setShowViewMenu(false);
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
            onClick={() => { setShowFileMenu(!showFileMenu); setShowViewMenu(false); }}
            style={{ fontSize: 'var(--text-sm)' }}
          >
            File <ChevronDown size={12} />
          </button>

          {showFileMenu && (
            <div className="dropdown-menu pro-menu">
              <button className="dropdown-item" onClick={() => { dispatch({ type: 'RESET_PROJECT' }); setShowFileMenu(false); }}>
                <Plus size={14} /> New Project
              </button>
              <button className="dropdown-item" onClick={() => { dispatch({ type: 'TOGGLE_OPEN_DIALOG' }); setShowFileMenu(false); }}>
                <FolderOpen size={14} /> Open...
              </button>
              <div className="dropdown-submenu">
                <button className="dropdown-item">
                  <History size={14} /> Open Recent <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </button>
                <div className="submenu-content">
                  <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>Demo_Song_1.wav</button>
                  <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>Guitar_Riff_B.mp3</button>
                  <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>Vocal_Take_01.wav</button>
                </div>
              </div>
              <div className="divider" />
              <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>
                <Save size={14} /> Save Project
              </button>
              <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>
                <Save size={14} /> Save Project As...
              </button>
              <div className="dropdown-submenu">
                <button className="dropdown-item">
                  <Download size={14} /> Export <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </button>
                <div className="submenu-content">
                  <button className="dropdown-item" onClick={() => { dispatch({ type: 'TOGGLE_EXPORT_DIALOG' }); setShowFileMenu(false); }}>Wave Audio (.wav)</button>
                  <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>MIDI File (.mid)</button>
                  <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>PDF Notation (.pdf)</button>
                  <button className="dropdown-item" onClick={() => setShowFileMenu(false)}>MusicXML (.xml)</button>
                </div>
              </div>
              <div className="divider" />
              <button className="dropdown-item" onClick={() => { dispatch({ type: 'TOGGLE_SETTINGS' }); setShowFileMenu(false); }}>
                <Settings size={14} /> Preferences
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="header-menu" ref={viewMenuRef}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setShowViewMenu(!showViewMenu); setShowFileMenu(false); }}
            style={{ fontSize: 'var(--text-sm)', marginLeft: '4px' }}
          >
            View <ChevronDown size={12} />
          </button>

          {showViewMenu && (
            <div className="dropdown-menu pro-menu">
              <div className="dropdown-submenu">
                <button className="dropdown-item">
                  <LayoutList size={14} /> Panels <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </button>
                <div className="submenu-content">
                  {[
                    { id: 'channels', label: 'Channels' },
                    { id: 'properties', label: 'Properties' },
                    { id: 'tools', label: 'Tools' },
                    { id: 'notations', label: 'Notation & Views' },
                    { id: 'plugins', label: 'Plugins' },
                    { id: 'timeline', label: 'Timeline' },
                  ].map(item => (
                    <button
                      key={item.id}
                      className="dropdown-item"
                      onClick={() => {
                        layoutDispatch({
                          type: 'SET_PANEL_VISIBILITY',
                          payload: { panel: item.id, visible: !layout.panelVisibility?.[item.id] }
                        });
                      }}
                    >
                      <div style={{ width: 14, display: 'inline-block' }}>
                        {layout.panelVisibility?.[item.id] !== false ? '✓ ' : ''}
                      </div>
                      {item.label}
                    </button>
                  ))}
                  <div className="divider" />
                  <button className="dropdown-item" onClick={() => {
                    Object.keys(layout.panelVisibility).forEach(id => {
                      layoutDispatch({ type: 'SET_PANEL_VISIBILITY', payload: { panel: id, visible: true } });
                    });
                  }}>Show All Panels</button>
                  <button className="dropdown-item" onClick={() => {
                    Object.keys(layout.panelVisibility).forEach(id => {
                      if (id !== 'timeline') layoutDispatch({ type: 'SET_PANEL_VISIBILITY', payload: { panel: id, visible: false } });
                    });
                  }}>Hide All Panels</button>
                </div>
              </div>

              <div className="dropdown-submenu">
                <button className="dropdown-item">
                  <RefreshCw size={14} /> Layout Presets <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </button>
                <div className="submenu-content">
                  <button className="dropdown-item" onClick={() => { layoutDispatch({ type: 'APPLY_PRESET', payload: 'cakewalk' }); setShowViewMenu(false); }}>Cakewalk (Default)</button>
                  <button className="dropdown-item" onClick={() => { layoutDispatch({ type: 'APPLY_PRESET', payload: 'producer' }); setShowViewMenu(false); }}>Producer Full</button>
                  <button className="dropdown-item" onClick={() => { layoutDispatch({ type: 'APPLY_PRESET', payload: 'composer' }); setShowViewMenu(false); }}>Composer/Notation</button>
                  <button className="dropdown-item" onClick={() => { layoutDispatch({ type: 'APPLY_PRESET', payload: 'minimal' }); setShowViewMenu(false); }}>Minimalist</button>
                </div>
              </div>

              <div className="divider" />
              
              <div className="dropdown-submenu">
                <button className="dropdown-item">
                  <Search size={14} /> Zoom <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                </button>
                <div className="submenu-content">
                  <button className="dropdown-item">Zoom In (Ctrl +)</button>
                  <button className="dropdown-item">Zoom Out (Ctrl -)</button>
                  <button className="dropdown-item">Fit to Screen (F)</button>
                </div>
              </div>

              <div className="divider" />

              <button className="dropdown-item" onClick={() => setShowViewMenu(false)}>
                <FolderOpen size={14} /> View Saves (Transcription History)
              </button>
              
              <button
                className="dropdown-item"
                onClick={() => {
                  layoutDispatch({ type: 'RESET_LAYOUT' });
                  setShowViewMenu(false);
                }}
              >
                Reset To Default
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
