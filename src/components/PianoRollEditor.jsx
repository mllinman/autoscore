import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { midiToNoteName } from '../utils/musicTheory';
import { Piano } from 'lucide-react';

/**
 * PianoRollEditor - MIDI-style piano roll note editor
 * Interactive grid with draggable notes and snap-to-grid
 */
export default function PianoRollEditor() {
  const { state, dispatch } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const { notes, duration, currentTime, beats, tempo, selectedNotes, activeTool } = state;

  // Piano roll settings
  const noteHeight = 12;
  const pianoKeyWidth = 52;
  const pixelsPerSecond = 120;
  const midiRange = { low: 36, high: 96 }; // C2 to C7
  const totalKeys = midiRange.high - midiRange.low;
  const canvasHeight = totalKeys * noteHeight;
  const canvasWidth = Math.max(800, duration * pixelsPerSecond + pianoKeyWidth + 50);

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

    // Clear
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw piano keys
    for (let midi = midiRange.low; midi < midiRange.high; midi++) {
      const y = (midiRange.high - midi - 1) * noteHeight;
      const noteInOctave = midi % 12;
      const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

      // Key background
      ctx.fillStyle = isBlack
        ? 'rgba(20, 20, 35, 0.9)'
        : 'rgba(28, 28, 48, 0.6)';
      ctx.fillRect(0, y, pianoKeyWidth, noteHeight);

      // Key label
      if (noteInOctave === 0) { // C notes
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(167, 139, 250, 0.6)';
        ctx.fillText(midiToNoteName(midi), 4, y + noteHeight - 2);
      }

      // Grid line
      ctx.strokeStyle = isBlack
        ? 'rgba(255, 255, 255, 0.03)'
        : 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(pianoKeyWidth, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();

      // Row background for grid area
      ctx.fillStyle = isBlack
        ? 'rgba(15, 15, 28, 0.5)'
        : 'rgba(20, 20, 38, 0.3)';
      ctx.fillRect(pianoKeyWidth, y, canvasWidth - pianoKeyWidth, noteHeight);
    }

    // Piano key border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pianoKeyWidth, 0);
    ctx.lineTo(pianoKeyWidth, canvasHeight);
    ctx.stroke();

    // Draw beat grid lines
    if (beats && beats.length > 0) {
      for (const beat of beats) {
        const x = pianoKeyWidth + beat.time * pixelsPerSecond;
        ctx.strokeStyle = beat.isDownbeat
          ? 'rgba(255, 255, 255, 0.12)'
          : 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = beat.isDownbeat ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();

        // Measure number at top
        if (beat.isDownbeat) {
          ctx.font = '9px Inter, sans-serif';
          ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
          ctx.fillText(`${beat.measureNumber}`, x + 3, 10);
        }
      }
    } else if (duration > 0 && tempo > 0) {
      // Draw basic beat lines
      const beatDuration = 60 / tempo;
      for (let t = 0; t < duration; t += beatDuration) {
        const x = pianoKeyWidth + t * pixelsPerSecond;
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

      const x = pianoKeyWidth + note.startTime * pixelsPerSecond;
      const y = (midiRange.high - note.midi - 1) * noteHeight;
      const w = Math.max(4, note.duration * pixelsPerSecond);

      const isSelected = selectedNotes.some(n => n.id === note.id);
      const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;

      // Note rectangle
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
        ctx.fillStyle = `rgba(124, 92, 252, ${alpha})`;
        ctx.shadowBlur = 0;
      }

      // Rounded rect
      const r = 3;
      ctx.beginPath();
      ctx.moveTo(x + r, y + 1);
      ctx.lineTo(x + w - r, y + 1);
      ctx.quadraticCurveTo(x + w, y + 1, x + w, y + 1 + r);
      ctx.lineTo(x + w, y + noteHeight - 1 - r);
      ctx.quadraticCurveTo(x + w, y + noteHeight - 1, x + w - r, y + noteHeight - 1);
      ctx.lineTo(x + r, y + noteHeight - 1);
      ctx.quadraticCurveTo(x, y + noteHeight - 1, x, y + noteHeight - 1 - r);
      ctx.lineTo(x, y + 1 + r);
      ctx.quadraticCurveTo(x, y + 1, x + r, y + 1);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;

      // Note border
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
      const playheadX = pianoKeyWidth + currentTime * pixelsPerSecond;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();

      // Playhead triangle at top
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [notes, beats, duration, currentTime, tempo, selectedNotes,
      canvasWidth, canvasHeight, pixelsPerSecond, noteHeight, pianoKeyWidth, midiRange]);

  useEffect(() => {
    drawPianoRoll();
  }, [drawPianoRoll]);

  const handleClick = useCallback((e) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    const time = (x - pianoKeyWidth) / pixelsPerSecond;
    const midi = midiRange.high - 1 - Math.floor(y / noteHeight);

    if (activeTool === 'select') {
      // Find clicked note
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
      // Add a new note
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
  }, [notes, selectedNotes, activeTool, tempo, dispatch, pixelsPerSecond, noteHeight, pianoKeyWidth, midiRange]);

  if (notes.length === 0 && !state.audioBuffer) {
    return (
      <div className="notation-empty">
        <Piano size={48} />
        <p>Upload an audio file to see the piano roll editor</p>
      </div>
    );
  }

  return (
    <div className="piano-roll" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ cursor: activeTool === 'pencil' ? 'crosshair' : activeTool === 'eraser' ? 'not-allowed' : 'default' }}
      />
    </div>
  );
}
