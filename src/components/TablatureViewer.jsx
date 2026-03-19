import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { calculateGuitarFingering } from '../utils/musicTheory';
import { Guitar, Tv, GripHorizontal } from 'lucide-react';
import GuitarFretboard from './GuitarFretboard';

/**
 * TablatureViewer - Professional Guitar/bass tablature display
 * Includes interactive Fretboard and separated Tablature Document
 */
export default function TablatureViewer() {
  const { state, dispatch } = useApp();
  const { notes, instrument, measures, tempo, currentTime, isPlaying, chords, activeTool, notationDuration, audioBuffer } = state;
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [hoverNote, setHoverNote] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Calculate advanced tab positions and fingering context
  const tabNotes = useMemo(() => {
    if (!instrument.tuning || !instrument.useTab || notes.length === 0) return [];
    
    // Deep clone notes before mutating them in the algorithm
    const notesClone = notes.map(n => ({...n}));
    return calculateGuitarFingering(notesClone, instrument.tuning);
  }, [notes, instrument]);

  // Group measures into justified Systems
  const systems = useMemo(() => {
    if (measures.length === 0 || tabNotes.length === 0) return [];

    const systemsList = [];
    let currentSystem = { measures: [], width: 0 };
    const maxSystemWidth = 800; // Standard page width for tabs

    measures.forEach(m => {
      const mNotes = tabNotes.filter(n => n.startTime >= m.startTime && n.startTime < m.endTime);
      const mWidth = Math.max(150, mNotes.length * 30 + 40);

      if (currentSystem.width + mWidth > maxSystemWidth && currentSystem.measures.length > 0) {
        systemsList.push(currentSystem);
        currentSystem = { measures: [], width: 0 };
      }
      
      currentSystem.measures.push({ ...m, notes: mNotes, width: mWidth });
      currentSystem.width += mWidth;
    });

    if (currentSystem.measures.length > 0) {
      systemsList.push(currentSystem);
    }

    return systemsList;
  }, [tabNotes, measures]);
  
  // --- 3D Highway Rendering (Rocksmith Style) ---
  const drawHighway = useCallback(() => {
    if (!canvasRef.current || !isPracticeMode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, width, height);

    const strings = instrument.strings || 6;
    const lookaheadTime = 3.0; 
    const hitLineY = height * 0.85; 
    const horizonY = height * 0.1; 
    
    const topWidth = width * 0.2; 
    const bottomWidth = width * 0.8; 
    const xCenter = width / 2;

    const stringColors = ['#ef4444', '#eab308', '#3b82f6', '#f97316', '#22c55e', '#a855f7'];

    const getStringX = (stringIdx, currentY) => {
      const t = (currentY - horizonY) / (hitLineY - horizonY);
      const currentWidth = topWidth + (bottomWidth - topWidth) * t;
      const step = currentWidth / (strings - 1);
      const startX = xCenter - (currentWidth / 2);
      // High e is index 0. On a right handed guitar looking down, low E is on the left.
      // So string 0 (high E) is on the right.
      const reversedIdx = (strings - 1) - stringIdx;
      return startX + (reversedIdx * step);
    };

    for (let i = 0; i < strings; i++) {
        const topX = getStringX(i, horizonY);
        const bottomX = getStringX(i, height);
        
        ctx.strokeStyle = stringColors[i % stringColors.length];
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(topX, horizonY);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(getStringX(strings - 1, hitLineY) - 20, hitLineY); // Flipped bounds
    ctx.lineTo(getStringX(0, hitLineY) + 20, hitLineY);
    ctx.stroke();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    const activeNotes = tabNotes.filter(n => n.hasPosition && n.endTime >= currentTime - 0.2 && n.startTime <= currentTime + lookaheadTime);
    activeNotes.sort((a, b) => b.startTime - a.startTime);

    for (const note of activeNotes) {
      const timeDiff = note.startTime - currentTime;
      const linearT = 1.0 - (timeDiff / lookaheadTime);
      const perspectiveT = Math.pow(Math.max(0, linearT), 2.5);
      
      const y = horizonY + (hitLineY - horizonY) * perspectiveT;
      const x = getStringX(note.tabString, y);
      const sizeBase = 12 + (24 * perspectiveT);
      const isNotePlaying = note.startTime <= currentTime && note.endTime >= currentTime;

      const color = stringColors[note.tabString % stringColors.length];

      if (note.duration > 0.1) {
         const tailLinearT = 1.0 - ((note.endTime - currentTime) / lookaheadTime);
         const tailPerspectiveT = Math.pow(Math.max(0, tailLinearT), 2.5);
         const tailY = horizonY + (hitLineY - horizonY) * tailPerspectiveT;
         const tailX = getStringX(note.tabString, tailY);
         
         ctx.strokeStyle = color;
         ctx.lineWidth = Math.max(2, sizeBase * 0.3);
         ctx.globalAlpha = isNotePlaying ? 0.8 : 0.4;
         ctx.beginPath();
         ctx.moveTo(x, y);
         ctx.lineTo(tailX, tailY);
         ctx.stroke();
         ctx.globalAlpha = 1.0;
      }

      if (y > horizonY) {
          ctx.fillStyle = '#1e1e2d';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          
          if (isNotePlaying) {
             ctx.fillStyle = color;
             ctx.shadowColor = color;
             ctx.shadowBlur = 20;
          }

          ctx.beginPath();
          ctx.rect(x - sizeBase/1.5, y - sizeBase/2, sizeBase*1.33, sizeBase);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          ctx.fillStyle = isNotePlaying ? '#fff' : color;
          ctx.font = `bold ${sizeBase * 0.6}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(note.tabFret, x, y);

          if (note.finger !== '?' && note.finger !== 0 && perspectiveT > 0.4) {
             ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
             ctx.font = `${sizeBase * 0.4}px Inter`;
             ctx.fillText(`f${note.finger}`, x, y - sizeBase);
          }
      }
    }
  }, [tabNotes, instrument, currentTime, isPracticeMode]);

  useEffect(() => {
    let animationId;
    if (isPlaying && isPracticeMode) {
        const loop = () => {
             drawHighway();
             animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
    } else {
        drawHighway();
    }
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, isPracticeMode, drawHighway]);


  if (!instrument.useTab) {
    return (
      <div className="notation-empty">
        <Guitar size={48} />
        <p>Tablature is available for guitar, bass, and ukulele.<br />
           Select a string instrument to see tabs.</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="notation-empty">
        <Guitar size={48} />
        <p>Upload an audio file to see tablature</p>
      </div>
    );
  }

  const strings = instrument.strings || 6;
  const stringLabels = instrument.id === 'bass'
    ? ['G', 'D', 'A', 'E']
    : instrument.id === 'ukulele'
    ? ['A', 'E', 'C', 'G']
    : ['e', 'B', 'G', 'D', 'A', 'E'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Tablature Toolbar */}
      <div className="editor-toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
           <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Guitar size={16} /> 
              {isPracticeMode ? 'Interactive Guitar Tabs' : 'Professional Tablature'}
           </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
           <div className="btn-group">
            <button 
              className={`btn btn-sm btn-icon ${!isPracticeMode ? 'active' : ''}`}
              title="Professional Tablature Mode"
              onClick={() => setIsPracticeMode(false)}
            >
              <GripHorizontal size={14} />
            </button>
            <button 
              className={`btn btn-sm btn-icon ${isPracticeMode ? 'active' : ''}`}
              title="Highway Practice Mode"
              onClick={() => setIsPracticeMode(true)}
            >
              <Tv size={14} />
            </button>
          </div>
        </div>
      </div>

      {!isPracticeMode && <GuitarFretboard notes={tabNotes} />}

      {isPracticeMode ? (
        <div className="practice-tablature" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a10' }}>
           <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      ) : (
        <div className="tablature-container" style={{ flex: 1, overflow: 'auto', padding: 'var(--space-xl)', background: '#dedede' }}>
          
          <div style={{ maxWidth: '900px', margin: '0 auto', background: '#fff', padding: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h1 style={{ color: '#000', textAlign: 'center', fontFamily: 'serif', marginBottom: '8px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
              {state.fileName} - TABLATURE
            </h1>
            <h3 style={{ color: '#444', textAlign: 'center', fontFamily: 'serif', marginTop: 0, marginBottom: '40px', fontStyle: 'italic' }}>
              Instrument: {instrument.name} | Tuning: Standard
            </h3>
            
            {systems.map((system, si) => {
              const systemWidth = 840; // Total width of the tab system
              const totalMWidth = system.measures.reduce((acc, m) => acc + m.width, 0);
              const justification = systemWidth / totalMWidth;

              return (
                <div key={si} style={{ marginBottom: '80px', position: 'relative', width: systemWidth }}>
                  
                  {/* Measure Bar Lines Background */}
                  {(() => {
                    let curX = 0;
                    return system.measures.map((m, mi) => {
                       const mWidth = m.width * justification;
                       const result = (
                          <div key={mi} style={{
                              position: 'absolute',
                              top: 0,
                              bottom: 0,
                              left: `${curX}px`,
                              width: `${mWidth}px`,
                              borderLeft: '1px solid #777',
                              paddingLeft: '4px',
                          }}>
                              <span style={{ color: '#888', fontSize: '9px' }}>{m.number}</span>
                              
                              {/* Chord Name above measure */}
                              {(() => {
                                const mChord = chords.find(c => c.startTime >= m.startTime && c.startTime < m.endTime);
                                return mChord ? (
                                  <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold', color: '#1e40af', fontSize: '13px' }}>
                                    {mChord.name}
                                  </div>
                                ) : null;
                              })()}

                              {/* Measure notes */}
                              <div style={{ position: 'relative', height: '100%' }}>
                                {m.notes.map(note => {
                                   const noteX = ((note.startTime - m.startTime) / (m.endTime - m.startTime)) * mWidth;
                                   const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
                                   return (
                                     <div key={note.id} style={{
                                        position: 'absolute',
                                        left: `${noteX}px`,
                                        top: `${note.tabString * 15 - 8}px`, // 15px is the gap
                                        background: isPlaying ? 'var(--accent-primary)' : '#fff',
                                        color: isPlaying ? '#fff' : '#000',
                                        fontWeight: 'bold',
                                        padding: '0 2px',
                                        fontSize: '11px',
                                        fontFamily: 'monospace',
                                        zIndex: 2,
                                        transform: 'translateX(-50%)'
                                     }}>
                                        {note.tabFret}
                                     </div>
                                   );
                                })}
                              </div>
                          </div>
                       );
                       curX += mWidth;
                       return result;
                    });
                  })()}
                  
                  {/* String Lines */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '14px', 
                      paddingTop: '10px', 
                      cursor: activeTool === 'notation' ? 'crosshair' : 'default' 
                    }}
                    onMouseMove={(e) => {
                      if (activeTool !== 'notation') return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const strIdx = Math.round(y / 15);
                      if (strIdx >= 0 && strIdx < strings) {
                        setHoverNote({ x, y: strIdx * 15, string: strIdx, systemIdx: si });
                      } else {
                        setHoverNote(null);
                      }
                    }}
                    onMouseLeave={() => setHoverNote(null)}
                    onClick={(e) => {
                      if (!hoverNote || activeTool !== 'notation') return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const t = x / systemWidth;
                      const sysStart = system.measures[0].startTime;
                      const sysEnd = system.measures[system.measures.length - 1].endTime;
                      const time = sysStart + t * (sysEnd - sysStart);

                      // Determine MIDI from string and some default "fret" or just add a base note
                      const tuning = instrument.tuning || [64, 59, 55, 50, 45, 40];
                      const midi = tuning[hoverNote.string] + 0; // Default open string fret

                      dispatch({
                        type: 'ADD_NOTE',
                        payload: {
                          id: `tab-note-${Date.now()}`,
                          midi,
                          startTime: time,
                          endTime: time + 0.5,
                          tabString: hoverNote.string,
                          tabFret: 0,
                          durationName: notationDuration
                        }
                      });
                    }}
                  >
                     {Array.from({ length: strings }, (_, strIdx) => (
                        <div key={strIdx} style={{ height: '1px', background: '#ccc', position: 'relative' }}>
                           {strIdx === 0 && <div style={{ position: 'absolute', left: '-30px', top: '-10px', fontWeight: '900', fontSize: '12px' }}>T</div>}
                           {strIdx === 1 && <div style={{ position: 'absolute', left: '-30px', top: '-10px', fontWeight: '900', fontSize: '12px' }}>A</div>}
                           {strIdx === 2 && <div style={{ position: 'absolute', left: '-30px', top: '-10px', fontWeight: '900', fontSize: '12px' }}>B</div>}
                           <div style={{ position: 'absolute', left: '-15px', top: '-9px', color: '#999', fontSize: '9px' }}>{stringLabels[strIdx]}</div>
                           
                           {/* Ghost Note */}
                           {hoverNote && hoverNote.string === strIdx && hoverNote.systemIdx === si && (
                              <div style={{
                                position: 'absolute',
                                left: `${hoverNote.x}px`,
                                top: '-8px',
                                background: 'rgba(124, 92, 252, 0.3)',
                                padding: '0 2px',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                 0
                              </div>
                           )}
                        </div>
                     ))}
                  </div>

                  {/* Waveform under system */}
                  {audioBuffer && (
                     <div style={{ marginTop: '20px', borderTop: '1px solid #eee' }}>
                        <SystemWaveformInternal 
                          buffer={audioBuffer} 
                          startTime={system.measures[0].startTime}
                          endTime={system.measures[system.measures.length - 1].endTime}
                          width={systemWidth}
                          height={40}
                        />
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight waveform for Tablature (Matching Noteflight/SoundCheck)
 */
function SystemWaveformInternal({ buffer, startTime, endTime, width, height }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !buffer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const channelData = buffer.getChannelData(0);
    const startIdx = Math.floor(startTime * buffer.sampleRate);
    const endIdx = Math.floor(endTime * buffer.sampleRate);
    const samples = channelData.slice(startIdx, endIdx);
    
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    
    const step = Math.ceil(samples.length / width);
    const h2 = height / 2;
    for (let i = 0; i < width; i++) {
        let max = 0;
        for (let j = 0; j < step; j++) {
            const val = Math.abs(samples[i * step + j] || 0);
            if (val > max) max = val;
        }
        ctx.moveTo(i, h2 - max * h2);
        ctx.lineTo(i, h2 + max * h2);
    }
    ctx.stroke();

    // Accuracy Indicator (SoundCheck style)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.4)'; // Greenish glow
    ctx.setLineDash([10, 5]);
    ctx.moveTo(0, h2);
    ctx.lineTo(width, h2);
    ctx.stroke();
  }, [buffer, startTime, endTime, width, height]);

  return <canvas ref={canvasRef} style={{ width, height, display: 'block', opacity: 0.6 }} />;
}
