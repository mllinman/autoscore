import React, { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { KEY_SIGNATURES, TIME_SIGNATURES } from '../utils/constants';
import InstrumentParts from './InstrumentParts';
import {
  SlidersHorizontal, Music2, Hash, ArrowUpDown, Plus, Minus,
  Lock, Unlock, Eye, EyeOff, GitBranch, Settings2
} from 'lucide-react';

// We'll try importing transcriptionManager from AudioUploader
// but wrap in a fallback for safety
let transcriptionManagerRef = null;
export function setTranscriptionManager(mgr) {
  transcriptionManagerRef = mgr;
}

export default function NoteEditor() {
  const { state, dispatch } = useApp();
  const [showParts, setShowParts] = React.useState(false);

  const handleSensitivityChange = useCallback((value) => {
    dispatch({ type: 'SET_SENSITIVITY', payload: value });
    if (transcriptionManagerRef && transcriptionManagerRef.rawPitchData) {
      const newNotes = transcriptionManagerRef.reQuantize(value, state.tempo);
      if (newNotes) {
        dispatch({ type: 'SET_NOTES', payload: newNotes });
      }
    }
  }, [dispatch, state.tempo]);

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <h3>Properties</h3>
      </div>

      {/* Note Detection Sensitivity */}
      {state.audioBuffer && (
        <div className="panel-section">
          <div className="panel-section-title">
            <SlidersHorizontal size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Note Detection
          </div>
          <div className="sensitivity-control">
            <div className="sensitivity-header">
              <label>Sensitivity</label>
              <span>{state.sensitivity}%</span>
            </div>
            <input
              type="range"
              className="slider"
              min="5"
              max="95"
              value={state.sensitivity}
              onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
            />
            <div className="note-count-indicator">
              <span>Fewer notes</span>
              <span>More notes</span>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-xs)', display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>
              Notes: <strong style={{ color: 'var(--accent-tertiary)' }}>{state.notes.length}</strong>
            </span>
            {state.candidateNotes.length > 0 && (
              <span style={{ color: 'var(--text-tertiary)' }}>
                Candidates: <strong style={{ color: 'var(--text-tertiary)' }}>{state.candidateNotes.length}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Score Settings */}
      {state.audioBuffer && (
        <div className="panel-section">
          <div className="panel-section-title">
            <Music2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Score Settings
          </div>

          <div className="measure-editor-grid">
            <div className="measure-field">
              <label>Tempo (BPM)</label>
              <input
                type="number"
                className="input"
                style={{ width: '100%' }}
                min="20"
                max="300"
                value={state.tempo}
                onChange={(e) => dispatch({ type: 'SET_TEMPO', payload: parseInt(e.target.value) || 120 })}
              />
            </div>
            <div className="measure-field">
              <label>Key</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={state.keySignature}
                onChange={(e) => dispatch({ type: 'SET_KEY_SIGNATURE', payload: e.target.value })}
              >
                {KEY_SIGNATURES.map(ks => (
                  <option key={ks.key} value={ks.key}>{ks.name}</option>
                ))}
              </select>
            </div>
            <div className="measure-field">
              <label>Time Sig</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={`${state.timeSignature.num}/${state.timeSignature.den}`}
                onChange={(e) => {
                  const [num, den] = e.target.value.split('/').map(Number);
                  dispatch({ type: 'SET_TIME_SIGNATURE', payload: { num, den } });
                }}
              >
                {TIME_SIGNATURES.map(ts => (
                  <option key={ts.label} value={ts.label}>{ts.label}</option>
                ))}
              </select>
            </div>
            <div className="measure-field">
              <label>Smallest Note</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={state.smallestNote}
                onChange={(e) => dispatch({ type: 'SET_SMALLEST_NOTE', payload: e.target.value })}
              >
                <option value="whole">Whole</option>
                <option value="half">Half</option>
                <option value="quarter">Quarter</option>
                <option value="eighth">Eighth</option>
                <option value="sixteenth">16th</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Instrument Parts */}
      {state.audioBuffer && (
        <div className="panel-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowParts(!showParts)}>
            <div className="panel-section-title" style={{ marginBottom: 0 }}>
              <Settings2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Instrument Parts
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {showParts ? '▲' : '▼'} {state.instrumentParts.length} parts
            </span>
          </div>
          {showParts && (
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <InstrumentParts />
            </div>
          )}
        </div>
      )}

      {/* Selected Note Info */}
      {state.selectedNotes.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-title">
            <Hash size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Selected ({state.selectedNotes.length})
          </div>
          {state.selectedNotes.length === 1 && (
            <div>
              <div className="property-row">
                <span className="property-label">Note</span>
                <span className="property-value">{state.selectedNotes[0].noteName}</span>
              </div>
              <div className="property-row">
                <span className="property-label">MIDI</span>
                <span className="property-value">{state.selectedNotes[0].midi}</span>
              </div>
              <div className="property-row">
                <span className="property-label">Duration</span>
                <span className="property-value">{state.selectedNotes[0].durationName}</span>
              </div>
              <div className="property-row">
                <span className="property-label">Confidence</span>
                <span className="property-value">{Math.round((state.selectedNotes[0].confidence || 0) * 100)}%</span>
              </div>
              <div className="property-row">
                <span className="property-label">Group</span>
                <span className="property-value">{state.noteGroups.find(g => g.id === (state.selectedNotes[0].group || 0))?.name || 'Default'}</span>
              </div>
              <div className="property-row">
                <span className="property-label">Locked</span>
                <span className="property-value">{state.lockedNoteIds.has(state.selectedNotes[0].id) ? 'Yes' : 'No'}</span>
              </div>
              {state.selectedNotes[0].isTriplet && (
                <div className="property-row">
                  <span className="property-label">Triplet</span>
                  <span className="property-value" style={{ color: 'var(--color-warning)' }}>Yes</span>
                </div>
              )}
            </div>
          )}
          {state.selectedNotes.length > 1 && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {state.selectedNotes.length} notes selected
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      {state.notes.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-title">
            <ArrowUpDown size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            <button className="btn btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => {
              const doubled = state.notes.map(n => ({
                ...n,
                startTime: n.startTime / 2,
                endTime: n.endTime / 2,
                duration: n.duration / 2,
              }));
              dispatch({ type: 'SET_NOTES', payload: doubled });
            }}>
              <Plus size={12} /> Double Beats
            </button>
            <button className="btn btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => {
              const halved = state.notes.map(n => ({
                ...n,
                startTime: n.startTime * 2,
                endTime: n.endTime * 2,
                duration: n.duration * 2,
              }));
              dispatch({ type: 'SET_NOTES', payload: halved });
            }}>
              <Minus size={12} /> Halve Beats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
