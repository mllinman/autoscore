import React from 'react';
import { useApp } from '../context/AppContext';
import { INSTRUMENTS } from '../utils/constants';
import { Plus, Trash2, ChevronUp, ChevronDown, Settings2, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';

/**
 * InstrumentParts - Manage instrument parts, note groups, and sheet music settings
 */
export default function InstrumentParts() {
  const { state, dispatch } = useApp();

  const addPart = () => {
    const newId = Math.max(0, ...state.instrumentParts.map(p => p.id)) + 1;
    dispatch({
      type: 'ADD_INSTRUMENT_PART',
      payload: {
        id: newId,
        instrument: INSTRUMENTS[0],
        name: `Part ${newId + 1}`,
        staffMode: 'treble',
        writtenTranspose: 0,
        noteRangeLow: 21,
        noteRangeHigh: 108,
        midiProgram: 0,
      },
    });
  };

  const movePart = (index, direction) => {
    const newParts = [...state.instrumentParts];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newParts.length) return;
    [newParts[index], newParts[newIndex]] = [newParts[newIndex], newParts[index]];
    dispatch({ type: 'REORDER_PARTS', payload: newParts });
  };

  const addNoteGroup = () => {
    const newId = Math.max(0, ...state.noteGroups.map(g => g.id)) + 1;
    const colors = ['#7c5cfc', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa',
                    '#fb923c', '#e879f9', '#22d3ee', '#84cc16'];
    dispatch({
      type: 'ADD_NOTE_GROUP',
      payload: {
        id: newId,
        name: `Group ${newId + 1}`,
        partId: state.instrumentParts[0]?.id || 0,
        visible: true,
        muted: false,
        color: colors[newId % colors.length],
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      {/* Parts */}
      <div className="panel-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <div className="panel-section-title" style={{ marginBottom: 0 }}>Instrument Parts</div>
          <button className="btn btn-ghost btn-sm" onClick={addPart} title="Add part">
            <Plus size={12} /> Add
          </button>
        </div>

        {state.instrumentParts.map((part, index) => (
          <div key={part.id} style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            padding: 'var(--space-sm)',
            marginBottom: 'var(--space-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-xs)' }}>
              {/* Reorder arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <button className="btn btn-ghost" style={{ padding: 1, height: 14, width: 20 }}
                  onClick={() => movePart(index, -1)} disabled={index === 0}>
                  <ChevronUp size={10} />
                </button>
                <button className="btn btn-ghost" style={{ padding: 1, height: 14, width: 20 }}
                  onClick={() => movePart(index, 1)} disabled={index === state.instrumentParts.length - 1}>
                  <ChevronDown size={10} />
                </button>
              </div>

              {/* Instrument selector */}
              <select
                className="select"
                style={{ flex: 1, fontSize: 'var(--text-xs)' }}
                value={part.instrument.id}
                onChange={e => {
                  const inst = INSTRUMENTS.find(i => i.id === e.target.value);
                  if (inst) {
                    dispatch({ type: 'UPDATE_INSTRUMENT_PART', payload: {
                      id: part.id,
                      changes: {
                        instrument: inst,
                        name: inst.name,
                        noteRangeLow: inst.range.low,
                        noteRangeHigh: inst.range.high,
                        staffMode: inst.useTab ? 'tablature' : (inst.clef === 'bass' ? 'bass' : 'treble'),
                      },
                    }});
                  }
                }}
              >
                {INSTRUMENTS.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                <option value="custom">Custom</option>
              </select>

              {/* Remove */}
              {state.instrumentParts.length > 1 && (
                <button className="btn btn-ghost btn-sm" style={{ padding: 2 }}
                  onClick={() => dispatch({ type: 'REMOVE_INSTRUMENT_PART', payload: part.id })}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Staff mode */}
            <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
              {['treble', 'bass', 'both', 'tablature'].map(mode => (
                <button
                  key={mode}
                  className={`btn btn-sm ${part.staffMode === mode ? 'btn-primary' : ''}`}
                  style={{ fontSize: 9, padding: '2px 6px', height: 22 }}
                  onClick={() => dispatch({ type: 'UPDATE_INSTRUMENT_PART', payload: { id: part.id, changes: { staffMode: mode } } })}
                >
                  {mode === 'both' ? 'Treble+Bass' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Note Groups */}
      <div className="panel-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
          <div className="panel-section-title" style={{ marginBottom: 0 }}>Note Groups</div>
          <button className="btn btn-ghost btn-sm" onClick={addNoteGroup} title="Add group">
            <Plus size={12} /> Add
          </button>
        </div>

        {state.noteGroups.map(group => (
          <div key={group.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-xs) var(--space-sm)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 2,
            fontSize: 'var(--text-xs)',
          }}>
            {/* Color dot */}
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: group.color, flexShrink: 0,
            }} />

            <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{group.name}</span>

            {/* Visibility */}
            <button className="btn btn-ghost" style={{ padding: 2, height: 18, width: 18 }}
              onClick={() => dispatch({ type: 'TOGGLE_NOTE_GROUP_VISIBLE', payload: group.id })}
              title={group.visible ? 'Hide' : 'Show'}>
              {group.visible ? <Eye size={10} /> : <EyeOff size={10} />}
            </button>

            {/* Mute */}
            <button className="btn btn-ghost" style={{ padding: 2, height: 18, width: 18 }}
              onClick={() => dispatch({ type: 'TOGGLE_NOTE_GROUP_MUTED', payload: group.id })}
              title={group.muted ? 'Unmute' : 'Mute'}>
              {group.muted ? <VolumeX size={10} /> : <Volume2 size={10} />}
            </button>

            {/* Part assignment */}
            <select
              className="select"
              style={{ fontSize: 9, padding: '1px 4px', width: 70 }}
              value={group.partId}
              onChange={e => dispatch({
                type: 'UPDATE_NOTE_GROUP',
                payload: { id: group.id, changes: { partId: parseInt(e.target.value) } },
              })}
            >
              {state.instrumentParts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {state.noteGroups.length > 1 && (
              <button className="btn btn-ghost" style={{ padding: 2, height: 18, width: 18 }}
                onClick={() => dispatch({ type: 'REMOVE_NOTE_GROUP', payload: group.id })}>
                <Trash2 size={10} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Sheet Music Options */}
      <div className="panel-section">
        <div className="panel-section-title">Sheet Music Options</div>

        <div className="measure-field" style={{ marginBottom: 'var(--space-sm)' }}>
          <label>Title</label>
          <input
            className="input"
            style={{ width: '100%' }}
            placeholder="Score title..."
            value={state.scoreTitle}
            onChange={e => dispatch({ type: 'SET_SCORE_TITLE', payload: e.target.value })}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <div className="measure-field" style={{ flex: 1 }}>
            <label>Smallest Note</label>
            <select
              className="select"
              style={{ width: '100%' }}
              value={state.smallestNote}
              onChange={e => dispatch({ type: 'SET_SMALLEST_NOTE', payload: e.target.value })}
            >
              <option value="whole">Whole</option>
              <option value="half">Half</option>
              <option value="quarter">Quarter</option>
              <option value="eighth">Eighth</option>
              <option value="sixteenth">16th</option>
            </select>
          </div>
          <div className="measure-field" style={{ flex: 1 }}>
            <label>Transpose</label>
            <input
              type="number"
              className="input"
              style={{ width: '100%' }}
              min="-12"
              max="12"
              value={state.scoreTranspose}
              onChange={e => dispatch({ type: 'SET_SCORE_TRANSPOSE', payload: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="measure-field" style={{ marginTop: 'var(--space-sm)' }}>
          <label>Simplify Score</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <input
              type="range"
              className="slider"
              min="0"
              max="100"
              value={state.simplifyScore}
              onChange={e => dispatch({ type: 'SET_SIMPLIFY_SCORE', payload: parseInt(e.target.value) })}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--accent-tertiary)', minWidth: 30 }}>
              {state.simplifyScore}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
