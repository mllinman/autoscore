import React, { useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { TranscriptionManager } from '../engine/TranscriptionManager';
import { SpectrogramEngine } from '../engine/SpectrogramEngine';
import { setTranscriptionManager } from './NoteEditor';
import { midiToNoteName } from '../utils/musicTheory';
import { Upload, Sparkles, Music, Guitar, Zap, FileAudio } from 'lucide-react';

const SUPPORTED_AUDIO = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg',
  'audio/x-wav', 'audio/x-flac', 'audio/vorbis', 'audio/webm'];
const SUPPORTED_EXT = ['.wav', '.mp3', '.flac', '.ogg', '.mid', '.midi', '.xml', '.musicxml'];

// Expose the transcription manager for NoteEditor re-quantization
export let transcriptionManager = null;

export default function AudioUploader() {
  const { state, dispatch, getAudioContext } = useApp();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const processFile = useCallback(async (file, settings = null) => {
    const effectiveSettings = settings || state.fileSettings;

    // Validate file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const isAudio = SUPPORTED_AUDIO.includes(file.type) || ['.wav', '.mp3', '.flac', '.ogg'].includes(ext);
    const isMidi = ['.mid', '.midi'].includes(ext);
    const isXml = ['.xml', '.musicxml'].includes(ext);

    if (!isAudio && !isMidi && !isXml) {
      alert('Unsupported file format. Please use WAV, MP3, FLAC, OGG, MIDI, or MusicXML.');
      return;
    }

    if (isMidi || isXml) {
      // For MIDI/XML, just store the file for now
      dispatch({ type: 'SET_AUDIO', payload: { file, buffer: null, name: file.name, duration: 0 } });
      return;
    }

    // Decode audio
    try {
      const audioCtx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      dispatch({
        type: 'SET_AUDIO',
        payload: {
          file,
          buffer: audioBuffer,
          name: file.name,
          duration: audioBuffer.duration,
        },
      });

      // Auto-transcribe if processing mode is findNotes
      if (effectiveSettings.processingMode === 'findNotes') {
        dispatch({ type: 'START_TRANSCRIPTION' });

        const mgr = new TranscriptionManager();
        transcriptionManager = mgr;
        setTranscriptionManager(mgr);

        try {
          const result = await mgr.transcribe(
            audioBuffer,
            state.sensitivity,
            ({ progress, step }) => {
              dispatch({ type: 'UPDATE_TRANSCRIPTION_PROGRESS', payload: { progress, step } });
            }
          );

          // Generate candidate notes (lower confidence pitched frames)
          const candidateNotes = generateCandidateNotes(mgr.rawPitchData, result.notes, result.tempo);

          dispatch({
            type: 'SET_TRANSCRIPTION_RESULT',
            payload: {
              notes: result.notes,
              candidateNotes,
              beats: result.beats,
              tempo: result.tempo,
              timeSignature: result.timeSignature,
              measures: result.measures,
            },
          });
        } catch (err) {
          console.error('Transcription failed:', err);
          dispatch({ type: 'SET_TRANSCRIPTION_RESULT', payload: { notes: [], candidateNotes: [], beats: [], tempo: 120, timeSignature: { num: 4, den: 4 }, measures: [] } });
        }
      }

      // Compute spectrogram in background
      SpectrogramEngine.compute(audioBuffer, {
        fftSize: effectiveSettings.frequencyResolution,
        hopSize: effectiveSettings.timeStep,
      }).then(data => {
        dispatch({ type: 'SET_SPECTROGRAM_DATA', payload: data });
      }).catch(err => console.error('Spectrogram failed:', err));

    } catch (err) {
      console.error('Audio decode error:', err);
      alert('Error decoding audio file. Try converting it to WAV format.');
    }
  }, [dispatch, getAudioContext, state.sensitivity, state.fileSettings]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  }, [processFile]);

  // If audio is already loaded, don't show uploader
  if (state.audioBuffer) return null;

  return (
    <div className="uploader-page">
      <div className="uploader-content">
        <div className="uploader-branding">
          <div className="brand-sparkle">
            <Sparkles size={28} />
          </div>
          <h1>Transform Audio into Music</h1>
          <p>Drop an audio file to automatically detect notes, beats, and instruments.
             AutoScore uses advanced algorithms to create sheet music, tablature, and MIDI.</p>
        </div>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="drop-zone-icon">
            <Upload size={24} />
          </div>
          <div className="drop-zone-text">
            <strong>Drop audio file here or click to browse</strong>
            <span>Upload a .wav or .mp3 file to get started</span>
          </div>
          <div className="format-badges">
            {['.WAV', '.MP3', '.FLAC', '.OGG'].map(fmt => (
              <span key={fmt} className="format-badge">{fmt}</span>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.flac,.ogg,.mid,.midi,.xml,.musicxml"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        <div className="feature-cards">
          <div className="feature-card">
            <div className="feature-icon"><Music size={20} /></div>
            <strong>Sheet Music</strong>
            <span>Standard notation</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Guitar size={20} /></div>
            <strong>Guitar Tabs</strong>
            <span>Tablature format</span>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Zap size={20} /></div>
            <strong>AI Detection</strong>
            <span>Auto note finding</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate candidate notes from pitch data that weren't selected as primary notes
 */
function generateCandidateNotes(pitchData, selectedNotes, tempo) {
  if (!pitchData || pitchData.length === 0) return [];

  const candidates = [];
  const beatDuration = 60 / tempo;
  let currentCandidate = null;

  for (const frame of pitchData) {
    if (!frame.hasPitch) {
      if (currentCandidate) {
        currentCandidate.endTime = frame.time;
        currentCandidate.duration = currentCandidate.endTime - currentCandidate.startTime;
        if (currentCandidate.duration > 0.05 && currentCandidate.duration < 4) {
          candidates.push(currentCandidate);
        }
        currentCandidate = null;
      }
      continue;
    }

    // Check if this frame is already in a selected note
    const midi = Math.round(12 * Math.log2(frame.frequency / 440) + 69);
    const isSelected = selectedNotes.some(n =>
      n.midi === midi && frame.time >= n.startTime && frame.time <= n.endTime
    );

    if (!isSelected && frame.confidence > 0.4 && frame.confidence < 0.7) {
      if (!currentCandidate || Math.abs(currentCandidate.midi - midi) > 1) {
        if (currentCandidate) {
          currentCandidate.endTime = frame.time;
          currentCandidate.duration = currentCandidate.endTime - currentCandidate.startTime;
          if (currentCandidate.duration > 0.05) candidates.push(currentCandidate);
        }
        currentCandidate = {
          id: `candidate-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          midi,
          noteName: midiToNoteName(midi),
          frequency: frame.frequency,
          startTime: frame.time,
          endTime: frame.time,
          duration: 0,
          confidence: frame.confidence,
          isCandidate: true,
          group: 0,
        };
      }
    } else if (currentCandidate) {
      currentCandidate.endTime = frame.time;
      currentCandidate.duration = currentCandidate.endTime - currentCandidate.startTime;
      if (currentCandidate.duration > 0.05) candidates.push(currentCandidate);
      currentCandidate = null;
    }
  }

  return candidates.slice(0, 200); // Cap to avoid performance issues
}
