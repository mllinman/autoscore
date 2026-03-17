import React from 'react';
import { useApp } from '../context/AppContext';
import { INSTRUMENTS } from '../utils/constants';
import {
  MousePointer2, Pencil, Eraser, Scissors, Copy, Clipboard, Trash2,
  Lock, Unlock, Music, LayoutList, GitBranch, ListMusic,
  Eye, EyeOff, ToggleLeft, ToggleRight
} from 'lucide-react';

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)', key: 'V' },
  { id: 'pencil', icon: Pencil, label: 'Draw (D)', key: 'D' },
  { id: 'eraser', icon: Eraser, label: 'Erase (E)', key: 'E' },
  { id: 'slice', icon: Scissors, label: 'Slice (S)', key: 'S' },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      const key = e.key.toLowerCase();

      // Tool shortcuts
      if (key === 'v') dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'select' });
      if (key === 'd') dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'pencil' });
      if (key === 'e') dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'eraser' });
      if (key === 's' && !e.ctrlKey) dispatch({ type: 'SET_ACTIVE_TOOL', payload: 'slice' });

      // Edit mode shortcuts
      if (key === '1') dispatch({ type: 'SET_EDIT_MODE', payload: 'note' });
      if (key === '2') dispatch({ type: 'SET_EDIT_MODE', payload: 'measure' });

      // Copy/Paste/Delete
      if (e.ctrlKey && key === 'c') dispatch({ type: 'COPY_NOTES' });
      if (e.ctrlKey && key === 'v') dispatch({ type: 'PASTE_NOTES', payload: { time: state.currentTime } });
      if (key === 'delete' || key === 'backspace') {
        const unlocked = state.selectedNotes.filter(n => !state.lockedNoteIds.has(n.id));
        if (unlocked.length > 0) {
          dispatch({ type: 'SET_SELECTED_NOTES', payload: unlocked });
          dispatch({ type: 'DELETE_SELECTED' });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, state.currentTime, state.selectedNotes, state.lockedNoteIds]);

  return (
    <div className="sidebar">
      {/* Edit Mode Toggle */}
      <div className="sidebar-section">
        <div className="sidebar-label">Edit Mode</div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className={`tool-btn ${state.editMode === 'note' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_EDIT_MODE', payload: 'note' })}
            title="Note editing (1)"
            style={{ flex: 1 }}
          >
            <Music size={14} />
            <span>Notes</span>
          </button>
          <button
            className={`tool-btn ${state.editMode === 'measure' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_EDIT_MODE', payload: 'measure' })}
            title="Measure editing (2)"
            style={{ flex: 1 }}
          >
            <LayoutList size={14} />
            <span>Measures</span>
          </button>
        </div>
      </div>

      {/* Tool Palette */}
      <div className="sidebar-section">
        <div className="sidebar-label">Tools</div>
        <div className="tool-palette">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn ${state.activeTool === tool.id ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.id })}
              title={tool.label}
            >
              <tool.icon size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Edit Actions */}
      <div className="sidebar-section">
        <div className="sidebar-label">Edit</div>
        <div className="tool-palette" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <button
            className="tool-btn"
            onClick={() => dispatch({ type: 'COPY_NOTES' })}
            title="Copy (Ctrl+C)"
            disabled={state.selectedNotes.length === 0}
          >
            <Copy size={14} />
          </button>
          <button
            className="tool-btn"
            onClick={() => dispatch({ type: 'PASTE_NOTES', payload: { time: state.currentTime } })}
            title="Paste (Ctrl+V)"
            disabled={state.clipboard.length === 0}
          >
            <Clipboard size={14} />
          </button>
          <button
            className="tool-btn"
            onClick={() => dispatch({ type: 'DELETE_SELECTED' })}
            title="Delete selected"
            disabled={state.selectedNotes.length === 0}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Lock / Triplet */}
      {state.selectedNotes.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Selection</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <button className="tool-btn" style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => dispatch({ type: 'TOGGLE_LOCK_SELECTED' })}>
              <Lock size={12} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Lock/Unlock</span>
            </button>
            {state.selectedNotes.length === 3 && (
              <button className="tool-btn" style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => dispatch({ type: 'TOGGLE_TRIPLET' })}>
                <GitBranch size={12} />
                <span style={{ fontSize: 'var(--text-xs)' }}>Triplet</span>
              </button>
            )}

            {/* Note Group assignment */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginTop: 2 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Group:</span>
              <select
                className="select"
                style={{ flex: 1, fontSize: 'var(--text-xs)' }}
                value={state.selectedNotes[0]?.group || 0}
                onChange={e => dispatch({ type: 'SET_NOTE_GROUP_FOR_SELECTED', payload: parseInt(e.target.value) })}
              >
                {state.noteGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Display options */}
      <div className="sidebar-section">
        <div className="sidebar-label">Display</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={state.showCandidateNotes}
              onChange={e => dispatch({ type: 'SET_SHOW_CANDIDATE_NOTES', payload: e.target.checked })}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            Show candidates
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={state.learnFromEdits}
              onChange={e => dispatch({ type: 'SET_LEARN_FROM_EDITS', payload: e.target.checked })}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            Learn from edits
          </label>
        </div>
      </div>

      {/* Instrument Browser */}
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="sidebar-label">Instruments</div>
        <div className="instrument-list">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.id}
              className={`instrument-item ${state.instrument.id === inst.id ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_INSTRUMENT', payload: inst })}
            >
              <span>{inst.name}</span>
              {inst.useTab && <span style={{ fontSize: 8, opacity: 0.5 }}>TAB</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
