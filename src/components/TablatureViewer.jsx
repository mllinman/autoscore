import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { midiToTabPosition, midiToNoteName } from '../utils/musicTheory';
import { Guitar, Tv, GripHorizontal } from 'lucide-react';

/**
 * TablatureViewer - Guitar/bass tablature display
 * Shows standard tablature or a 3D interactive "Rocksmith" practice highway
 */
export default function TablatureViewer() {
  const { state } = useApp();
  const { notes, instrument, measures, tempo, currentTime, isPlaying } = state;
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const canvasRef = useRef(null);

  // Calculate tab positions and heuristic fingering for each note
  const tabNotes = useMemo(() => {
    if (!instrument.tuning || !instrument.useTab || notes.length === 0) return [];

    let lastFret = 0;
    
    return notes.map(note => {
      const pos = midiToTabPosition(note.midi, instrument.tuning);
      
      // Heuristic Finger Assignment (1=Index, 2=Middle, 3=Ring, 4=Pinky, 0=Open/Thumb)
      let finger = '?';
      if (pos) {
        if (pos.fret === 0) {
            finger = 0; 
        } else {
            // Rough heuristic based on position playing
            // Assume 4 finger spread. If we jump, move "position"
            let position = Math.max(1, pos.fret - 1); 
            let relativeFinger = (pos.fret - position) + 1;
            
            // Adjust if it gets weird
            if (relativeFinger > 4) relativeFinger = 4;
            if (relativeFinger < 1) relativeFinger = 1;
            finger = relativeFinger;
        }
      }

      return {
        ...note,
        tabString: pos ? pos.string : 0,
        tabFret: pos ? pos.fret : '?',
        finger,
        hasPosition: pos !== null,
      };
    }).filter(n => n.hasPosition);
  }, [notes, instrument]);

  // Group notes into measures for standard display
  const measuredNotes = useMemo(() => {
    if (measures.length === 0 || tabNotes.length === 0) return [tabNotes];

    const groups = [];
    for (const measure of measures) {
      const measureNotes = tabNotes.filter(
        n => n.startTime >= measure.startTime && n.startTime < measure.endTime
      );
      if (measureNotes.length > 0) {
        groups.push({ measure, notes: measureNotes });
      }
    }

    return groups.length > 0 ? groups : [{ measure: null, notes: tabNotes }];
  }, [tabNotes, measures]);

  
  // --- 3D Highway Rendering (Rocksmith Style) ---
  const drawHighway = useCallback(() => {
    if (!canvasRef.current || !isPracticeMode) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Resize
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear background
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, width, height);

    const strings = instrument.strings || 6;
    const lookaheadTime = 3.0; // Seconds to show down the highway
    const hitLineY = height * 0.85; // 85% down the screen
    const horizonY = height * 0.1; // 10% from top
    
    // Perspective settings
    const topWidth = width * 0.2; // Width of highway at horizon
    const bottomWidth = width * 0.8; // Width of highway at hit line
    
    const xCenter = width / 2;

    // String colors (Rocksmith style standard tuning: Red, Yellow, Blue, Orange, Green, Purple)
    const stringColors = [
      '#ef4444', // 0: High e (Redish)
      '#eab308', // 1: B (Yellow)
      '#3b82f6', // 2: G (Blue)
      '#f97316', // 3: D (Orange)
      '#22c55e', // 4: A (Green)
      '#a855f7', // 5: Low E (Purple)
    ];

    // Helper to get X position on a string given a Y coordinate
    const getStringX = (stringIdx, currentY) => {
      // Linear interpolation between topWidth and bottomWidth based on Y
      const t = (currentY - horizonY) / (hitLineY - horizonY);
      // Bound t for rendering things past the hitline
      const currentWidth = topWidth + (bottomWidth - topWidth) * t;
      
      const step = currentWidth / (strings - 1);
      const startX = xCenter - (currentWidth / 2);
      return startX + (stringIdx * step);
    };

    // Draw Highway Grid / Strings
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

    // Draw Hit Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(getStringX(0, hitLineY) - 20, hitLineY);
    ctx.lineTo(getStringX(strings - 1, hitLineY) + 20, hitLineY);
    ctx.stroke();
    
    // Hit line glow
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw falling notes
    const activeNotes = tabNotes.filter(n => n.endTime >= currentTime - 0.2 && n.startTime <= currentTime + lookaheadTime);
    
    // Sort so notes further away are drawn first (painters algorithm)
    activeNotes.sort((a, b) => b.startTime - a.startTime);

    for (const note of activeNotes) {
      // Map time to Y coordinate (non-linear perspective projection)
      // distance from 1.0 (hitline) to 0.0 (horizon)
      const timeDiff = note.startTime - currentTime;
      // Linear T mapping
      const linearT = 1.0 - (timeDiff / lookaheadTime);
      
      // Apply perspective curve (closer notes move faster)
      // t^3 gives a nice feeling of acceleration coming towards camera
      const perspectiveT = Math.pow(Math.max(0, linearT), 2.5);
      
      const y = horizonY + (hitLineY - horizonY) * perspectiveT;
      const x = getStringX(note.tabString, y);
      
      // Determine size based on perspective
      const sizeBase = 12 + (24 * perspectiveT);
      const isPlaying = note.startTime <= currentTime && note.endTime >= currentTime;

      const color = stringColors[note.tabString % stringColors.length];

      // Sustain Tails (drawn behind note head)
      if (note.duration > 0.1) {
         const tailLinearT = 1.0 - ((note.endTime - currentTime) / lookaheadTime);
         const tailPerspectiveT = Math.pow(Math.max(0, tailLinearT), 2.5);
         const tailY = horizonY + (hitLineY - horizonY) * tailPerspectiveT;
         const tailX = getStringX(note.tabString, tailY);
         
         ctx.strokeStyle = color;
         ctx.lineWidth = Math.max(2, sizeBase * 0.3);
         ctx.globalAlpha = isPlaying ? 0.8 : 0.4;
         ctx.beginPath();
         ctx.moveTo(x, y);
         ctx.lineTo(tailX, tailY);
         ctx.stroke();
         ctx.globalAlpha = 1.0;
      }

      // Draw Note Head
      if (y > horizonY) {
          ctx.fillStyle = '#1e1e2d';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          
          if (isPlaying) {
             ctx.fillStyle = color;
             ctx.shadowColor = color;
             ctx.shadowBlur = 20;
          }

          ctx.beginPath();
          ctx.rect(x - sizeBase/1.5, y - sizeBase/2, sizeBase*1.33, sizeBase);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Fret Number
          ctx.fillStyle = isPlaying ? '#fff' : color;
          ctx.font = `bold ${sizeBase * 0.6}px Inter`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(note.tabFret, x, y);

          // Fingering suggestion (drawn above the note)
          if (note.finger !== '?' && note.finger !== 0 && perspectiveT > 0.4) {
             ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
             ctx.font = `${sizeBase * 0.4}px Inter`;
             ctx.fillText(`f${note.finger}`, x, y - sizeBase);
          }
      }
    }

  }, [tabNotes, instrument, currentTime, isPracticeMode]);

  // Animation Loop
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
      <div className="editor-toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
           <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Guitar size={16} /> 
              {isPracticeMode ? 'Interactive Guitar Tabs' : 'Standard Tablature'}
           </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
           <div className="btn-group">
            <button 
              className={`btn btn-sm btn-icon ${!isPracticeMode ? 'active' : ''}`}
              title="Standard Tablature"
              onClick={() => setIsPracticeMode(false)}
            >
              <GripHorizontal size={14} />
            </button>
            <button 
              className={`btn btn-sm btn-icon ${isPracticeMode ? 'active' : ''}`}
              title="Interactive Practice Mode"
              onClick={() => setIsPracticeMode(true)}
            >
              <Tv size={14} />
            </button>
          </div>
        </div>
      </div>

      {isPracticeMode ? (
        <div className="practice-tablature" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#0a0a10' }}>
           <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
      ) : (
        <div className="tablature-container" style={{ flex: 1, overflow: 'auto', padding: 'var(--space-xl)' }}>
          {measuredNotes.map((group, gi) => {
            const groupNotes = group.notes || group;
            const measure = group.measure;

            return (
              <div className="tab-system" key={gi} style={{ marginBottom: 'var(--space-2xl)' }}>
                {measure && (
                  <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--accent-tertiary)',
                    marginBottom: 'var(--space-sm)',
                    opacity: 0.6,
                  }}>
                    Measure {measure.number}
                  </div>
                )}

                <div className="tab-staff">
                  {Array.from({ length: strings }, (_, s) => {
                    const stringNotes = groupNotes.filter(n => n.tabString === s);

                    return (
                      <div className="tab-string" key={s}>
                        <span className="tab-string-label">{stringLabels[s] || s}</span>
                        <div style={{
                          flex: 1,
                          borderBottom: '1px solid var(--text-tertiary)',
                          position: 'relative',
                          opacity: 0.4,
                          height: '100%',
                        }}>
                          {stringNotes.map((note, ni) => {
                            const startPos = measure
                              ? (note.startTime - measure.startTime) / (measure.endTime - measure.startTime)
                              : ni / (groupNotes.length || 1);

                            const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
                            const isSelected = state.selectedNotes.some(n => n.id === note.id);

                            return (
                              <span
                                key={note.id}
                                className="tab-fret"
                                style={{
                                  left: `${Math.max(5, startPos * 90 + 5)}%`,
                                  color: isPlaying
                                    ? 'var(--color-success)'
                                    : isSelected
                                    ? 'var(--color-warning)'
                                    : 'var(--text-primary)',
                                  fontWeight: isPlaying ? 700 : 600,
                                  textShadow: isPlaying ? '0 0 8px var(--color-success)' : 'none',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                }}
                                title={`${note.noteName} (fret ${note.tabFret})`}
                              >
                                {note.tabFret}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
