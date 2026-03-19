import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTime } from '../utils/musicTheory';
import {
  Play, Pause, Square, Repeat, SkipBack, SkipForward,
  Volume2, VolumeX, Gauge, Music, Headphones, Music2
} from 'lucide-react';

/**
 * PlaybackControls - Enhanced playback with music/notes/both modes,
 * playback regions, and note synthesis
 */
export default function PlaybackControls() {
  const { state, dispatch, getAudioContext, sourceNodeRef } = useApp();
  const [showSpeedPopup, setShowSpeedPopup] = useState(false);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const noteOscillatorsRef = useRef([]);
  const gainNodeRef = useRef(null);
  const noteGainRef = useRef(null);

  const { audioBuffer, isPlaying, currentTime, duration, playbackRate,
          volume, noteVolume, isLooping, playbackMode, playbackRegion } = state;

  // Determine playback range
  const getPlayRange = useCallback(() => {
    if (playbackRegion === 'selection' && state.selectionRange) {
      return { start: state.selectionRange.start, end: state.selectionRange.end };
    }
    if (playbackRegion === 'hereToEnd') {
      return { start: currentTime, end: duration };
    }
    return { start: 0, end: duration };
  }, [playbackRegion, state.selectionRange, currentTime, duration]);

  const stopAllNoteOscillators = useCallback(() => {
    for (const osc of noteOscillatorsRef.current) {
      try { osc.stop(); osc.disconnect(); } catch (_) {}
    }
    noteOscillatorsRef.current = [];
  }, []);

  const scheduleNotePlayback = useCallback((audioCtx, startTime, offset) => {
    if (playbackMode === 'music') return; // don't play notes in music-only mode

    stopAllNoteOscillators();

    if (!noteGainRef.current) {
      noteGainRef.current = audioCtx.createGain();
      noteGainRef.current.connect(audioCtx.destination);
    }
    noteGainRef.current.gain.value = noteVolume;

    const range = getPlayRange();

    for (const note of state.notes) {
      if (note.endTime < range.start || note.startTime > range.end) continue;

      // Check if note group is muted
      const groupId = note.group || 0;
      const group = state.noteGroups.find(g => g.id === groupId);
      if (group && group.muted) continue;

      const noteStart = Math.max(0, note.startTime - offset);
      const noteEnd = Math.max(0, note.endTime - offset);
      const noteDuration = noteEnd - noteStart;
      if (noteDuration <= 0) continue;

      const osc = audioCtx.createOscillator();
      osc.type = 'triangle'; // Softer than sine, more musical
      osc.frequency.value = note.frequency || 440 * Math.pow(2, (note.midi - 69) / 12);

      const noteGain = audioCtx.createGain();
      
      // ADSR Parameters
      const attackTime = 0.015;
      const decayTime = 0.1;
      const sustainLevel = 0.15;
      const releaseTime = 0.15;
      const peakVolume = 0.4;

      const startTimeScaled = audioCtx.currentTime + noteStart / playbackRate;
      const endTimeScaled = audioCtx.currentTime + noteEnd / playbackRate;
      const durationScaled = endTimeScaled - startTimeScaled;

      noteGain.gain.setValueAtTime(0, startTimeScaled);
      
      if (durationScaled > attackTime) {
        noteGain.gain.linearRampToValueAtTime(peakVolume, startTimeScaled + attackTime);
        
        if (durationScaled > attackTime + decayTime) {
          // Full ADSR
          noteGain.gain.exponentialRampToValueAtTime(Math.max(0.01, sustainLevel), startTimeScaled + attackTime + decayTime);
          noteGain.gain.setValueAtTime(sustainLevel, endTimeScaled);
        } else {
          // Note ends during decay phase
          const partialDecay = peakVolume - (peakVolume - sustainLevel) * ((durationScaled - attackTime) / decayTime);
          noteGain.gain.linearRampToValueAtTime(partialDecay, endTimeScaled);
        }
      } else {
        // Very short note, ends during attack phase
        noteGain.gain.linearRampToValueAtTime(peakVolume * (durationScaled / attackTime), endTimeScaled);
      }

      // Release Phase
      noteGain.gain.linearRampToValueAtTime(0, endTimeScaled + releaseTime);

      osc.connect(noteGain);
      noteGain.connect(noteGainRef.current);

      osc.start(startTimeScaled);
      osc.stop(endTimeScaled + releaseTime);
      noteOscillatorsRef.current.push(osc);
    }
  }, [state.notes, state.noteGroups, playbackMode, noteVolume, playbackRate, stopAllNoteOscillators, getPlayRange]);

  const play = useCallback(() => {
    if (!audioBuffer && state.notes.length === 0) return;

    const audioCtx = getAudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const range = getPlayRange();
    const offset = currentTime >= range.end ? range.start : Math.max(range.start, currentTime);
    startOffsetRef.current = offset;
    startTimeRef.current = audioCtx.currentTime;

    // Audio playback
    if (audioBuffer && playbackMode !== 'notes') {
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.stop(); } catch (_) {}
      }

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackRate;
      source.loop = isLooping;

      if (!gainNodeRef.current) {
        gainNodeRef.current = audioCtx.createGain();
        gainNodeRef.current.connect(audioCtx.destination);
      }
      gainNodeRef.current.gain.value = volume;

      source.connect(gainNodeRef.current);
      source.start(0, offset);
      sourceNodeRef.current = source;

      source.onended = () => {
        if (isLooping) return;
        dispatch({ type: 'SET_PLAYING', payload: false });
      };
    }

    // Note playback
    scheduleNotePlayback(audioCtx, audioCtx.currentTime, offset);

    dispatch({ type: 'SET_PLAYING', payload: true });

    // Animation loop for time tracking
    const animate = () => {
      const elapsed = (audioCtx.currentTime - startTimeRef.current) * playbackRate;
      const newTime = startOffsetRef.current + elapsed;
      const range = getPlayRange();

      if (newTime >= range.end) {
        if (isLooping) {
          startOffsetRef.current = range.start;
          startTimeRef.current = audioCtx.currentTime;
        } else {
          dispatch({ type: 'SET_CURRENT_TIME', payload: range.end });
          dispatch({ type: 'SET_PLAYING', payload: false });
          return;
        }
      }

      dispatch({ type: 'SET_CURRENT_TIME', payload: Math.min(newTime, range.end) });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [audioBuffer, currentTime, duration, playbackRate, volume, isLooping,
      playbackMode, getPlayRange, scheduleNotePlayback, dispatch, getAudioContext, sourceNodeRef]);

  const pause = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (_) {}
      sourceNodeRef.current = null;
    }
    stopAllNoteOscillators();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    dispatch({ type: 'SET_PLAYING', payload: false });
  }, [dispatch, sourceNodeRef, stopAllNoteOscillators]);

  const stop = useCallback(() => {
    pause();
    dispatch({ type: 'SET_CURRENT_TIME', payload: 0 });
  }, [pause, dispatch]);

  // Update gain when volume changes
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
  }, [volume]);

  useEffect(() => {
    if (noteGainRef.current) noteGainRef.current.gain.value = noteVolume;
  }, [noteVolume]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopAllNoteOscillators();
    };
  }, [stopAllNoteOscillators]);

  const seek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * duration;
    dispatch({ type: 'SET_CURRENT_TIME', payload: Math.max(0, Math.min(duration, newTime)) });
    if (isPlaying) {
      pause();
      setTimeout(() => play(), 50);
    }
  }, [duration, isPlaying, pause, play, dispatch]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const playbackModes = [
    { id: 'music', icon: Headphones, label: 'Music only' },
    { id: 'notes', icon: Music2, label: 'Notes only' },
    { id: 'both', icon: Music, label: 'Music + Notes' },
  ];

  return (
    <div className="playback-bar">
      {/* Left: Transport */}
      <div className="playback-left">
        <button className="btn btn-ghost btn-icon" onClick={stop} title="Stop">
          <Square size={14} />
        </button>
        <button className="btn btn-ghost btn-icon playback-play" onClick={isPlaying ? pause : play} title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className={`btn btn-ghost btn-icon ${isLooping ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_LOOPING', payload: !isLooping })} title="Loop">
          <Repeat size={14} />
        </button>
      </div>

      {/* Center: Progress bar */}
      <div className="playback-center">
        <span className="playback-time">{formatTime(currentTime)}</span>
        <div className="progress-bar" onClick={seek}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <div className="progress-handle" style={{ left: `${progress}%` }} />
        </div>
        <span className="playback-time">{formatTime(duration)}</span>
      </div>

      {/* Right: Controls */}
      <div className="playback-right">
        {/* Playback mode */}
        <div style={{ display: 'flex', gap: 1, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
          {playbackModes.map(mode => (
            <button
              key={mode.id}
              className={`btn btn-ghost btn-sm ${playbackMode === mode.id ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_PLAYBACK_MODE', payload: mode.id })}
              title={mode.label}
              style={{ borderRadius: 0, padding: '3px 6px', height: 24 }}
            >
              <mode.icon size={12} />
            </button>
          ))}
        </div>

        {/* Playback region */}
        <select
          className="select"
          style={{ width: 80, fontSize: 10, padding: '2px 4px', height: 24 }}
          value={state.playbackRegion}
          onChange={e => dispatch({ type: 'SET_PLAYBACK_REGION', payload: e.target.value })}
        >
          <option value="full">Full</option>
          <option value="hereToEnd">Here→End</option>
          <option value="selection">Selection</option>
        </select>

        {/* Speed */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSpeedPopup(!showSpeedPopup)}
            title="Playback speed"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10, height: 24 }}
          >
            <Gauge size={12} /> {playbackRate}×
          </button>
          {showSpeedPopup && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 4,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-sm)',
              zIndex: 50,
              minWidth: 120,
            }}>
              <input
                type="range"
                className="slider"
                min="25"
                max="200"
                value={playbackRate * 100}
                onChange={e => dispatch({ type: 'SET_PLAYBACK_RATE', payload: parseInt(e.target.value) / 100 })}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                <span>0.25×</span><span>1×</span><span>2×</span>
              </div>
            </div>
          )}
        </div>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Master Volume">
          <Volume2 size={12} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="range"
            className="slider"
            style={{ width: 50 }}
            min="0"
            max="100"
            value={volume * 100}
            onChange={e => dispatch({ type: 'SET_VOLUME', payload: parseInt(e.target.value) / 100 })}
          />
        </div>

        {/* Note volume */}
        {(playbackMode === 'notes' || playbackMode === 'both') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Note Synthesizer Volume">
            <Music2 size={12} style={{ color: 'var(--accent-tertiary)' }} />
            <input
              type="range"
              className="slider"
              style={{ width: 50 }}
              min="0"
              max="100"
              value={noteVolume * 100}
              onChange={e => dispatch({ type: 'SET_NOTE_VOLUME', payload: parseInt(e.target.value) / 100 })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
