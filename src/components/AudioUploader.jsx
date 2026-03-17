import React, { useCallback, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TranscriptionManager } from '../engine/TranscriptionManager';
import { Upload, Music, FileAudio, Sparkles } from 'lucide-react';

const transcriptionManager = new TranscriptionManager();

// Make it accessible for re-quantization
export { transcriptionManager };

export default function AudioUploader() {
  const { state, dispatch, getAudioContext } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav', 'audio/wave'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(file.type) && !['wav', 'mp3'].includes(ext)) {
      alert('Please upload a .wav or .mp3 file');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      dispatch({
        type: 'SET_AUDIO',
        payload: {
          file,
          buffer: audioBuffer,
          name: file.name,
          duration: audioBuffer.duration,
        },
      });

      // Start transcription automatically
      dispatch({ type: 'START_TRANSCRIPTION' });

      const result = await transcriptionManager.transcribe(
        audioBuffer,
        state.sensitivity,
        ({ progress, step }) => {
          dispatch({
            type: 'UPDATE_TRANSCRIPTION_PROGRESS',
            payload: { progress, step },
          });
        }
      );

      dispatch({
        type: 'SET_TRANSCRIPTION_RESULT',
        payload: result,
      });
    } catch (err) {
      console.error('Error processing audio:', err);
      alert('Error processing audio file. Please try a different file.');
      dispatch({ type: 'SET_TRANSCRIPTION_RESULT', payload: { notes: [], beats: [], tempo: 120, measures: [] } });
    }
  }, [dispatch, getAudioContext, state.sensitivity]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // If we already have audio loaded, don't show the landing
  if (state.audioBuffer) return null;

  return (
    <div className="upload-landing">
      <div className="upload-hero">
        <div style={{
          width: 80,
          height: 80,
          borderRadius: 'var(--radius-xl)',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-xl)',
          boxShadow: '0 0 40px var(--accent-glow)',
        }}>
          <Sparkles size={36} color="white" />
        </div>
        <h2>Transform Audio into Music</h2>
        <p>
          Drop an audio file to automatically detect notes, beats, and instruments.
          AutoScore uses advanced algorithms to create sheet music, tablature, and MIDI.
        </p>
      </div>

      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="drop-zone-icon">
          <Upload size={28} />
        </div>
        <div className="drop-zone-text">
          <strong>Drop audio file here or click to browse</strong>
          <span>Upload a .wav or .mp3 file to get started</span>
        </div>
        <div className="drop-zone-formats">
          <span className="format-badge">.WAV</span>
          <span className="format-badge">.MP3</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,audio/wav,audio/mpeg"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      <div style={{
        display: 'flex',
        gap: 'var(--space-xl)',
        marginTop: 'var(--space-lg)',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        {[
          { icon: Music, label: 'Sheet Music', desc: 'Standard notation' },
          { icon: FileAudio, label: 'Guitar Tabs', desc: 'Tablature format' },
          { icon: Sparkles, label: 'AI Detection', desc: 'Auto note finding' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-xs)',
            color: 'var(--text-tertiary)',
            fontSize: 'var(--text-sm)',
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon size={18} />
            </div>
            <strong style={{ color: 'var(--text-secondary)' }}>{label}</strong>
            <span style={{ fontSize: 'var(--text-xs)' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
