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
  const [theme, setTheme] = useState('akai'); // Default to AKAI for WOW effect
  const [showControls, setShowControls] = useState(true);
  const splitMidi = 60; // Middle C

  const { notes, duration, currentTime, beats, tempo, selectedNotes, activeTool } = state;

  // Horizontal Piano Roll Settings
  const rhNoteHeight = 16;
  const rhPianoKeyWidth = 60;
  const rhPixelsPerSecond = 140;
  
  // Vertical (Practice) Piano Roll Settings
  const vpKeyWidth = 24;
  const vpKeyboardHeight = 100;
  const vpPixelsPerSecond = 240; 
  const vpVisibleSeconds = 3; 

  const midiRange = { low: 21, high: 108 }; 
  const totalKeys = midiRange.high - midiRange.low;
  
  const getWhiteKeyIndex = (midi) => {
    let whiteIndex = 0;
    for (let i = midiRange.low; i < midi; i++) {
      if (![1, 3, 6, 8, 10].includes(i % 12)) whiteIndex++;
    }
    return whiteIndex;
  };
  const totalWhiteKeys = getWhiteKeyIndex(midiRange.high);
  
  const rhCanvasHeight = totalKeys * rhNoteHeight;
  const rhCanvasWidth = Math.max(800, duration * rhPixelsPerSecond + rhPianoKeyWidth + 100);
  
  const vpCanvasWidth = totalWhiteKeys * vpKeyWidth;
  const vpCanvasHeight = 800;

  const canvasWidth = isPracticeMode ? vpCanvasWidth : rhCanvasWidth;
  const canvasHeight = isPracticeMode ? vpCanvasHeight : rhCanvasHeight;

  // Helper for theme colors
  const getThemeColors = (theme) => {
    if (theme === 'akai') return {
      bg: '#111',
      grid: 'rgba(239, 68, 68, 0.05)',
      gridStrong: 'rgba(239, 68, 68, 0.1)',
      note: 'rgba(239, 68, 68, 0.7)',
      notePlaying: '#ef4444',
      pianoWhite: '#ddd',
      pianoBlack: '#222',
      accent: '#ef4444'
    };
    if (theme === 'modern') return {
      bg: '#1a1a2e',
      grid: 'rgba(124, 92, 252, 0.05)',
      gridStrong: 'rgba(255, 255, 255, 0.1)',
      note: 'rgba(0, 242, 254, 0.6)',
      notePlaying: '#00f2fe',
      pianoWhite: '#fff',
      pianoBlack: '#0f172a',
      accent: '#7c5cfc'
    };
    return {
      bg: '#1e1e1e',
      grid: 'rgba(255, 255, 255, 0.03)',
      gridStrong: 'rgba(255, 255, 255, 0.08)',
      note: 'rgba(124, 92, 252, 0.6)',
      notePlaying: '#7c5cfc',
      pianoWhite: '#fff',
      pianoBlack: '#121212',
      accent: '#7c5cfc'
    };
  };

  const drawHorizontalRoll = (ctx, dpr) => {
    const colors = getThemeColors(theme);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw piano keys with 3D gradients
    for (let midi = midiRange.low; midi < midiRange.high; midi++) {
      const y = (midiRange.high - midi - 1) * rhNoteHeight;
      const noteInOctave = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      // Key background
      if (isBlack) {
        const grad = ctx.createLinearGradient(0, y, rhPianoKeyWidth, y);
        grad.addColorStop(0, '#111');
        grad.addColorStop(1, '#333');
        ctx.fillStyle = grad;
      } else {
        const grad = ctx.createLinearGradient(0, y, rhPianoKeyWidth, y);
        grad.addColorStop(0, colors.pianoWhite);
        grad.addColorStop(0.9, '#ddd');
        grad.addColorStop(1, '#bbb');
        ctx.fillStyle = grad;
      }
      ctx.fillRect(0, y, rhPianoKeyWidth, rhNoteHeight - 1);
      
      // Shadow under key
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, y + rhNoteHeight - 1, rhPianoKeyWidth, 1);

      if (noteInOctave === 0) { 
        ctx.font = 'bold 10px Inter';
        ctx.fillStyle = colors.accent;
        ctx.globalAlpha = 0.6;
        ctx.fillText(midiToNoteName(midi), 4, y + rhNoteHeight - 4);
        ctx.globalAlpha = 1.0;
      }

      // Grid line
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rhPianoKeyWidth, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      // Row background
      ctx.fillStyle = isBlack ? 'rgba(0,0,0,0.3)' : 'transparent';
      ctx.fillRect(rhPianoKeyWidth, y, canvasWidth - rhPianoKeyWidth, rhNoteHeight);
    }

    // Main border
    ctx.strokeStyle = colors.gridStrong;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rhPianoKeyWidth, 0);
    ctx.lineTo(rhPianoKeyWidth, canvasHeight);
    ctx.stroke();

    // Beat grid
    if (duration > 0 && tempo > 0) {
      const beatDuration = 60 / tempo;
      for (let t = 0; t < duration; t += beatDuration) {
        const x = rhPianoKeyWidth + t * rhPixelsPerSecond;
        const isDownbeat = Math.round(t / beatDuration) % 4 === 0;
        ctx.strokeStyle = isDownbeat ? colors.gridStrong : colors.grid;
        ctx.lineWidth = isDownbeat ? 1.5 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }

    // Notes
    notes.forEach(note => {
      if (note.midi < midiRange.low || note.midi >= midiRange.high) return;
      const x = rhPianoKeyWidth + note.startTime * rhPixelsPerSecond;
      const y = (midiRange.high - note.midi - 1) * rhNoteHeight;
      const w = Math.max(6, note.duration * rhPixelsPerSecond);
      const isSelected = selectedNotes.some(n => n.id === note.id);
      const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;

      if (isPlaying) {
        ctx.fillStyle = colors.notePlaying;
        ctx.shadowColor = colors.notePlaying;
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = isSelected ? '#fbbf24' : colors.note;
        ctx.shadowBlur = 0;
      }

      // Rounded rect for notes
      ctx.beginPath();
      ctx.roundRect(x + 1, y + 2, w - 2, rhNoteHeight - 4, 3);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Glossy highlight on note
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(x + 2, y + 3, w - 4, (rhNoteHeight - 4) / 2);
    });

    // Playhead
    const playheadX = rhPianoKeyWidth + currentTime * rhPixelsPerSecond;
    ctx.strokeStyle = theme === 'akai' ? '#ef4444' : '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvasHeight);
    ctx.stroke();
    
    // Playhead head
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 10);
    ctx.fill();
  };

  const drawVerticalRoll = (ctx, dpr) => {
    const colors = getThemeColors(theme);
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const hitY = canvasHeight - vpKeyboardHeight;
    
    // Lanes
    for (let i = 0; i <= totalWhiteKeys; i++) {
        const x = i * vpKeyWidth;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, hitY);
        ctx.stroke();
    }

    // Falling notes
    notes.forEach(note => {
      if (note.midi < midiRange.low || note.midi >= midiRange.high) return;
      if (note.endTime < currentTime - 0.5 || note.startTime > currentTime + vpVisibleSeconds) return;

      const isBlack = [1, 3, 6, 8, 10].includes(note.midi % 12);
      const whiteIndex = getWhiteKeyIndex(note.midi);
      const x = isBlack ? (whiteIndex * vpKeyWidth) - (vpKeyWidth * 0.3) : whiteIndex * vpKeyWidth;
      const w = isBlack ? vpKeyWidth * 0.6 : vpKeyWidth;
      
      const yBottom = hitY - (note.startTime - currentTime) * vpPixelsPerSecond;
      const yTop = hitY - (note.endTime - currentTime) * vpPixelsPerSecond;
      const h = yBottom - yTop;
      const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;

      let drawColor = isBlack ? '#4c2eaf' : colors.note;
      if (isPlaying) {
         drawColor = colors.notePlaying;
         ctx.shadowColor = colors.notePlaying;
         ctx.shadowBlur = 20;
      }
      
      ctx.fillStyle = drawColor;
      ctx.beginPath();
      ctx.roundRect(x+1, yTop, w-2, h, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
    });

    // Keyboard
    ctx.fillStyle = '#111';
    ctx.fillRect(0, hitY, canvasWidth, vpKeyboardHeight);
    for (let midi = midiRange.low; midi < midiRange.high; midi++) {
      if ([1, 3, 6, 8, 10].includes(midi % 12)) continue;
      const idx = getWhiteKeyIndex(midi);
      const x = idx * vpKeyWidth;
      const active = notes.some(n => n.midi === midi && n.startTime <= currentTime && n.endTime > currentTime);
      
      const grad = ctx.createLinearGradient(x, hitY, x, canvasHeight);
      grad.addColorStop(0, active ? colors.notePlaying : '#fff');
      grad.addColorStop(1, active ? colors.notePlaying : '#ccc');
      ctx.fillStyle = grad;
      ctx.fillRect(x, hitY, vpKeyWidth - 1, vpKeyboardHeight);
    }
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
    if (isPracticeMode) drawVerticalRoll(ctx, dpr);
    else drawHorizontalRoll(ctx, dpr);
  }, [notes, beats, duration, currentTime, tempo, selectedNotes, isPracticeMode, splitHands, theme, canvasWidth, canvasHeight]);

  useEffect(() => {
    let animationId;
    if (state.isPlaying || isPracticeMode) {
      const loop = () => { drawPianoRoll(); animationId = requestAnimationFrame(loop); };
      animationId = requestAnimationFrame(loop);
    } else {
      drawPianoRoll();
    }
    return () => cancelAnimationFrame(animationId);
  }, [state.isPlaying, isPracticeMode, drawPianoRoll]);

  useEffect(() => {
    if (!containerRef.current || isPracticeMode) return;
    const container = containerRef.current;
    const playheadX = rhPianoKeyWidth + currentTime * rhPixelsPerSecond;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;
    if (playheadX > scrollLeft + width * 0.75) {
      container.scrollTo({ left: playheadX - width * 0.25, behavior: state.isPlaying ? 'auto' : 'smooth' });
    }
  }, [currentTime, isPracticeMode, state.isPlaying]);

  const handleClick = useCallback((e) => {
    if (!canvasRef.current || isPracticeMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = (x - rhPianoKeyWidth) / rhPixelsPerSecond;
    const midi = midiRange.high - 1 - Math.floor(y / rhNoteHeight);
    if (activeTool === 'pencil' && time >= 0) {
      const beatDur = 60 / tempo;
      dispatch({ 
        type: 'ADD_NOTE', 
        payload: { id: `manual-${Date.now()}`, midi, startTime: time, endTime: time + beatDur, duration: beatDur, confidence: 1, velocity: 80 }
      });
    }
  }, [notes, selectedNotes, activeTool, tempo, isPracticeMode, dispatch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: getThemeColors(theme).bg }}>
      
      <div className="editor-toolbar" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: theme === 'akai' ? '#1a1a1a' : 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <span style={{ fontSize: '13px', fontWeight: 800, color: theme === 'akai' ? '#ef4444' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <Piano size={16} /> 
              {theme === 'akai' ? 'AKAI Professional' : 'Piano Roll'}
           </span>
           <select 
             className="select-sm" 
             value={theme} 
             onChange={(e) => setTheme(e.target.value)}
             style={{ background: theme === 'akai' ? '#333' : '#fff', color: theme === 'akai' ? '#fff' : '#000', border: '1px solid #444', borderRadius: '4px', padding: '2px 8px' }}
           >
             <option value="default">Default</option>
             <option value="modern">Modern</option>
             <option value="akai">AKAI MPK Theme</option>
           </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <button 
             className={`btn btn-sm ${showControls ? 'active' : ''}`}
             onClick={() => setShowControls(!showControls)}
             style={theme === 'akai' && showControls ? { background: '#ef4444', color: '#fff' } : {}}
           >
             Controls
           </button>
           <div className="btn-group">
            <button className={`btn btn-sm btn-icon ${!isPracticeMode ? 'active' : ''}`} onClick={() => setIsPracticeMode(false)}><GripHorizontal size={14} /></button>
            <button className={`btn btn-sm btn-icon ${isPracticeMode ? 'active' : ''}`} onClick={() => setIsPracticeMode(true)}><Tv size={14} /></button>
          </div>
        </div>
      </div>

      {showControls && <PianoRollControlPanel theme={theme} />}

      <div className="piano-roll" ref={containerRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        <canvas ref={canvasRef} onClick={handleClick} style={{ display: 'block' }} />
      </div>
    </div>
  );
}

function PianoRollControlPanel({ theme }) {
  const isAkai = theme === 'akai';
  const color = isAkai ? '#ef4444' : '#3b82f6';
  return (
    <div style={{ height: '150px', background: isAkai ? '#111' : '#222', borderBottom: isAkai ? '2px solid #ef4444' : '1px solid #333', display: 'flex', padding: '20px', gap: '40px', overflowX: 'auto', boxShadow: 'inset 0 -10px 20px rgba(0,0,0,0.5)' }}>
      <ControlGroup label="PITCH" color={color}>
         <Knob label="Transpose" value={0} color={color} />
         <Knob label="Fine" value={0} color={color} />
         <Knob label="LFO" value={15} color={color} />
      </ControlGroup>
      <ControlGroup label="FILTER" color={color}>
         <Knob label="Cutoff" value={85} color={color} />
         <Knob label="Res" value={20} color={color} />
         <Knob label="Drive" value={10} color={color} />
      </ControlGroup>
      <ControlGroup label="ENV" color={color}>
         <Knob label="Attack" value={5} color={color} />
         <Knob label="Decay" value={30} color={color} />
         <Knob label="Sus" value={100} color={color} />
         <Knob label="Rel" value={40} color={color} />
      </ControlGroup>
      {isAkai && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} style={{ width: '55px', height: '55px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '3px', boxShadow: '0 4px 0 #000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '9px', fontWeight: 'bold' }}>PAD {i+1}</div>
           ))}
        </div>
      )}
    </div>
  );
}

function ControlGroup({ label, children, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '9px', fontWeight: 900, color: color, letterSpacing: '2px' }}>{label}</span>
      <div style={{ display: 'flex', gap: '20px' }}>{children}</div>
    </div>
  );
}

function Knob({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `conic-gradient(${color} ${value * 3.6}deg, #0a0a0a 0deg)`, border: '2px solid #000', position: 'relative', boxShadow: '0 3px 6px rgba(0,0,0,0.4)' }}>
        <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px', background: '#1d1d1d', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '9px', fontWeight: 'bold' }}>{value}</div>
      </div>
      <span style={{ fontSize: '8px', color: '#999', fontWeight: 600 }}>{label}</span>
    </div>
  );
}

