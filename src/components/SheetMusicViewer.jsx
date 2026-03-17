import React, { useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { midiToNoteName } from '../utils/musicTheory';
import { Music } from 'lucide-react';

/**
 * SheetMusicViewer - Canvas-based sheet music notation renderer
 * Renders standard musical notation on treble/bass clef staves
 */
export default function SheetMusicViewer() {
  const { state } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const notes = state.notes;
  const measures = state.measures;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const notesPerRow = 16;
    const rowHeight = 120;
    const numRows = Math.max(1, Math.ceil(notes.length / notesPerRow));
    const height = Math.max(400, numRows * rowHeight + 80);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (notes.length === 0) return;

    const margin = 60;
    const staffWidth = width - margin * 2;
    const lineSpacing = 8; // distance between staff lines
    const staffHeight = lineSpacing * 4;

    // Draw each row
    for (let row = 0; row < numRows; row++) {
      const startIdx = row * notesPerRow;
      const endIdx = Math.min(startIdx + notesPerRow, notes.length);
      const rowNotes = notes.slice(startIdx, endIdx);
      const yOffset = row * rowHeight + 50;

      // Draw staff lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let line = 0; line < 5; line++) {
        const y = yOffset + line * lineSpacing;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(margin + staffWidth, y);
        ctx.stroke();
      }

      // Draw clef symbol
      ctx.font = '32px serif';
      ctx.fillStyle = 'var(--text-secondary)';
      if (state.instrument.clef === 'bass') {
        ctx.fillText('𝄢', margin + 4, yOffset + 20);
      } else {
        ctx.fillText('𝄞', margin + 4, yOffset + 26);
      }

      // Draw measure number
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
      const measureStart = measures.findIndex(m => {
        const noteForMeasure = rowNotes[0];
        return noteForMeasure && noteForMeasure.startTime >= m.startTime && noteForMeasure.startTime < m.endTime;
      });
      if (measureStart >= 0) {
        ctx.fillText(`m.${measureStart + 1}`, margin, yOffset - 8);
      }

      // Draw notes
      const noteSpacing = (staffWidth - 50) / (rowNotes.length + 1);
      rowNotes.forEach((note, i) => {
        const x = margin + 50 + noteSpacing * (i + 0.5);
        const noteY = midiToStaffY(note.midi, yOffset, lineSpacing, state.instrument.clef);

        // Ledger lines
        drawLedgerLines(ctx, x, noteY, yOffset, yOffset + staffHeight, lineSpacing);

        // Note head
        const isSelected = state.selectedNotes.some(n => n.id === note.id);
        const isPlaying = note.startTime <= state.currentTime && note.endTime > state.currentTime;

        ctx.save();
        ctx.translate(x, noteY);
        ctx.rotate(-0.15);

        if (isPlaying) {
          ctx.fillStyle = '#34d399';
          ctx.shadowColor = '#34d399';
          ctx.shadowBlur = 8;
        } else if (isSelected) {
          ctx.fillStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = '#eeeef5';
        }

        // Draw note head ellipse
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Stem
        ctx.strokeStyle = ctx.fillStyle || '#eeeef5';
        if (isPlaying) ctx.strokeStyle = '#34d399';
        else if (isSelected) ctx.strokeStyle = '#fbbf24';
        else ctx.strokeStyle = '#eeeef5';
        ctx.lineWidth = 1.5;

        const stemDir = noteY > yOffset + staffHeight / 2 ? -1 : 1;
        const stemLength = 28;
        ctx.beginPath();
        ctx.moveTo(stemDir > 0 ? x - 5.5 : x + 5.5, noteY);
        ctx.lineTo(stemDir > 0 ? x - 5.5 : x + 5.5, noteY + stemDir * stemLength);
        ctx.stroke();

        // Flag for eighth notes and shorter
        if (note.durationName === 'eighth' || note.durationName === 'sixteenth') {
          const flagX = stemDir > 0 ? x - 5.5 : x + 5.5;
          const flagY = noteY + stemDir * stemLength;
          ctx.beginPath();
          ctx.strokeStyle = ctx.strokeStyle;
          ctx.lineWidth = 1.5;
          ctx.moveTo(flagX, flagY);
          ctx.bezierCurveTo(flagX + 8, flagY + stemDir * 5, flagX + 6, flagY + stemDir * 12, flagX, flagY + stemDir * 16);
          ctx.stroke();
        }

        // Note name below
        ctx.shadowBlur = 0;
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(note.noteName, x, yOffset + staffHeight + 20);
        ctx.textAlign = 'start';
      });

      // Draw barlines between measures
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      // End barline
      ctx.beginPath();
      ctx.moveTo(margin + staffWidth, yOffset);
      ctx.lineTo(margin + staffWidth, yOffset + staffHeight);
      ctx.stroke();
      // Start barline
      ctx.beginPath();
      ctx.moveTo(margin, yOffset);
      ctx.lineTo(margin, yOffset + staffHeight);
      ctx.stroke();
    }
  }, [notes, state.currentTime, state.selectedNotes, state.instrument, measures]);

  if (notes.length === 0) {
    return (
      <div className="notation-empty">
        <Music size={48} />
        <p>Upload an audio file to see sheet music notation</p>
      </div>
    );
  }

  const numRows = Math.max(1, Math.ceil(notes.length / 16));
  const canvasHeight = Math.max(400, numRows * 120 + 80);

  return (
    <div className="sheet-music-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="notation-canvas"
        style={{ height: canvasHeight }}
      />
    </div>
  );
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
