import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Scissors, Volume1, FastForward, Rewind } from 'lucide-react';

/**
 * WaveformViewer - Canvas-based waveform visualization with DAW editing 
 */
export default function WaveformViewer() {
  const { state, dispatch, getAudioContext } = useApp();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);

  // Downsample the audio buffer for display
  const waveformData = useMemo(() => {
    if (!state.audioBuffer) return null;
    const data = state.audioBuffer.getChannelData(0);
    const samples = 2000;
    const blockSize = Math.floor(data.length / samples);
    const peaks = [];

    for (let i = 0; i < samples; i++) {
      let min = 1, max = -1, sumSquares = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = data[i * blockSize + j];
        if (val < min) min = val;
        if (val > max) max = val;
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / blockSize);
      peaks.push({ min, max, rms });
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
      const d = waveformData[i];

      // Draw peaks (semi-transparent background)
      ctx.fillStyle = 'rgba(124, 92, 252, 0.25)';
      const minY = center + d.min * center * 0.9;
      const maxY = center + d.max * center * 0.9;
      ctx.fillRect(x, maxY, Math.max(1, barWidth - 0.5), minY - maxY);

      // Draw RMS (solid gradient foreground)
      ctx.fillStyle = grad;
      const rmsMinY = center - d.rms * center * 0.9;
      const rmsMaxY = center + d.rms * center * 0.9;
      ctx.fillRect(x, rmsMinY, Math.max(1, barWidth - 0.5), rmsMaxY - rmsMinY);
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

    // Draw selection region
    if (selectionStart !== null && selectionEnd !== null) {
      const sStart = Math.min(selectionStart, selectionEnd);
      const sEnd = Math.max(selectionStart, selectionEnd);
      const startX = (sStart / state.duration) * width;
      const endX = (sEnd / state.duration) * width;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Selection borders
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, 0); ctx.lineTo(startX, height);
      ctx.moveTo(endX, 0); ctx.lineTo(endX, height);
      ctx.stroke();
    }

  }, [waveformData, state.currentTime, state.duration, state.beats, selectionStart, selectionEnd]);

  if (!state.audioBuffer) return null;

  const handlePointerDown = (e) => {
    if (!state.duration || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * state.duration;
    
    // Alt-click or Shift-click to select region instead of just seek
    if (e.shiftKey || e.altKey) {
      setIsSelecting(true);
      setSelectionStart(time);
      setSelectionEnd(time);
    } else {
      setSelectionStart(null);
      setSelectionEnd(null);
      dispatch({ type: 'SET_CURRENT_TIME', payload: Math.max(0, Math.min(state.duration, time)) });
    }
  };

  const handlePointerMove = (e) => {
    if (!isSelecting || !state.duration || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * state.duration;
    setSelectionEnd(Math.max(0, Math.min(state.duration, time)));
  };

  const handlePointerUp = () => {
    setIsSelecting(false);
  };

  // --- DSP DAW Operations ---

  const getSelectionIndices = (buffer) => {
    if (selectionStart === null || selectionEnd === null) return null;
    const rate = buffer.sampleRate;
    const sStart = Math.min(selectionStart, selectionEnd);
    const sEnd = Math.max(selectionStart, selectionEnd);
    return {
      startIndex: Math.floor(sStart * rate),
      endIndex: Math.floor(sEnd * rate),
      sStart, 
      sEnd
    };
  };

  const executeCut = async () => {
    const indices = getSelectionIndices(state.audioBuffer);
    if (!indices) return;
    const { startIndex, endIndex } = indices;
    
    const oldBuffer = state.audioBuffer;
    const newLength = oldBuffer.length - (endIndex - startIndex);
    
    const audioCtx = getAudioContext();
    const newBuffer = audioCtx.createBuffer(oldBuffer.numberOfChannels, newLength, oldBuffer.sampleRate);

    for (let c = 0; c < oldBuffer.numberOfChannels; c++) {
      const oldData = oldBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      
      // Copy before cut
      newData.set(oldData.subarray(0, startIndex), 0);
      // Copy after cut
      newData.set(oldData.subarray(endIndex), startIndex);
    }

    dispatch({
      type: 'SET_AUDIO',
      payload: { ...state, file: state.audioFile, buffer: newBuffer, name: state.fileName, duration: newBuffer.duration }
    });
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const executeFade = async (type) => { // 'in' or 'out'
    const indices = getSelectionIndices(state.audioBuffer);
    if (!indices) return;
    const { startIndex, endIndex } = indices;
    const oldBuffer = state.audioBuffer;
    
    // We mutate the Float32Array in place.
    // React state assumes immutability, but AudioBuffer is heavy. 
    // We will clone it to force a re-render.
    const audioCtx = getAudioContext();
    const newBuffer = audioCtx.createBuffer(oldBuffer.numberOfChannels, oldBuffer.length, oldBuffer.sampleRate);
    
    for (let c = 0; c < oldBuffer.numberOfChannels; c++) {
      const oldData = oldBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      newData.set(oldData); // full copy

      const regionLen = endIndex - startIndex;
      for (let i = 0; i < regionLen; i++) {
        const factor = type === 'in' ? (i / regionLen) : (1 - (i / regionLen));
        newData[startIndex + i] *= factor;
      }
    }

    dispatch({
      type: 'SET_AUDIO',
      payload: { ...state, file: state.audioFile, buffer: newBuffer, name: state.fileName, duration: newBuffer.duration }
    });
  };

  const executeGain = async (multiplier) => {
    const indices = getSelectionIndices(state.audioBuffer);
    if (!indices) return;
    const { startIndex, endIndex } = indices;
    const oldBuffer = state.audioBuffer;
    
    const audioCtx = getAudioContext();
    const newBuffer = audioCtx.createBuffer(oldBuffer.numberOfChannels, oldBuffer.length, oldBuffer.sampleRate);
    
    for (let c = 0; c < oldBuffer.numberOfChannels; c++) {
      const oldData = oldBuffer.getChannelData(c);
      const newData = newBuffer.getChannelData(c);
      newData.set(oldData);

      for (let i = startIndex; i < endIndex; i++) {
        newData[i] *= multiplier;
      }
    }

    dispatch({
      type: 'SET_AUDIO',
      payload: { ...state, file: state.audioFile, buffer: newBuffer, name: state.fileName, duration: newBuffer.duration }
    });
  };

  const hasSelection = selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 0.05;

  return (
    <div className="waveform-container" style={{ position: 'relative' }}>
      
      {/* DAW Toolbar overlay */}
      <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 10,
          display: 'flex', gap: '8px', 
          background: 'rgba(20, 20, 25, 0.8)', padding: '6px', borderRadius: '8px',
          backdropFilter: 'blur(8px)', border: '1px solid var(--border-subtle)',
          opacity: hasSelection ? 1 : 0.5, pointerEvents: hasSelection ? 'auto' : 'none',
          transition: 'all 0.2s ease'
      }}>
        <button className="icon-btn tooltip" data-tooltip="Cut Selection" onClick={executeCut} style={{ padding: '6px' }}>
          <Scissors size={14} />
        </button>
        <button className="icon-btn tooltip" data-tooltip="Fade In" onClick={() => executeFade('in')} style={{ padding: '6px' }}>
          <FastForward size={14} />
        </button>
        <button className="icon-btn tooltip" data-tooltip="Fade Out" onClick={() => executeFade('out')} style={{ padding: '6px' }}>
          <Rewind size={14} />
        </button>
        <button className="icon-btn tooltip" data-tooltip="Lower Volume (-6dB)" onClick={() => executeGain(0.5)} style={{ padding: '6px' }}>
          <Volume1 size={14} />
        </button>
      </div>

      <span className="waveform-label" style={{ right: 8, left: 'auto' }}>
        {hasSelection ? 'Shift+Click to Select' : 'Timeline'}
      </span>
      
      <div className="waveform-wrapper" ref={containerRef} style={{ height: '140px' }}>
        <canvas 
          ref={canvasRef} 
          style={{ width: '100%', height: '100%', display: 'block', cursor: isSelecting ? 'crosshair' : 'text' }} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
    </div>
  );
}
