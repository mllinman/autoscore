import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useApp } from '../context/AppContext';
import { midiToNoteName, frequencyToMidi } from '../utils/musicTheory';
import { BarChart3, Eye, EyeOff, Music } from 'lucide-react';

/**
 * SpectrogramViewer - Canvas-based spectrogram (time vs frequency, color = amplitude)
 * Features: note lines, harmonic overlay, cursor readout, click-to-add notes
 */
export default function SpectrogramViewer() {
  const { state, dispatch } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [cursorInfo, setCursorInfo] = useState(null);
  const [isComputing, setIsComputing] = useState(false);

  const { spectrogramData, notes, candidateNotes, showCandidateNotes,
          currentTime, duration, showNoteLines, showHarmonicLines, beats } = state;

  // Compute spectrogram if needed
  useEffect(() => {
    if (!state.audioBuffer || spectrogramData) return;

    const computeSpectrogram = async () => {
      setIsComputing(true);
      try {
        const { SpectrogramEngine } = await import('../engine/SpectrogramEngine.js');
        const result = await SpectrogramEngine.compute(
          state.audioBuffer,
          {
            fftSize: state.fileSettings.frequencyResolution,
            hopSize: state.fileSettings.timeStep,
          },
          (progress) => {
            // Optional: update UI
          }
        );
        dispatch({ type: 'SET_SPECTROGRAM_DATA', payload: result });
      } catch (err) {
        console.error('Spectrogram computation error:', err);
      }
      setIsComputing(false);
    };

    computeSpectrogram();
  }, [state.audioBuffer, spectrogramData, dispatch, state.fileSettings]);

  // Draw spectrogram
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !spectrogramData) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = 400;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const { data, frequencies, numBins, numFrames } = spectrogramData;

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Draw spectrogram heatmap
    const colWidth = Math.max(1, width / numFrames);
    const rowHeight = height / numBins;

    for (let f = 0; f < numFrames; f++) {
      const x = (f / numFrames) * width;
      const frameData = data[f];

      for (let b = 0; b < numBins; b++) {
        const amp = frameData[b];
        if (amp < 0.01) continue; // Skip very quiet bins

        const y = height - ((b + 1) / numBins) * height;

        // Color mapping: dark purple -> blue -> cyan -> yellow -> white
        const r = Math.min(255, amp * 600);
        const g = Math.min(255, amp * 300);
        const bVal = Math.min(255, 80 + amp * 400);
        ctx.fillStyle = `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(bVal)})`;
        ctx.fillRect(x, y, colWidth + 0.5, rowHeight + 0.5);
      }
    }

    // Note lines at piano key boundaries
    if (showNoteLines) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 0.5;
      const minFreq = frequencies[0];
      const maxFreq = frequencies[numBins - 1];

      for (let midi = 21; midi <= 108; midi++) {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        if (freq < minFreq || freq > maxFreq) continue;

        const logPos = Math.log2(freq / minFreq) / Math.log2(maxFreq / minFreq);
        const y = height - logPos * height;

        const noteInOctave = midi % 12;
        if (noteInOctave === 0) {
          ctx.strokeStyle = 'rgba(167, 139, 250, 0.15)';
          ctx.lineWidth = 1;

          // Label C notes
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillStyle = 'rgba(167, 139, 250, 0.4)';
          ctx.fillText(midiToNoteName(midi), 3, y - 2);
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 0.5;
        }

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw notes overlay
    const minFreq = frequencies[0];
    const maxFreq = frequencies[numBins - 1];

    const drawNoteOverlay = (noteList, color, alpha, isCandidate = false) => {
      for (const note of noteList) {
        const freq = note.frequency || 440 * Math.pow(2, (note.midi - 69) / 12);
        if (freq < minFreq || freq > maxFreq) continue;

        const logPos = Math.log2(freq / minFreq) / Math.log2(maxFreq / minFreq);
        const y = height - logPos * height;
        const x = (note.startTime / duration) * width;
        const w = Math.max(3, ((note.endTime - note.startTime) / duration) * width);

        const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
        const isSelected = state.selectedNotes.some(n => n.id === note.id);

        ctx.fillStyle = isPlaying
          ? `rgba(52, 211, 153, ${alpha})`
          : isSelected
          ? `rgba(251, 191, 36, ${alpha})`
          : `rgba(${color}, ${alpha})`;

        ctx.fillRect(x, y - 3, w, 6);

        if (!isCandidate) {
          ctx.strokeStyle = isPlaying
            ? 'rgba(52, 211, 153, 0.6)'
            : isSelected
            ? 'rgba(251, 191, 36, 0.6)'
            : `rgba(${color}, 0.4)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y - 3, w, 6);
        }
      }
    };

    drawNoteOverlay(notes, '124, 92, 252', 0.7);
    if (showCandidateNotes && candidateNotes.length > 0) {
      drawNoteOverlay(candidateNotes, '255, 255, 255', 0.25, true);
    }

    // Beat lines
    if (beats) {
      for (const beat of beats) {
        const x = (beat.time / duration) * width;
        ctx.strokeStyle = beat.isDownbeat
          ? 'rgba(99, 102, 241, 0.3)'
          : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = beat.isDownbeat ? 1 : 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    // Playhead
    if (duration > 0) {
      const px = (currentTime / duration) * width;
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
    }

    // Harmonic lines (if cursor is hovering)
    if (showHarmonicLines && cursorInfo) {
      const baseFreq = cursorInfo.frequency;
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);

      for (let h = 1; h <= 8; h++) {
        const hFreq = baseFreq * h;
        if (hFreq > maxFreq) break;
        const logPos = Math.log2(hFreq / minFreq) / Math.log2(maxFreq / minFreq);
        const y = height - logPos * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

  }, [spectrogramData, notes, candidateNotes, showCandidateNotes, currentTime,
      duration, showNoteLines, showHarmonicLines, beats, cursorInfo, state.selectedNotes]);

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || !spectrogramData) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const height = rect.height;
    const width = rect.width;

    const { frequencies, numBins } = spectrogramData;
    const minFreq = frequencies[0];
    const maxFreq = frequencies[numBins - 1];

    const logPos = 1 - y / height;
    const freq = minFreq * Math.pow(maxFreq / minFreq, logPos);
    const time = (x / width) * duration;
    const midi = frequencyToMidi(freq);

    setCursorInfo({
      frequency: freq,
      note: midiToNoteName(midi),
      time,
      x, y,
    });
  }, [spectrogramData, duration]);

  const handleMouseLeave = () => setCursorInfo(null);

  if (!state.audioBuffer) {
    return (
      <div className="notation-empty">
        <BarChart3 size={48} />
        <p>Upload an audio file to see the spectrogram</p>
      </div>
    );
  }

  if (isComputing) {
    return (
      <div className="notation-empty">
        <div className="processing-spinner" style={{ width: 40, height: 40 }} />
        <p>Computing spectrogram...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Controls bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
        fontSize: 'var(--text-xs)',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showNoteLines}
            onChange={e => dispatch({ type: 'SET_SHOW_NOTE_LINES', payload: e.target.checked })}
            style={{ accentColor: 'var(--accent-primary)' }}
          />
          Note lines
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showHarmonicLines}
            onChange={e => dispatch({ type: 'SET_SHOW_HARMONIC_LINES', payload: e.target.checked })}
            style={{ accentColor: 'var(--accent-primary)' }}
          />
          Harmonics
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={showCandidateNotes}
            onChange={e => dispatch({ type: 'SET_SHOW_CANDIDATE_NOTES', payload: e.target.checked })}
            style={{ accentColor: 'var(--accent-primary)' }}
          />
          Candidates
        </label>
      </div>

      <div ref={containerRef} style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 400, display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Cursor readout */}
        {cursorInfo && (
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(10, 10, 15, 0.85)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
            pointerEvents: 'none',
            display: 'flex',
            gap: 'var(--space-md)',
          }}>
            <span style={{ color: 'var(--accent-tertiary)' }}>{cursorInfo.note}</span>
            <span>{cursorInfo.frequency.toFixed(1)} Hz</span>
            <span>{cursorInfo.time.toFixed(2)}s</span>
          </div>
        )}
      </div>
    </div>
  );
}
