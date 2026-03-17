import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KEY_SIGNATURES, TIME_SIGNATURES } from '../utils/constants';
import { formatTime } from '../utils/musicTheory';
import {
  Plus, Minus, ArrowLeft, ArrowRight, ChevronsRight, ChevronsLeft,
  Gauge, Play, Check, X, SquareStack
} from 'lucide-react';

/**
 * MeasureEditingMode - Dedicated measure editing panel
 * Beat positioning, time/key signature changes, insert/remove measures, double/halve
 */
export default function MeasureEditingMode() {
  const { state, dispatch } = useApp();
  const [selectedMeasure, setSelectedMeasure] = useState(0);
  const [isTapping, setIsTapping] = useState(false);
  const tapsRef = React.useRef([]);
  const [tapBPM, setTapBPM] = useState(null);

  const measure = state.measures[selectedMeasure];
  const totalMeasures = state.measures.length;

  const handleTap = () => {
    const now = performance.now();
    tapsRef.current.push(now);
    if (tapsRef.current.length > 12) tapsRef.current = tapsRef.current.slice(-12);

    if (tapsRef.current.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapsRef.current.length; i++) {
        intervals.push(tapsRef.current[i] - tapsRef.current[i - 1]);
      }
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setTapBPM(Math.round(60000 / avg));
    }
  };

  const startTapping = () => {
    tapsRef.current = [];
    setTapBPM(null);
    setIsTapping(true);
  };

  const finishTapping = () => {
    setIsTapping(false);
    if (tapBPM) {
      dispatch({ type: 'SET_TEMPO', payload: tapBPM });
    }
  };

  const cancelTapping = () => {
    setIsTapping(false);
    setTapBPM(null);
    tapsRef.current = [];
  };

  const setConstantTempo = () => {
    if (!measure) return;
    const newMeasures = state.measures.map((m, i) => {
      if (i >= selectedMeasure) {
        const beatDuration = 60 / state.tempo;
        const measureDuration = (m.timeSignature?.num || state.timeSignature.num) * beatDuration;
        const offset = (i - selectedMeasure) * measureDuration;
        return {
          ...m,
          tempo: state.tempo,
          startTime: measure.startTime + offset,
          endTime: measure.startTime + offset + measureDuration,
        };
      }
      return m;
    });
    dispatch({ type: 'SET_MEASURES', payload: newMeasures });
  };

  return (
    <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {/* Measure navigator */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--space-lg)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'var(--space-md)',
        }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Measure
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--accent-tertiary)' }}>
            {selectedMeasure + 1} / {totalMeasures || '—'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', justifyContent: 'center' }}>
          <button className="btn btn-sm" onClick={() => setSelectedMeasure(0)} disabled={!totalMeasures}>
            <ChevronsLeft size={14} />
          </button>
          <button className="btn btn-sm" onClick={() => setSelectedMeasure(Math.max(0, selectedMeasure - 1))} disabled={selectedMeasure === 0}>
            <ArrowLeft size={14} />
          </button>

          <input
            type="number"
            className="input"
            style={{ width: 60, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
            min={1}
            max={totalMeasures}
            value={selectedMeasure + 1}
            onChange={e => setSelectedMeasure(Math.max(0, Math.min(totalMeasures - 1, parseInt(e.target.value) - 1 || 0)))}
          />

          <button className="btn btn-sm" onClick={() => setSelectedMeasure(Math.min(totalMeasures - 1, selectedMeasure + 1))} disabled={selectedMeasure >= totalMeasures - 1}>
            <ArrowRight size={14} />
          </button>
          <button className="btn btn-sm" onClick={() => setSelectedMeasure(totalMeasures - 1)} disabled={!totalMeasures}>
            <ChevronsRight size={14} />
          </button>
        </div>

        {measure && (
          <div style={{ marginTop: 'var(--space-md)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            {formatTime(measure.startTime)} — {formatTime(measure.endTime)}
          </div>
        )}
      </div>

      {/* Per-measure settings */}
      {totalMeasures > 0 && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          padding: 'var(--space-lg)',
        }}>
          <div className="panel-section-title">Measure Settings</div>
          <div className="measure-editor-grid">
            <div className="measure-field">
              <label>Time Sig Top</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={measure?.timeSignature?.num || state.timeSignature.num}
                onChange={e => dispatch({
                  type: 'UPDATE_MEASURE',
                  payload: {
                    index: selectedMeasure,
                    changes: { timeSignature: { ...measure.timeSignature, num: parseInt(e.target.value) } },
                  },
                })}
              >
                {[2, 3, 4, 5, 6, 7, 9, 12].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="measure-field">
              <label>Time Sig Bottom</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={measure?.timeSignature?.den || state.timeSignature.den}
                onChange={e => dispatch({
                  type: 'UPDATE_MEASURE',
                  payload: {
                    index: selectedMeasure,
                    changes: { timeSignature: { ...measure.timeSignature, den: parseInt(e.target.value) } },
                  },
                })}
              >
                {[2, 4, 8, 16].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="measure-field">
              <label>Key</label>
              <select
                className="select"
                style={{ width: '100%' }}
                value={state.keySignature}
                onChange={e => dispatch({ type: 'SET_KEY_SIGNATURE', payload: e.target.value })}
              >
                {KEY_SIGNATURES.map(ks => <option key={ks.key} value={ks.key}>{ks.name}</option>)}
              </select>
            </div>
            <div className="measure-field">
              <label>Tempo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  className="input"
                  style={{ width: '100%' }}
                  min={20}
                  max={300}
                  value={measure?.tempo || state.tempo}
                  onChange={e => dispatch({
                    type: 'UPDATE_MEASURE',
                    payload: { index: selectedMeasure, changes: { tempo: parseInt(e.target.value) || 120 } },
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Measure Actions */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--space-lg)',
      }}>
        <div className="panel-section-title">Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-xs)' }}>
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'INSERT_MEASURE', payload: { afterIndex: selectedMeasure } })} title="Insert measure after">
            <Plus size={12} /> Insert
          </button>
          <button className="btn btn-sm" onClick={() => {
            dispatch({ type: 'REMOVE_MEASURE', payload: selectedMeasure });
            setSelectedMeasure(Math.max(0, selectedMeasure - 1));
          }} disabled={totalMeasures <= 1} title="Remove current measure">
            <Minus size={12} /> Remove
          </button>
          <button className="btn btn-sm" onClick={setConstantTempo} title="Set constant tempo from here">
            <Gauge size={12} /> Const.
          </button>
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'DOUBLE_MEASURES', payload: selectedMeasure })} title="Double measures from here">
            ×2
          </button>
          <button className="btn btn-sm" onClick={() => dispatch({ type: 'HALVE_MEASURES', payload: selectedMeasure })} title="Halve measures from here">
            ×½
          </button>
          <button className="btn btn-sm" title="Shift beats right" onClick={() => {
            // Shift all beats right by one grid unit
            const beatDuration = 60 / state.tempo;
            const shifted = state.beats.map(b => ({ ...b, time: b.time + beatDuration / 4 }));
            // We'd need a SET_BEATS action, for now just update measures
          }}>
            <ArrowRight size={12} /> Shift
          </button>
        </div>
      </div>

      {/* Beat Tapping */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--space-lg)',
        textAlign: 'center',
      }}>
        <div className="panel-section-title">Tap Downbeats</div>

        {!isTapping ? (
          <button className="btn btn-primary" onClick={startTapping}>
            <Play size={14} /> Start Tapping
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}>
            <button className="tap-button" onClick={handleTap} style={{ width: 64, height: 64, fontSize: 'var(--text-sm)' }}>
              TAP
            </button>
            {tapBPM && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xl)', color: 'var(--accent-tertiary)' }}>
                {tapBPM} BPM
              </div>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-sm btn-primary" onClick={finishTapping}>
                <Check size={12} /> Apply
              </button>
              <button className="btn btn-sm" onClick={cancelTapping}>
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
