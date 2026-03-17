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
  const { state } = useApp();
  const { notes, instrument, measures, tempo, currentTime, isPlaying } = state;
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const canvasRef = useRef(null);

  // Calculate advanced tab positions and fingering context
  const tabNotes = useMemo(() => {
    if (!instrument.tuning || !instrument.useTab || notes.length === 0) return [];
    
    // Deep clone notes before mutating them in the algorithm
    const notesClone = notes.map(n => ({...n}));
    return calculateGuitarFingering(notesClone, instrument.tuning);
  }, [notes, instrument]);

  // Group notes into logical lines (systems) rather than strictly measures for readability
  // E.g., fit X seconds or Y notes per line. We'll chunk by 4 measures.
  const systems = useMemo(() => {
    if (measures.length === 0 || tabNotes.length === 0) return [{ measures: [], notes: tabNotes }];

    const chunks = [];
    let currentChunk = { measures: [], notes: [] };
    
    for (let i = 0; i < measures.length; i++) {
        const m = measures[i];
        const mNotes = tabNotes.filter(n => n.startTime >= m.startTime && n.startTime < m.endTime);
        
        currentChunk.measures.push(m);
        currentChunk.notes.push(...mNotes);
        
        // Break into pages/systems every 4 measures
        if ((i + 1) % 4 === 0 || i === measures.length - 1) {
             chunks.push(currentChunk);
             currentChunk = { measures: [], notes: [] };
        }
    }
    return chunks;
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
              // Determine total length of this system in time to map X coordinates
              const sysStart = system.measures.length > 0 ? system.measures[0].startTime : 0;
              const sysEnd = system.measures.length > 0 ? system.measures[system.measures.length - 1].endTime : sysStart + 10;
              const duration = sysEnd - sysStart;

              return (
                <div key={si} style={{ marginBottom: '60px', position: 'relative' }}>
                  
                  {/* Measure Bar Lines Background */}
                  {system.measures.map((m, mi) => (
                      <div key={mi} style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: `${((m.startTime - sysStart) / duration) * 100}%`,
                          borderLeft: '1px solid #777',
                          paddingLeft: '4px',
                          color: '#555',
                          fontSize: '10px',
                          fontFamily: 'serif',
                          zIndex: 1
                      }}>
                          {m.number}
                      </div>
                  ))}
                  
                  {/* Final Barline */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, borderRight: '2px solid #000', zIndex: 1 }} />

                  {/* Draw each string line */}
                  <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px' }}>
                     {Array.from({ length: strings }, (_, strIdx) => {
                       
                       const isSelectedString = state.selectedNotes.some(n => n.tabString === strIdx);

                       return (
                         <div key={strIdx} style={{ height: '1px', background: '#000', position: 'relative', zIndex: 0 }}>
                            {strIdx === 0 && <div style={{ position: 'absolute', left: '-25px', top: '-10px', color: '#000', fontWeight: 'bold' }}>T</div>}
                            {strIdx === 1 && <div style={{ position: 'absolute', left: '-25px', top: '-10px', color: '#000', fontWeight: 'bold' }}>A</div>}
                            {strIdx === 2 && <div style={{ position: 'absolute', left: '-25px', top: '-10px', color: '#000', fontWeight: 'bold' }}>B</div>}
                            
                            <div style={{ position: 'absolute', left: '-12px', top: '-8px', color: '#666', fontSize: '10px' }}>
                               {stringLabels[strIdx]}
                            </div>

                            {/* Render Notes on this string */}
                            {system.notes.filter(n => n.tabString === strIdx).map((note, ni) => {
                               const leftPct = ((note.startTime - sysStart) / duration) * 100;
                               const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
                               
                               return (
                                 <div key={note.id} style={{
                                    position: 'absolute',
                                    left: `${leftPct}%`,
                                    top: '-10px', // Center on line
                                    background: isPlaying ? 'var(--accent-primary)' : '#fff',
                                    color: isPlaying ? '#fff' : '#000',
                                    fontWeight: 'bold',
                                    padding: '0 4px',
                                    border: isPlaying ? '1px solid var(--accent-primary)' : '1px solid #fff',
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    zIndex: 2,
                                    transform: 'translateX(-50%)' // Center note visually
                                 }}>
                                    {note.tabFret}
                                 </div>
                               );
                            })}
                         </div>
                       );
                     })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
