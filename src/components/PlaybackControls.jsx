import React, { useRef, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime } from '../utils/musicTheory';
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Repeat, Volume2, VolumeX, Gauge
} from 'lucide-react';

export default function PlaybackControls() {
  const { state, dispatch, getAudioContext, sourceNodeRef } = useApp();
  const gainNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const animFrameRef = useRef(null);

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    dispatch({ type: 'SET_PLAYING', payload: false });
  }, [dispatch, sourceNodeRef]);

  const startPlayback = useCallback(() => {
    if (!state.audioBuffer) return;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Stop any existing playback
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = state.audioBuffer;
    source.playbackRate.value = state.playbackRate;
    source.loop = state.isLooping;

    const gainNode = ctx.createGain();
    gainNode.gain.value = state.volume;
    gainNodeRef.current = gainNode;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    const offset = state.currentTime || 0;
    source.start(0, offset);
    sourceNodeRef.current = source;
    startTimeRef.current = ctx.currentTime - offset / state.playbackRate;

    dispatch({ type: 'SET_PLAYING', payload: true });

    // Update time position
    const updateTime = () => {
      if (!sourceNodeRef.current) return;
      const elapsed = (ctx.currentTime - startTimeRef.current) * state.playbackRate;
      const clamped = Math.min(elapsed, state.duration);

      dispatch({ type: 'SET_CURRENT_TIME', payload: clamped });

      if (clamped >= state.duration && !state.isLooping) {
        stopPlayback();
        dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
        return;
      }

      animFrameRef.current = requestAnimationFrame(updateTime);
    };

    animFrameRef.current = requestAnimationFrame(updateTime);

    source.onended = () => {
      if (!state.isLooping) {
        stopPlayback();
      }
    };
  }, [state.audioBuffer, state.currentTime, state.playbackRate, state.volume,
      state.isLooping, state.duration, dispatch, getAudioContext, sourceNodeRef, stopPlayback]);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) {
      // Save current time before stopping
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [state.isPlaying, stopPlayback, startPlayback]);

  // Update volume in real-time
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = state.volume;
    }
  }, [state.volume]);

  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * state.duration;
    dispatch({ type: 'SET_CURRENT_TIME', payload: newTime });

    if (state.isPlaying) {
      stopPlayback();
      setTimeout(() => startPlayback(), 50);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (e) {}
      }
    };
  }, [sourceNodeRef]);

  if (!state.audioBuffer) return null;

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="playback-bar">
      {/* Transport */}
      <div className="transport-controls">
        <button
          className="transport-btn"
          onClick={() => {
            dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
            if (state.isPlaying) { stopPlayback(); setTimeout(startPlayback, 50); }
          }}
          title="Skip to start"
        >
          <SkipBack size={16} />
        </button>

        <button className="transport-btn play-btn" onClick={togglePlay} title={state.isPlaying ? 'Pause' : 'Play'}>
          {state.isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
        </button>

        <button className="transport-btn" onClick={stopPlayback} title="Stop">
          <Square size={14} />
        </button>

        <button
          className={`transport-btn ${state.isLooping ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_LOOPING', payload: !state.isLooping })}
          title="Loop"
        >
          <Repeat size={16} />
        </button>
      </div>

      {/* Time display */}
      <div className="time-display">
        {formatTime(state.currentTime)} / {formatTime(state.duration)}
      </div>

      {/* Progress bar */}
      <div className="progress-bar-wrapper" onClick={handleProgressClick}>
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Tempo / Speed control */}
      <div className="tempo-control">
        <Gauge size={14} style={{ color: 'var(--text-tertiary)' }} />
        <label>Speed</label>
        <input
          type="range"
          className="slider"
          min="0.25"
          max="2"
          step="0.05"
          value={state.playbackRate}
          onChange={(e) => dispatch({ type: 'SET_PLAYBACK_RATE', payload: parseFloat(e.target.value) })}
        />
        <span className="tempo-value">{state.playbackRate.toFixed(2)}x</span>
      </div>

      {/* Volume */}
      <div className="volume-control">
        {state.volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <input
          type="range"
          className="slider"
          min="0"
          max="1"
          step="0.01"
          value={state.volume}
          onChange={(e) => dispatch({ type: 'SET_VOLUME', payload: parseFloat(e.target.value) })}
        />
      </div>
    </div>
  );
}
