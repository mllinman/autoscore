import React, { useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';

/**
 * WaveformViewer - Canvas-based waveform visualization
 */
export default function WaveformViewer() {
  const { state } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Downsample the audio buffer for display
  const waveformData = useMemo(() => {
    if (!state.audioBuffer) return null;
    const data = state.audioBuffer.getChannelData(0);
    const samples = 2000;
    const blockSize = Math.floor(data.length / samples);
    const peaks = [];

    for (let i = 0; i < samples; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < blockSize; j++) {
        const val = data[i * blockSize + j];
        if (val < min) min = val;
        if (val > max) max = val;
      }
      peaks.push({ min, max });
    }
    return peaks;
  }, [state.audioBuffer]);

  useEffect(() => {
    if (!canvasRef.current || !waveformData) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    const center = height / 2;
    const barWidth = width / waveformData.length;

    // Gradient
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#7c5cfc');
    grad.addColorStop(0.5, '#a78bfa');
    grad.addColorStop(1, '#6366f1');

    ctx.fillStyle = grad;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const minY = center + waveformData[i].min * center * 0.9;
      const maxY = center + waveformData[i].max * center * 0.9;
      ctx.fillRect(x, maxY, Math.max(1, barWidth - 0.5), minY - maxY);
    }

    // Draw playhead
    if (state.duration > 0) {
      const playheadX = (state.currentTime / state.duration) * width;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Played region overlay
      ctx.fillStyle = 'rgba(124, 92, 252, 0.15)';
      ctx.fillRect(0, 0, playheadX, height);
    }

    // Draw beat markers
    if (state.beats && state.beats.length > 0 && state.duration > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      for (const beat of state.beats) {
        if (beat.isDownbeat) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
        }
        const x = (beat.time / state.duration) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

  }, [waveformData, state.currentTime, state.duration, state.beats]);

  if (!state.audioBuffer) return null;

  return (
    <div className="waveform-container">
      <span className="waveform-label">Waveform</span>
      <div className="waveform-wrapper" ref={containerRef}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
}
