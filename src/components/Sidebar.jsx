import React from 'react';
import { useApp } from '../context/AppContext';
import { INSTRUMENTS } from '../utils/constants';
import {
  MousePointer2, Pencil, Eraser, Scissors,
  Music, Guitar, Mic, Piano, Drum,
  Copy, Clipboard, Trash2, ZoomIn, ZoomOut
} from 'lucide-react';

const tools = [
  { id: 'select', name: 'Select', icon: MousePointer2 },
  { id: 'pencil', name: 'Draw', icon: Pencil },
  { id: 'eraser', name: 'Erase', icon: Eraser },
  { id: 'slice', name: 'Slice', icon: Scissors },
];

const instrumentIcons = {
  Keyboard: Piano,
  String: Guitar,
  Vocal: Mic,
  Woodwind: Music,
  Brass: Music,
  Percussion: Drum,
};

export default function Sidebar() {
  const { state, dispatch } = useApp();

  const handleCopy = () => {
    if (state.selectedNotes.length > 0) {
      dispatch({ type: 'COPY_NOTES' });
    }
  };

  const handlePaste = () => {
    dispatch({ type: 'PASTE_NOTES', payload: { time: state.currentTime } });
  };

  const handleDelete = () => {
    dispatch({ type: 'DELETE_SELECTED' });
  };

  // Group instruments by category
  const categories = {};
  INSTRUMENTS.forEach(inst => {
    if (!categories[inst.category]) categories[inst.category] = [];
    categories[inst.category].push(inst);
  });

  return (
    <div className="sidebar">
      {/* Tools */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Tools</div>
        <div className="tool-grid">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn ${state.activeTool === tool.id ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', payload: tool.id })}
              title={tool.name}
            >
              <tool.icon size={18} />
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Actions */}
      {state.notes.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Edit</div>
          <div className="tool-grid">
            <button className="tool-btn" onClick={handleCopy} title="Copy selected notes">
              <Copy size={18} />
              Copy
            </button>
            <button className="tool-btn" onClick={handlePaste} title="Paste notes">
              <Clipboard size={18} />
              Paste
            </button>
            <button className="tool-btn" onClick={handleDelete} title="Delete selected">
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Instruments */}
      <div className="sidebar-section" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-section-title">Instruments</div>
        <div className="instrument-list" style={{ flex: 1 }}>
          {Object.entries(categories).map(([category, instruments]) => (
            <React.Fragment key={category}>
              <div style={{
                fontSize: '9px',
                fontWeight: 700,
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '8px 12px 4px',
                opacity: 0.6,
              }}>
                {category}
              </div>
              {instruments.map(inst => {
                const IconComp = instrumentIcons[inst.category] || Music;
                return (
                  <button
                    key={inst.id}
                    className={`instrument-item ${state.instrument.id === inst.id ? 'selected' : ''}`}
                    onClick={() => dispatch({ type: 'SET_INSTRUMENT', payload: inst })}
                  >
                    <IconComp size={14} />
                    {inst.name}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
