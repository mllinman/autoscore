import React from 'react';
import { useApp } from '../../context/AppContext';

const DRUM_MAP = [
  { pitch: 36, label: 'Kick', key: '1' },
  { pitch: 38, label: 'Snare', key: '2' },
  { pitch: 42, label: 'Close HH', key: '3' },
  { pitch: 46, label: 'Open HH', key: '4' },
  { pitch: 41, label: 'Floor Tom', key: 'q' },
  { pitch: 43, label: 'Low Tom', key: 'w' },
  { pitch: 47, label: 'Mid Tom', key: 'e' },
  { pitch: 48, label: 'Hi Tom', key: 'r' },
  { pitch: 49, label: 'Crash 1', key: 'a' },
  { pitch: 57, label: 'Crash 2', key: 's' },
  { pitch: 51, label: 'Ride 1', key: 'd' },
  { pitch: 52, label: 'China', key: 'f' },
  { pitch: 37, label: 'Rimshot', key: 'z' },
  { pitch: 39, label: 'Clap', key: 'x' },
  { pitch: 54, label: 'Tamb', key: 'c' },
  { pitch: 56, label: 'Cowbell', key: 'v' },
];

export default function DrumPad() {
  const { state, dispatch } = useApp();
  const [activePads, setActivePads] = React.useState(new Set());

  const handlePadDown = (pitch) => {
    setActivePads(prev => new Set(prev).add(pitch));
    
    const startTime = state.currentTime;
    const duration = 0.1; // Short trigger
    
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        id: `drum-${Date.now()}-${pitch}`,
        pitch,
        startTime,
        endTime: startTime + duration,
        velocity: 100,
        isDrum: true
      }
    });

    if (state.isRecording) {
      dispatch({ type: 'APPEND_MIDI_NOTE', payload: { pitch, velocity: 100, type: 'on' } });
    }
  };

  const handlePadUp = (pitch) => {
    setActivePads(prev => {
      const next = new Set(prev);
      next.delete(pitch);
      return next;
    });

    if (state.isRecording) {
      dispatch({ type: 'APPEND_MIDI_NOTE', payload: { pitch, velocity: 0, type: 'off' } });
    }
  };

  return (
    <div className="drum-pad-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 'var(--space-md)',
      padding: 'var(--space-md)',
      background: '#1a1a1f',
      borderRadius: 'var(--radius-md)'
    }}>
      {DRUM_MAP.map((pad) => (
        <div
          key={pad.pitch}
          onMouseDown={() => handlePadDown(pad.pitch)}
          onMouseUp={() => handlePadUp(pad.pitch)}
          onMouseLeave={() => activePads.has(pad.pitch) && handlePadUp(pad.pitch)}
          style={{
            height: '80px',
            background: activePads.has(pad.pitch) ? 'var(--accent-primary)' : '#2a2a2f',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.1s',
            boxShadow: activePads.has(pad.pitch) ? '0 0 15px var(--accent-glow)' : 'inset 0 0 10px rgba(0,0,0,0.5)',
            border: '2px solid #333'
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-primary)', fontWeight: 'bold' }}>{pad.label}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{pad.key.toUpperCase()}</span>
        </div>
      ))}
    </div>
  );
}
