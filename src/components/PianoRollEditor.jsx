import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { midiToNoteName } from '../utils/musicTheory';
import { Piano, Tv, GripHorizontal } from 'lucide-react';

/**
 * PianoRollEditor - MIDI-style piano roll note editor
 * Interactive grid with draggable notes and snap-to-grid
 * Also features an Interactive Practice mode (falling notes)
 */
export default function PianoRollEditor() {
  const { state, dispatch } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [splitHands, setSplitHands] = useState(false);
  const splitMidi = 60; // Middle C

  const { notes, duration, currentTime, beats, tempo, selectedNotes, activeTool } = state;

  // Horizontal Piano Roll Settings
  const rhNoteHeight = 12;
  const rhPianoKeyWidth = 52;
  const rhPixelsPerSecond = 120;
  
  // Vertical (Practice) Piano Roll Settings
  const vpKeyWidth = 24;
  const vpKeyboardHeight = 80;
  const vpPixelsPerSecond = 200; // How fast notes fall
  const vpVisibleSeconds = 4; // Lookahead time

  const midiRange = { low: 21, high: 108 }; // A0 to C8 (full 88 keys)
  const totalKeys = midiRange.high - midiRange.low;
  
  // Natural vs Accidental key mapping for standardizing the 88-key layout visually in vertical mode
  const getWhiteKeyIndex = (midi) => {
    let whiteIndex = 0;
    for (let i = midiRange.low; i < midi; i++) {
      if (![1, 3, 6, 8, 10].includes(i % 12)) whiteIndex++;
    }
    return whiteIndex;
  };
  const totalWhiteKeys = getWhiteKeyIndex(midiRange.high);
  
  // Canvas Setup
  const rhCanvasHeight = totalKeys * rhNoteHeight;
  const rhCanvasWidth = Math.max(800, duration * rhPixelsPerSecond + rhPianoKeyWidth + 50);
  
  const vpCanvasWidth = totalWhiteKeys * vpKeyWidth;
  const vpCanvasHeight = 600;

  const canvasWidth = isPracticeMode ? vpCanvasWidth : rhCanvasWidth;
  const canvasHeight = isPracticeMode ? vpCanvasHeight : rhCanvasHeight;

  const drawHorizontalRoll = (ctx, dpr) => {
    // Fill background
    ctx.fillStyle = 'var(--bg-primary)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw piano keys
    for (let midi = midiRange.low; midi < midiRange.high; midi++) {
      const y = (midiRange.high - midi - 1) * rhNoteHeight;
      const noteInOctave = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      // Key background
      ctx.fillStyle = isBlack
        ? 'rgba(20, 20, 35, 0.9)'
        : 'rgba(28, 28, 48, 0.6)';
      ctx.fillRect(0, y, rhPianoKeyWidth, rhNoteHeight);

      // Key label
      if (noteInOctave === 0) { // C notes
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
        ctx.fillText(midiToNoteName(midi), 4, y + rhNoteHeight - 2);
      }

      // Grid line
      ctx.strokeStyle = isBlack
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(rhPianoKeyWidth, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      // Row background for grid area
      ctx.fillStyle = isBlack
        ? 'rgba(15, 15, 28, 0.5)'
        : 'rgba(20, 20, 38, 0.3)';
      ctx.fillRect(rhPianoKeyWidth, y, canvasWidth - rhPianoKeyWidth, rhNoteHeight);
    }

    // Piano key border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rhPianoKeyWidth, 0);
    ctx.lineTo(rhPianoKeyWidth, canvasHeight);
    ctx.stroke();

    // Draw beat grid lines
    if (beats && beats.length > 0) {
      for (const beat of beats) {
        const x = rhPianoKeyWidth + beat.time * rhPixelsPerSecond;
        ctx.strokeStyle = beat.isDownbeat
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = beat.isDownbeat ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();

        if (beat.isDownbeat) {
          ctx.font = '9px Inter, sans-serif';
          ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
          ctx.fillText(`${beat.measureNumber}`, x + 3, 10);
        }
      }
    } else if (duration > 0 && tempo > 0) {
      const beatDuration = 60 / tempo;
      for (let t = 0; t < duration; t += beatDuration) {
        const x = rhPianoKeyWidth + t * rhPixelsPerSecond;
        const isDownbeat = Math.round(t / beatDuration) % 4 === 0;
        ctx.strokeStyle = isDownbeat
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }

    // Draw notes
    for (const note of notes) {
      if (note.midi < midiRange.low || note.midi >= midiRange.high) continue;

      const x = rhPianoKeyWidth + note.startTime * rhPixelsPerSecond;
      const y = (midiRange.high - note.midi - 1) * rhNoteHeight;
      const w = Math.max(4, note.duration * rhPixelsPerSecond);

      const isSelected = selectedNotes.some(n => n.id === note.id);
      const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;

      if (isPlaying) {
        ctx.fillStyle = 'rgba(52, 211, 153, 0.9)';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 6;
      } else if (isSelected) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 4;
      } else {
        const alpha = 0.5 + note.confidence * 0.4;
        ctx.fillStyle = splitHands ? (note.midi >= splitMidi ? `rgba(96, 165, 250, ${alpha})` : `rgba(244, 114, 182, ${alpha})`) : `rgba(124, 92, 252, ${alpha})`;
        ctx.shadowBlur = 0;
      }

      const r = 3;
      ctx.beginPath();
      ctx.moveTo(x + r, y + 1);
      ctx.lineTo(x + w - r, y + 1);
      ctx.quadraticCurveTo(x + w, y + 1, x + w, y + 1 + r);
      ctx.lineTo(x + w, y + rhNoteHeight - 1 - r);
      ctx.quadraticCurveTo(x + w, y + rhNoteHeight - 1, x + w - r, y + rhNoteHeight - 1);
      ctx.lineTo(x + r, y + rhNoteHeight - 1);
      ctx.quadraticCurveTo(x, y + rhNoteHeight - 1, x, y + rhNoteHeight - 1 - r);
      ctx.lineTo(x, y + 1 + r);
      ctx.quadraticCurveTo(x, y + 1, x + r, y + 1);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = isPlaying
        ? 'rgba(52, 211, 153, 0.5)'
        : isSelected
        ? 'rgba(251, 191, 36, 0.5)'
        : 'rgba(124, 92, 252, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw playhead
    if (duration > 0) {
      const playheadX = rhPianoKeyWidth + currentTime * rhPixelsPerSecond;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  };

  const drawVerticalRoll = (ctx, dpr) => {
    // Fill background
    ctx.fillStyle = '#101018'; // Darker for practice mode
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const hitY = canvasHeight - vpKeyboardHeight;
    
    // Draw string lanes / tracks
    for (let i = 0; i <= totalWhiteKeys; i++) {
        const x = i * vpKeyWidth;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hitY);
        ctx.stroke();
    }

    // Draw falling notes
    for (const note of notes) {
      if (note.midi < midiRange.low || note.midi >= midiRange.high) continue;

      // Note is visible if it ends after (currentTime - small margin) and starts before (currentTime + lookahead)
      if (note.endTime < currentTime - 0.5 || note.startTime > currentTime + vpVisibleSeconds) continue;

      const isBlack = [1, 3, 6, 8, 10].includes(note.midi % 12);
      const whiteIndex = getWhiteKeyIndex(note.midi);
      
      const x = isBlack 
        ? (whiteIndex * vpKeyWidth) - (vpKeyWidth * 0.3)
        : whiteIndex * vpKeyWidth;
      
      const w = isBlack ? vpKeyWidth * 0.6 : vpKeyWidth;
      
      // Calculate Y positioning. Top of screen is currentTime + vpVisibleSeconds
      // Hit line is at currentTime.
      // Time flows from top to bottom.
      const timeDiffStart = note.startTime - currentTime;
      const timeDiffEnd = note.endTime - currentTime;
      
      // y is coordinate from top of canvas
      const yBottom = hitY - (timeDiffStart * vpPixelsPerSecond);
      const yTop = hitY - (timeDiffEnd * vpPixelsPerSecond);
      const h = yBottom - yTop;

      const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
      
      // Setup colors
      let baseColor, glowColor;
      if (splitHands) {
        if (note.midi >= splitMidi) {
          baseColor = isPlaying ? '#93c5fd' : '#3b82f6'; // Light blue / Blue
          glowColor = '#60a5fa';
        } else {
          baseColor = isPlaying ? '#f9a8d4' : '#ec4899'; // Light pink / Pink
          glowColor = '#f472b6';
        }
      } else {
        baseColor = isPlaying ? '#a78bfa' : '#7c5cfc'; // Purple
        glowColor = '#8b5cf6';
      }

      ctx.fillStyle = baseColor;
      if (isPlaying) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
      } else {
        ctx.shadowBlur = 0;
      }

      // Rounded rect
      const r = Math.min(4, w / 2, h / 2);
      ctx.beginPath();
      // Clip if drawing above canvas to avoid artifacts
      const drawY = Math.max(0, yTop);
      const drawH = Math.min(yBottom, canvasHeight) - drawY;
      
      if (drawH > 0) {
        // Just draw a simple rounded rect for performance
        if (isBlack) {
            ctx.fillStyle = isPlaying ? glowColor : '#4c2eaf';
        }
        ctx.fillRect(x + 1, drawY, w - 2, drawH);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, drawY, w - 2, drawH);
      }
      ctx.shadowBlur = 0;
    }

    // Draw keyboard at bottom
    ctx.fillStyle = '#1e1e2d';
    ctx.fillRect(0, canvasHeight - vpKeyboardHeight, canvasWidth, vpKeyboardHeight);
    
    // Draw white keys
    for (let midi = midiRange.low; midi < midiRange.high; midi++) {
      if ([1, 3, 6, 8, 10].includes(midi % 12)) continue; // skip black keys
      
      const whiteIndex = getWhiteKeyIndex(midi);
      const x = whiteIndex * vpKeyWidth;
      
      const isActive = notes.some(n => n.midi === midi && n.startTime <= currentTime && n.endTime > currentTime);
      
      ctx.fillStyle = isActive ? (splitHands ? (midi >= splitMidi ? '#93c5fd' : '#f9a8d4') : '#a78bfa') : '#ffffff';
      ctx.fillRect(x, canvasHeight - vpKeyboardHeight, vpKeyWidth - 1, vpKeyboardHeight);
      
      if (midi % 12 === 0) {
         ctx.fillStyle = '#666';
         ctx.font = '10px Inter';
         ctx.fillText(midiToNoteName(midi), x + 4, canvasHeight - 10);
      }
    }

    // Draw black keys
    for (let midi = midiRange.low; midi < midiRange.high; midi++) {
      if (![1, 3, 6, 8, 10].includes(midi % 12)) continue;
      
      const whiteIndex = getWhiteKeyIndex(midi);
      // Black key sits between white keys
      const x = (whiteIndex * vpKeyWidth) - (vpKeyWidth * 0.35);
      const w = vpKeyWidth * 0.7;
      const h = vpKeyboardHeight * 0.6;
      
      const isActive = notes.some(n => n.midi === midi && n.startTime <= currentTime && n.endTime > currentTime);
      
      ctx.fillStyle = isActive ? (splitHands ? (midi >= splitMidi ? '#3b82f6' : '#ec4899') : '#a78bfa') : '#111';
      ctx.fillRect(x, canvasHeight - vpKeyboardHeight, w, h);
      
      // Black key highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + w * 0.2, canvasHeight - vpKeyboardHeight, w * 0.6, h * 0.9);
    }
    
    // Hit line overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(canvasWidth, hitY);
    ctx.stroke();
  };

  const drawPianoRoll = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.scale(dpr, dpr);

    if (isPracticeMode) {
      drawVerticalRoll(ctx, dpr);
    } else {
      drawHorizontalRoll(ctx, dpr);
    }

  }, [notes, beats, duration, currentTime, tempo, selectedNotes, isPracticeMode, splitHands, canvasWidth, canvasHeight]);

  // Request animation frame loop if audio is playing to ensure smooth vertical scroll
  useEffect(() => {
    let animationId;
    if (state.isPlaying && isPracticeMode) {
        const loop = () => {
             drawPianoRoll();
             animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
    } else {
        drawPianoRoll();
    }
    return () => cancelAnimationFrame(animationId);
  }, [state.isPlaying, isPracticeMode, drawPianoRoll]);

  // Auto-scroll the container to keep playhead/active region in view
  useEffect(() => {
    if (!containerRef.current || isPracticeMode) return; // Vertical handles its own scroll via camera paradigm
    
    const container = containerRef.current;
    const playheadX = rhPianoKeyWidth + currentTime * rhPixelsPerSecond;
    
    // Trigger scroll if playhead is past 70% of the view or before 10%
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    
    if (playheadX > scrollLeft + width * 0.7) {
      container.scrollTo({ left: playheadX - width * 0.3, behavior: state.isPlaying ? 'auto' : 'smooth' });
    } else if (playheadX < scrollLeft + width * 0.1) {
      container.scrollTo({ left: Math.max(0, playheadX - width * 0.1), behavior: state.isPlaying ? 'auto' : 'smooth' });
    }
  }, [currentTime, isPracticeMode, state.isPlaying, rhPianoKeyWidth, rhPixelsPerSecond]);


  const handleClick = useCallback((e) => {
    if (!canvasRef.current || isPracticeMode) return; // Disable editing in practice mode

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    const time = (x - rhPianoKeyWidth) / rhPixelsPerSecond;
    const midi = midiRange.high - 1 - Math.floor(y / rhNoteHeight);

    if (activeTool === 'select') {
      const clickedNote = notes.find(n =>
        n.startTime <= time && n.endTime >= time && n.midi === midi
      );

      if (clickedNote) {
        const isAlreadySelected = selectedNotes.some(n => n.id === clickedNote.id);
        if (e.shiftKey) {
          dispatch({
            type: 'SET_SELECTED_NOTES',
            payload: isAlreadySelected
              ? selectedNotes.filter(n => n.id !== clickedNote.id)
              : [...selectedNotes, clickedNote],
          });
        } else {
          dispatch({
            type: 'SET_SELECTED_NOTES',
            payload: isAlreadySelected ? [] : [clickedNote],
          });
        }
      } else {
        dispatch({ type: 'SET_SELECTED_NOTES', payload: [] });
      }
    } else if (activeTool === 'pencil' && time >= 0) {
      const beatDuration = 60 / tempo;
      dispatch({
        type: 'ADD_NOTE',
        payload: {
          id: `note-manual-${Date.now()}`,
          midi,
          noteName: midiToNoteName(midi),
          frequency: 440 * Math.pow(2, (midi - 69) / 12),
          startTime: time,
          endTime: time + beatDuration,
          duration: beatDuration,
          durationName: 'quarter',
          confidence: 1,
          velocity: 80,
        },
      });
    } else if (activeTool === 'eraser') {
      const clickedNote = notes.find(n =>
        n.startTime <= time && n.endTime >= time && n.midi === midi
      );
      if (clickedNote) {
        dispatch({
          type: 'SET_NOTES',
          payload: notes.filter(n => n.id !== clickedNote.id),
        });
      }
    }
  }, [notes, selectedNotes, activeTool, tempo, isPracticeMode, dispatch, rhPixelsPerSecond, rhNoteHeight, rhPianoKeyWidth, midiRange]);

  if (notes.length === 0 && !state.audioBuffer) {
    return (
      <div className="notation-empty">
        <Piano size={48} />
        <p>Upload an audio file to see the piano roll editor</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Piano Roll Toolbar */}
      <div className="editor-toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', padding: 'var(--space-sm) var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
           <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Piano size={16} /> 
              {isPracticeMode ? 'Practice Piano Roll (Falling Notes)' : 'Standard Piano Roll'}
           </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
           {isPracticeMode && (
             <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={splitHands} 
                  onChange={(e) => setSplitHands(e.target.checked)} 
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Split L/R Hands (Middle C)
             </label>
           )}
           <div className="btn-group">
            <button 
              className={`btn btn-sm btn-icon ${!isPracticeMode ? 'active' : ''}`}
              title="Standard Editor Mode"
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

      <div className="piano-roll" ref={containerRef} style={{ flex: 1, overflow: 'auto' }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{ cursor: isPracticeMode ? 'default' : activeTool === 'pencil' ? 'crosshair' : activeTool === 'eraser' ? 'not-allowed' : 'default' }}
        />
      </div>
    </div>
  );
}
