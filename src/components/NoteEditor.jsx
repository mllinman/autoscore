import React, { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { transcriptionManager } from './AudioUploader';
import { KEY_SIGNATURES, TIME_SIGNATURES } from '../utils/constants';
import { SlidersHorizontal, Disc3, Hash, Music2, Plus, Minus, ArrowUpDown } from 'lucide-react';

/**
 * NoteEditor - Note sensitivity slider and properties panel
 * Controls for note correction, measure editing, and beat tapping
 */
export default function NoteEditor() {
  const { state, dispatch } = useApp();

  const handleSensitivityChange = useCallback((value) => {
    dispatch({ type: 'SET_SENSITIVITY', payload: value });

    // Re-quantize notes with new sensitivity
    if (transcriptionManager && transcriptionManager.rawPitchData) {
      const newNotes = transcriptionManager.reQuantize(value, state.tempo);
      if (newNotes) {
        dispatch({ type: 'SET_NOTES', payload: newNotes });
      }
    }
  }, [dispatch, state.tempo]);

  return (
    <div className="properties-panel">
      {/* Panel Header */}
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
          <div style={{
            marginTop: 'var(--space-sm)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-tertiary)',
          }}>
            Detected: <strong style={{ color: 'var(--accent-tertiary)' }}>{state.notes.length}</strong> notes
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
            {/* Tempo */}
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

            {/* Key Signature */}
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

            {/* Time Signature */}
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
          </div>
        </div>
      )}

      {/* Beat Tapper */}
      {state.audioBuffer && (
        <div className="panel-section">
          <div className="panel-section-title">
            <Disc3 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Beat Tapper
          </div>
          <BeatTapper />
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
                <span className="property-value">{Math.round(state.selectedNotes[0].confidence * 100)}%</span>
              </div>
              <div className="property-row">
                <span className="property-label">Start</span>
                <span className="property-value">{state.selectedNotes[0].startTime.toFixed(3)}s</span>
              </div>
            </div>
          )}
          {state.selectedNotes.length > 1 && (
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              {state.selectedNotes.length} notes selected. Use Copy/Paste/Delete from the sidebar.
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
              // Double beats: halve each note duration
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
              // Halve beats: double each note duration
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

/**
 * BeatTapper - Tap tempo tool
 */
function BeatTapper() {
  const { dispatch } = useApp();
  const tapsRef = useRef([]);
  const [bpm, setBpm] = React.useState(null);

  const handleTap = () => {
    const now = performance.now();
    tapsRef.current.push(now);

    // Keep last 8 taps
    if (tapsRef.current.length > 8) {
      tapsRef.current = tapsRef.current.slice(-8);
    }

    if (tapsRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapsRef.current.length; i++) {
        intervals.push(tapsRef.current[i] - tapsRef.current[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const detectedBPM = Math.round(60000 / avg);
      setBpm(detectedBPM);

      // Auto-clear after 3 seconds of inactivity
      setTimeout(() => {
        if (performance.now() - tapsRef.current[tapsRef.current.length - 1] > 3000) {
          tapsRef.current = [];
        }
      }, 3500);
    }
  };

  const applyBPM = () => {
    if (bpm) {
      dispatch({ type: 'SET_TEMPO', payload: bpm });
    }
  };

  return (
    <div className="beat-tapper">
      <button className="tap-button" onClick={handleTap}>
        TAP
      </button>
      {bpm && (
        <>
          <div className="tap-bpm">{bpm}</div>
          <div className="tap-label">BPM Detected</div>
          <button className="btn btn-sm btn-primary" onClick={applyBPM}>
            Apply Tempo
          </button>
        </>
      )}
      {!bpm && <div className="tap-label">Tap to detect tempo</div>}
    </div>
  );
}
