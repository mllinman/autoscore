import React, { useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { midiToNoteName } from '../utils/musicTheory';
import { Music, Play, Plus, Trash2 } from 'lucide-react';
import SystemWaveform from './SystemWaveform';

/**
 * SheetMusicViewer - Canvas-based sheet music notation renderer
 * Renders standard musical notation on treble/bass clef staves
 */
export default function SheetMusicViewer() {
  const { state, dispatch } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverNote, setHoverNote] = React.useState(null);

  const { notes, measures, detectedKey, chords, timeSignature, tempo, currentTime, selectedNotes, instrument, activeTool, notationDuration, notationAccidental, audioBuffer } = state;

  // Constants for professional notation
  const LINE_SPACING = 10;
  const STAFF_TOP_MARGIN = 60;
  const STAFF_HEIGHT = LINE_SPACING * 4;
  const MEASURE_WIDTH_MIN = 120;
  
  // Calculate layout: Group measures into "Systems" (rows)
  const systems = useMemo(() => {
    if (measures.length === 0) return [];
    
    const systemsList = [];
    let currentSystem = { measures: [], width: 0 };
    const maxSystemWidth = containerRef.current?.clientWidth ? containerRef.current.clientWidth - 100 : 800;

    measures.forEach(m => {
      const mNotes = notes.filter(n => n.startTime >= m.startTime && n.startTime < m.endTime);
      const mWidth = Math.max(MEASURE_WIDTH_MIN, mNotes.length * 20 + 40);

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
  }, [measures, notes, containerRef.current?.clientWidth]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || systems.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = containerRef.current.clientWidth;
    const padding = 50;
    const systemGap = 220; // Increased to fit waveform
    const height = systems.length * systemGap + 120;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // --- Rendering Styles ---
    const colors = {
      staff: '#000000',
      note: '#000000',
      playing: 'var(--accent-primary)',
      selected: 'var(--warning-primary)',
      text: '#444444',
      chord: '#1e40af', // Blueish for chords
      paper: '#ffffff'
    };

    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, width, height);

    systems.forEach((system, sIdx) => {
      const systemY = STAFF_TOP_MARGIN + sIdx * systemGap;
      const systemWidth = width - padding * 2;
      const scaleX = systemWidth / system.width; // Scale to justify

      // 1. Draw Staff Lines
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = systemY + i * LINE_SPACING;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }

      // 2. Draw Clef and Key Signature at start of each system
      drawClef(ctx, padding + 10, systemY, instrument.clef);
      
      let xCursor = padding + 60;
      
      // key signature
      if (detectedKey) {
        xCursor = drawKeySignature(ctx, xCursor, systemY, detectedKey, instrument.clef, LINE_SPACING);
      }

      // Time signature (only on first system or if changed)
      if (sIdx === 0) {
        drawTimeSignature(ctx, xCursor, systemY, timeSignature, LINE_SPACING);
        xCursor += 40;
      }

      // 3. Draw Measures
      let measureX = xCursor;
      const usableWidth = (width - padding) - xCursor;
      const totalSystemMeasuresWidth = system.measures.reduce((acc, m) => acc + m.width, 0);
      const justificationFactor = usableWidth / (system.width - (xCursor - padding));

      system.measures.forEach((measure, mIdx) => {
        const mWidth = measure.width * justificationFactor;
        
        // Draw Barline
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(measureX + mWidth, systemY);
        ctx.lineTo(measureX + mWidth, systemY + STAFF_HEIGHT);
        ctx.stroke();

        // Draw Measure Number
        ctx.font = 'italic 10px serif';
        ctx.fillStyle = '#888';
        ctx.fillText(measure.number, measureX, systemY - 10);

        // Draw Chord if present in this timeframe
        const measureChord = chords.find(c => c.startTime >= measure.startTime && c.startTime < measure.endTime);
        if (measureChord) {
          ctx.font = 'bold 12px serif';
          ctx.fillStyle = colors.chord;
          ctx.textAlign = 'center';
          ctx.fillText(measureChord.name, measureX + mWidth / 2, systemY - 25);
          ctx.textAlign = 'left';
        }

        // Draw Notes in measure
        const noteSpacing = mWidth / (measure.notes.length + 1);
        measure.notes.forEach((note, nIdx) => {
          const noteX = measureX + noteSpacing * (nIdx + 1);
          const noteY = midiToStaffY(note.midi, systemY, LINE_SPACING, instrument.clef);
          
          const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
          const isSelected = selectedNotes.some(sn => sn.id === note.id);
          const color = isPlaying ? colors.playing : (isSelected ? colors.selected : colors.note);

          // Note specific logic
          drawLedgerLines(ctx, noteX, noteY, systemY, systemY + STAFF_HEIGHT, LINE_SPACING);
          drawNote(ctx, noteX, noteY, color, note.durationName || 'quarter', LINE_SPACING);
          
          // Draw note name help if enabled (or just because it looks cool)
          ctx.font = '8px sans-serif';
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillText(note.noteName, noteX - 5, systemY + STAFF_HEIGHT + 15);
        });

        // --- DRAW WAVEFORM UNDER SYSTEM ---
        if (mIdx === 0 && audioBuffer) {
           // We'll draw the waveform for the whole system here to avoid multiple canvas overlaps
           // but technically we should have a separate React component or just draw it on canvas.
           // Since we have SystemWaveform component, we'll try to use it via a portal or similar,
           // but for simplicity in this canvas, let's just draw a basic envelope here.
           drawSystemWaveformInternal(ctx, padding, systemY + STAFF_HEIGHT + 40, width - padding * 2, 60, audioBuffer, system.measures[0].startTime, system.measures[system.measures.length-1].endTime);
        }

        measureX += mWidth;
      });
    });

    // Draw Hover Note (Ghost)
    if (hoverNote && activeTool === 'notation') {
       const { x, y, midi } = hoverNote;
       drawNote(ctx, x, y, 'rgba(124, 92, 252, 0.4)', notationDuration, LINE_SPACING);
       drawLedgerLines(ctx, x, y, hoverNote.staffTop, hoverNote.staffTop + STAFF_HEIGHT, LINE_SPACING);
    }

  }, [systems, currentTime, selectedNotes, instrument, detectedKey, chords, timeSignature, hoverNote, activeTool, notationDuration, audioBuffer]);

  const handleMouseMove = (e) => {
    if (activeTool !== 'notation' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find which system and measure we are in
    let found = null;
    systems.forEach((system, sIdx) => {
      const systemY = STAFF_TOP_MARGIN + sIdx * 220;
      if (y > systemY - 40 && y < systemY + 140) {
        // Simple snapping to staff lines
        const snappedY = Math.round((y - systemY) / (LINE_SPACING / 2)) * (LINE_SPACING / 2) + systemY;
        const midi = staffYToMidi(snappedY, systemY, LINE_SPACING, instrument.clef);
        
        found = { x, y: snappedY, midi, staffTop: systemY };
      }
    });
    setHoverNote(found);
  };

  const handleClick = (e) => {
    if (activeTool !== 'notation' || !hoverNote) return;
    
    // Calculate approximate startTime based on horizontal position in system
    // This is a simplified version; in a real app you'd find the exact measure.
    const rect = canvasRef.current.getBoundingClientRect();
    const padding = 50;
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Find measure
    let targetMeasure = null;
    systems.forEach((system, sIdx) => {
       const systemY = STAFF_TOP_MARGIN + sIdx * 220;
       if (Math.abs(hoverNote.y - systemY) < 150) {
          // Approximate time based on X in system
          const sysStart = system.measures[0].startTime;
          const sysEnd = system.measures[system.measures.length-1].endTime;
          const sysDur = sysEnd - sysStart;
          const t = (x - padding) / (width - padding * 2);
          const time = sysStart + t * sysDur;
          
          dispatch({
            type: 'ADD_NOTE',
            payload: {
              id: `note-${Date.now()}`,
              midi: hoverNote.midi,
              noteName: midiToNoteName(hoverNote.midi),
              startTime: time,
              endTime: time + 0.5, // Default duration
              durationName: notationDuration,
              velocity: 0.8
            }
          });
       }
    });
  };

  if (notes.length === 0) {
    return (
      <div className="notation-empty" style={{ background: '#fff', color: '#333' }}>
        <Music size={48} />
        <p>Upload audio to generate classical sheet music</p>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>Our AI will automatically detect key, tempo, and chords.</span>
      </div>
    );
  }

  return (
    <div 
      className="sheet-music-container" 
      ref={containerRef} 
      style={{ background: '#f5f5f5', padding: '20px', overflowY: 'auto' }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseLeave={() => setHoverNote(null)}
    >
      <canvas
        ref={canvasRef}
        className="notation-canvas professional"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1)', borderRadius: '4px', cursor: activeTool === 'notation' ? 'none' : 'default' }}
      />
    </div>
  );
}

/**
 * Internal Waveform Drawing for Canvas (to match Noteflight vibe)
 */
function drawSystemWaveformInternal(ctx, x, y, width, height, buffer, startTime, endTime) {
  const channelData = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const totalSamples = endSample - startSample;
  
  if (totalSamples <= 0) return;

  // Background gradient for wave area
  const bgGrad = ctx.createLinearGradient(x, y, x, y + height);
  bgGrad.addColorStop(0, 'rgba(240, 240, 245, 0.5)');
  bgGrad.addColorStop(1, 'rgba(220, 220, 230, 0.5)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, width, height);

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(124, 92, 252, 0.2)'; // Faint accent color
  ctx.lineWidth = 1;

  const samplesPerPixel = totalSamples / width;
  const halfHeight = height / 2;

  for (let px = 0; px < width; px++) {
    const sampleIdx = startSample + Math.floor(px * samplesPerPixel);
    if (sampleIdx >= channelData.length) break;

    let max = 0;
    const chunk = Math.ceil(samplesPerPixel);
    for (let i = 0; i < chunk; i++) {
        const s = Math.abs(channelData[sampleIdx + i] || 0);
        if (s > max) max = s;
    }

    ctx.moveTo(x + px, y + halfHeight - max * halfHeight);
    ctx.lineTo(x + px, y + halfHeight + max * halfHeight);
  }
  ctx.stroke();
  
  // SoundCheck indicator line (decorative)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 100, 0, 0.3)';
  ctx.setLineDash([5, 5]);
  ctx.moveTo(x, y + halfHeight);
  ctx.lineTo(x + width, y + halfHeight);
  ctx.stroke();
  ctx.setLineDash([]);
}

function staffYToMidi(y, staffTop, lineSpacing, clef) {
  const halfSpacing = lineSpacing / 2;
  const bottomLineY = staffTop + lineSpacing * 4;
  const staffPos = Math.round((bottomLineY - y) / halfSpacing);
  
  // Refined MIDI mapping back from staff position
  const posToMidiBase = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
  if (clef === 'bass') {
    const midiA2 = 45;
    const offsetPos = staffPos + 5;
    const octOffset = Math.floor(offsetPos / 7);
    const posInOct = offsetPos % 7;
    if (posInOct < 0) return 21; // Clamp
    return 21 + octOffset * 12 + posToMidiBase[posInOct];
  } else {
    const midiE4 = 64;
    const offsetPos = staffPos + 2;
    const octOffset = Math.floor(offsetPos / 7);
    const posInOct = (offsetPos % 7 + 7) % 7;
    return 48 + octOffset * 12 + posToMidiBase[posInOct];
  }
}

/** 
 * Professional Drawing Functions 
 */

function drawClef(ctx, x, y, clef) {
  ctx.font = '42px serif';
  ctx.fillStyle = '#000';
  if (clef === 'bass') {
    ctx.fillText('𝄢', x, y + 25);
  } else {
    ctx.fillText('𝄞', x, y + 32);
  }
}

function drawTimeSignature(ctx, x, y, ts, lineSpacing) {
  ctx.font = `bold ${lineSpacing * 3}px serif`;
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.fillText(ts.num, x, y + lineSpacing * 1.8);
  ctx.fillText(ts.den, x, y + lineSpacing * 3.8);
  ctx.textAlign = 'left';
}

function drawKeySignature(ctx, x, y, keyData, clef, lineSpacing) {
  // Simple mapping of scale to sharps/flats
  // C major = 0, G major = 1 sharp, etc.
  const keyMap = {
    'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6,
    'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6
  };
  
  const count = keyMap[keyData.key] || 0;
  const isSharp = count >= 0;
  const absCount = Math.abs(count);
  
  ctx.font = '20px serif';
  ctx.fillStyle = '#000';
  
  const symbol = isSharp ? '♯' : '♭';
  // Sharp positions (Treble): F, C, G, D, A, E, B
  const sharpOffsets = [0, 1.5, -0.5, 1, 2.5, 0.5, 2];
  // Flat positions (Treble): B, E, A, D, G, C, F
  const flatOffsets = [2, 0.5, 2.5, 1, 3, 1.5, 3.5];

  for (let i = 0; i < absCount; i++) {
    const offset = isSharp ? sharpOffsets[i] : flatOffsets[i];
    ctx.fillText(symbol, x + i * 10, y + offset * lineSpacing + 5);
  }

  return x + absCount * 12 + 10;
}

function drawNote(ctx, x, y, color, duration, lineSpacing) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;

  // 1. Note Head (Slanted Ellipse)
  ctx.beginPath();
  const isHollow = duration === 'whole' || duration === 'half';
  ctx.ellipse(x, y, 6, 4.5, -0.2, 0, Math.PI * 2);
  if (isHollow) {
    ctx.stroke();
    // Inner hollow
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 2, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fill();
  }

  // 2. Stem
  if (duration !== 'whole') {
    const stemDir = y > 100 ? -1 : 1; // Simplistic flip logic
    const stemLength = lineSpacing * 3.5;
    const stemX = x + (stemDir > 0 ? -5.5 : 5.5);
    
    ctx.beginPath();
    ctx.moveTo(stemX, y);
    ctx.lineTo(stemX, y + stemDir * stemLength);
    ctx.stroke();

    // 3. Flags/Beams (Simplistic)
    if (duration === 'eighth' || duration === 'sixteenth') {
       ctx.beginPath();
       ctx.moveTo(stemX, y + stemDir * stemLength);
       ctx.bezierCurveTo(stemX + 8, y + stemDir*(stemLength-5), stemX+6, y + stemDir*(stemLength-15), stemX, y + stemDir*(stemLength-20));
       ctx.stroke();
       
       if (duration === 'sixteenth') {
         ctx.beginPath();
         ctx.moveTo(stemX, y + stemDir * (stemLength - 5));
         ctx.bezierCurveTo(stemX + 8, y + stemDir*(stemLength-10), stemX+6, y + stemDir*(stemLength-20), stemX, y + stemDir*(stemLength-25));
         ctx.stroke();
       }
    }
  }

  ctx.restore();
}

/**
 * Map MIDI note to Y position on the staff
 */
function midiToStaffY(midi, staffTop, lineSpacing, clef) {
  // Map note to staff position (0 = bottom line of staff)
  const notePositions = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C through B
  const octave = Math.floor(midi / 12) - 1;
  const noteInOctave = midi % 12;
  const notePos = notePositions[noteInOctave];

  let staffPos;
  if (clef === 'bass') {
    // Bass clef: A2 (45) is at position 0 (bottom line)
    staffPos = (octave - 2) * 7 + notePos - 5;
  } else {
    // Treble clef: E4 (64) is at position 0 (bottom line)
    staffPos = (octave - 4) * 7 + notePos - 2;
  }

  // Each staff position = half a line spacing
  const halfSpacing = lineSpacing / 2;
  const bottomLineY = staffTop + lineSpacing * 4;
  return bottomLineY - staffPos * halfSpacing;
}

/**
 * Draw ledger lines above/below staff as needed
 */
function drawLedgerLines(ctx, x, noteY, staffTop, staffBottom, lineSpacing) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;

  // Below staff
  if (noteY > staffBottom + lineSpacing / 2) {
    for (let y = staffBottom + lineSpacing; y <= noteY + 2; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.stroke();
    }
  }

  // Above staff
  if (noteY < staffTop - lineSpacing / 2) {
    for (let y = staffTop - lineSpacing; y >= noteY - 2; y -= lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(x - 10, y);
      ctx.lineTo(x + 10, y);
      ctx.stroke();
    }
  }
}
