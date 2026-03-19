import React from 'react';
import { useApp } from '../../context/AppContext';

const STRINGS = ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'];
const STRING_NOTES = [64, 59, 55, 50, 45, 40]; // MIDI numbers

export default function VirtualFretboard() {
  const { state, dispatch } = useApp();
  const [hoveredFret, setHoveredFret] = React.useState(null);

  const handleNoteClick = (stringIndex, fret) => {
    const pitch = STRING_NOTES[stringIndex] + fret;
    const startTime = state.currentTime;
    const duration = 0.5; // Default quarter note
    
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        id: `fret-${Date.now()}`,
        pitch,
        startTime,
        endTime: startTime + duration,
        velocity: 90,
        string: stringIndex + 1,
        fret
      }
    });
  };

  const isNoteActive = (pitch) => {
    return state.notes.some(n => 
      n.pitch === pitch && 
      state.currentTime >= n.startTime && 
      state.currentTime <= n.endTime
    );
  };

  return (
    <div className="virtual-fretboard" style={{ padding: 'var(--space-md)', background: '#1a1a1f', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
      <div style={{ position: 'relative', height: '160px', minWidth: '800px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {STRINGS.map((label, sIdx) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', height: '18px', position: 'relative' }}>
            {/* String label */}
            <div style={{ width: '30px', color: 'var(--text-tertiary)', fontSize: '10px', textAlign: 'center' }}>{label}</div>
            
            {/* Frets */}
            <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
              <div 
                style={{ 
                  position: 'absolute', top: '50%', left: 0, right: 0, 
                  height: `${1 + sIdx * 0.5}px`, 
                  background: 'linear-gradient(90deg, #999, #bbb, #999)',
                  transform: 'translateY(-50%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }} 
              />
              {Array.from({ length: 23 }).map((_, fIdx) => {
                const pitch = STRING_NOTES[sIdx] + fIdx;
                const active = isNoteActive(pitch);
                return (
                  <div 
                    key={fIdx}
                    onClick={() => handleNoteClick(sIdx, fIdx)}
                    onMouseEnter={() => setHoveredFret({ sIdx, fIdx })}
                    onMouseLeave={() => setHoveredFret(null)}
                    style={{
                      flex: 1,
                      height: '100%',
                      borderRight: '2px solid #555',
                      position: 'relative',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {active && (
                      <div style={{
                        width: '12px', height: '12px', borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        boxShadow: '0 0 8px var(--accent-glow)',
                        zIndex: 2
                      }} />
                    )}
                    {hoveredFret?.sIdx === sIdx && hoveredFret?.fIdx === fIdx && !active && (
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        zIndex: 1
                      }} />
                    )}
                    {/* Fret marker */}
                    {[3, 5, 7, 9, 12, 15, 17, 19, 21].includes(fIdx) && sIdx === 2 && (
                       <div style={{ 
                         position: 'absolute', bottom: '-15px', left: '50%', 
                         transform: 'translateX(-50%)', fontSize: '8px', color: '#666'
                       }}>{fIdx}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Nut */}
        <div style={{ position: 'absolute', left: '30px', top: 0, bottom: 0, width: '6px', background: '#333', borderRadius: '2px' }} />
      </div>
    </div>
  );
}
