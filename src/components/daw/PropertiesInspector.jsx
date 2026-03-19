import React from 'react';
import { useApp } from '../../context/AppContext';
import { INSTRUMENTS } from '../../utils/constants';
import {
  Music, Sliders, Move, MousePointer2, Pencil, Eraser, Scissors,
  Volume2, Grid3X3, Gauge, Hash, Clock
} from 'lucide-react';

export default function PropertiesInspector() {
  const { state, dispatch } = useApp();

  const renderTrackProperties = () => (
    <div className="inspector-section">
      <div className="inspector-section-header">
        <Music size={12} />
        <span>Track Properties</span>
      </div>
      <div className="inspector-fields">
        <div className="inspector-row">
          <span className="inspector-label">Instrument</span>
          <select
            className="inspector-select"
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
        <div className="inspector-row">
          <span className="inspector-label">Tempo</span>
          <div className="inspector-value-row">
            <Gauge size={11} />
            <span className="inspector-value mono">{state.tempo} BPM</span>
          </div>
        </div>
        <div className="inspector-row">
          <span className="inspector-label">Time Sig</span>
          <span className="inspector-value mono">
            {state.timeSignature?.num || 4}/{state.timeSignature?.den || 4}
          </span>
        </div>
        <div className="inspector-row">
          <span className="inspector-label">Key</span>
          <span className="inspector-value mono">{state.keySignature || 'C'}</span>
        </div>
        {state.fileName && (
          <div className="inspector-row">
            <span className="inspector-label">File</span>
            <span className="inspector-value truncate">{state.fileName}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderToolProperties = () => {
    const toolInfo = {
      select: { icon: MousePointer2, label: 'Select Tool' },
      pencil: { icon: Pencil, label: 'Draw Tool' },
      eraser: { icon: Eraser, label: 'Erase Tool' },
      slice: { icon: Scissors, label: 'Slice Tool' },
    };
    const current = toolInfo[state.activeTool] || toolInfo.select;
    const ToolIcon = current.icon;

    return (
      <div className="inspector-section">
        <div className="inspector-section-header">
          <Sliders size={12} />
          <span>Tool Settings</span>
        </div>
        <div className="inspector-fields">
          <div className="inspector-row">
            <span className="inspector-label">Active</span>
            <div className="inspector-value-row">
              <ToolIcon size={12} />
              <span className="inspector-value">{current.label}</span>
            </div>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Edit Mode</span>
            <span className="inspector-value">{state.editMode === 'note' ? 'Note' : 'Measure'}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Sensitivity</span>
            <div className="inspector-inline-control">
              <input
                type="range"
                className="inspector-slider"
                min="0"
                max="100"
                value={state.sensitivity}
                onChange={(e) => dispatch({ type: 'SET_SENSITIVITY', payload: parseInt(e.target.value) })}
              />
              <span className="inspector-value mono">{state.sensitivity}%</span>
            </div>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Snap Grid</span>
            <select
              className="inspector-select"
              value={state.smallestNote}
              onChange={(e) => dispatch({ type: 'SET_SMALLEST_NOTE', payload: e.target.value })}
            >
              <option value="whole">Whole</option>
              <option value="half">Half</option>
              <option value="quarter">Quarter</option>
              <option value="eighth">Eighth</option>
              <option value="sixteenth">Sixteenth</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderNoteProperties = () => {
    if (state.selectedNotes.length === 0) return null;
    const note = state.selectedNotes[0];

    return (
      <div className="inspector-section">
        <div className="inspector-section-header">
          <Hash size={12} />
          <span>Note Properties</span>
          {state.selectedNotes.length > 1 && (
            <span className="inspector-badge">{state.selectedNotes.length} selected</span>
          )}
        </div>
        <div className="inspector-fields">
          <div className="inspector-row">
            <span className="inspector-label">Pitch</span>
            <span className="inspector-value mono">{note.name || `MIDI ${note.midi}`}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">MIDI</span>
            <span className="inspector-value mono">{note.midi}</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Start</span>
            <span className="inspector-value mono">{note.startTime?.toFixed(3)}s</span>
          </div>
          <div className="inspector-row">
            <span className="inspector-label">Duration</span>
            <span className="inspector-value mono">{(note.endTime - note.startTime)?.toFixed(3)}s</span>
          </div>
          {note.frequency && (
            <div className="inspector-row">
              <span className="inspector-label">Freq</span>
              <span className="inspector-value mono">{note.frequency.toFixed(1)} Hz</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="properties-inspector">
      {renderTrackProperties()}
      {renderToolProperties()}
      {renderNoteProperties()}
    </div>
  );
}
