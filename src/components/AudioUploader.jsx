import React, { useCallback, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TranscriptionManager } from '../engine/TranscriptionManager';
import { SpectrogramEngine } from '../engine/SpectrogramEngine';
import { setTranscriptionManager } from './NoteEditor';
import { midiToNoteName } from '../utils/musicTheory';
import { Upload, Sparkles, Music, Guitar, Zap, FileAudio, Piano, Edit3, Play, Mic, Download, Type, Users, Settings, Plus, Check } from 'lucide-react';

const SUPPORTED_AUDIO = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg',
  'audio/x-wav', 'audio/x-flac', 'audio/vorbis', 'audio/webm'];
const SUPPORTED_EXT = ['.wav', '.mp3', '.flac', '.ogg', '.mid', '.midi', '.xml', '.musicxml'];

// Expose the transcription manager for NoteEditor re-quantization
export let transcriptionManager = null;

export default function AudioUploader() {
  const { state, dispatch, getAudioContext } = useApp();
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Phase 13: Instrument Select & Auto-Tab
  const [selectedInstrument, setSelectedInstrument] = useState('auto');
  const [createTab, setCreateTab] = useState(false);

  // Auto-enable Create Tab if a stringed instrument is chosen
  const handleInstrumentChange = (e) => {
    const val = e.target.value;
    setSelectedInstrument(val);
    if (val === 'guitar_acoustic' || val === 'guitar_electric' || val === 'bass') {
      setCreateTab(true);
    } else {
      setCreateTab(false);
    }
  };

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

      // Phase 13: Auto-Routing
      if (createTab && ['guitar_acoustic', 'guitar_electric', 'bass'].includes(selectedInstrument)) {
        dispatch({ type: 'SET_VIEW_MODE', payload: 'tab' });
      } else {
        // Explicitly set it back to sheet just in case
        dispatch({ type: 'SET_VIEW_MODE', payload: 'sheet' });
      }

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
    <div className="landing-page-container">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="brand-logo-large">
            <Sparkles size={32} />
          </div>
          <h1>Transform Audio into Music</h1>
          <p className="hero-subtitle">
            Automatically create sheet music from an audio file - MP3, WAV, OGG, FLAC and M4A. AutoScore uses advanced algorithms to create standard notation, tablature, and MIDI.
          </p>

          <div
            className={`landing-drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-zone-icon-large">
              <Upload size={32} />
            </div>
            <div className="drop-zone-text-large">
              <strong>Drop audio file here or click to browse</strong>
              <span>Upload a supported file to start transcribing</span>
            </div>
            <div className="format-badges">
              {['.WAV', '.MP3', '.FLAC', '.OGG', '.MIDI', '.XML'].map(fmt => (
                <span key={fmt} className="format-badge">{fmt}</span>
              ))}
            </div>

            {/* Phase 13: Instrument Select & Auto Tab Options */}
            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
              <select 
                className="select" 
                value={selectedInstrument} 
                onChange={handleInstrumentChange}
                style={{ width: '200px' }}
              >
                <option value="auto">Auto-Detect Instrument</option>
                <option value="piano">Piano / Keys</option>
                <option value="guitar_acoustic">Acoustic Guitar</option>
                <option value="guitar_electric">Electric Guitar</option>
                <option value="bass">Bass Guitar</option>
                <option value="vocals">Vocals</option>
                <option value="drums">Drums / Percussion</option>
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={createTab} 
                  onChange={(e) => setCreateTab(e.target.checked)}
                />
                Create Tablature
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.flac,.ogg,.mid,.midi,.xml,.musicxml"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        </div>
      </section>

      {/* Primary Features Grid */}
      <section className="landing-section bg-secondary">
        <div className="section-content">
          <h2>Convert Your Audio File to Notation</h2>
          <p className="section-subtitle">Streamlined and user-friendly program to create musical notation or guitar tabs allows composers to write, save and print their music compositions on their computer.</p>
          
          <div className="features-grid-6">
            <div className="feature-card-v2">
              <div className="icon-wrapper primary"><Music size={24} /></div>
              <h3>Create Sheet Music</h3>
              <p>Piano, choral, guitar tabs & more</p>
            </div>
            <div className="feature-card-v2">
              <div className="icon-wrapper secondary"><Play size={24} /></div>
              <h3>MIDI & VSTi Playback</h3>
              <p>Piano, guitar & other instruments</p>
            </div>
            <div className="feature-card-v2">
              <div className="icon-wrapper tertiary"><Edit3 size={24} /></div>
              <h3>Edit Notes</h3>
              <p>Assign sharps, flats, slurs & more</p>
            </div>
            <div className="feature-card-v2">
              <div className="icon-wrapper primary"><FileAudio size={24} /></div>
              <h3>Convert Audio to Notes</h3>
              <p>Select a file and import as notation</p>
            </div>
            <div className="feature-card-v2">
              <div className="icon-wrapper secondary"><Type size={24} /></div>
              <h3>Add Lyrics</h3>
              <p>Easily add lyrics and verses</p>
            </div>
            <div className="feature-card-v2">
              <div className="icon-wrapper tertiary"><Download size={24} /></div>
              <h3>Export Music Score</h3>
              <p>Export as audio, image or PDF</p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Capabilities */}
      <section className="landing-section">
        <div className="section-content">
          <div className="split-layout">
            <div className="split-text">
              <h2>Intuitive Music Writing Software</h2>
              <p>Create, compose, and share your music with professional notation tools. Point and click to add notes and musical notation to the staff.</p>
              
              <ul className="feature-list">
                <li><Check size={16} /> Change the key signature and time signature</li>
                <li><Check size={16} /> Add whole, half, quarter, eighth, sixteenth and thirty-second notes and rests</li>
                <li><Check size={16} /> Create sheet music in Treble, Bass, Tenor or Alto Clefs</li>
                <li><Check size={16} /> Display note name in notes to help beginner musicians</li>
                <li><Check size={16} /> Write your own guitar tablature and percussion notation</li>
                <li><Check size={16} /> Assign sharp, flat and natural accidentals to notes</li>
                <li><Check size={16} /> Open and edit MusicXML files</li>
                <li><Check size={16} /> Change note colors - great for music teachers and lessons</li>
              </ul>
            </div>
            <div className="split-image-placeholder">
              <div className="glass-panel">
                <Music size={64} className="watermark-icon" />
                <div className="mock-ui">
                  <div className="mock-toolbar"></div>
                  <div className="mock-staff"></div>
                  <div className="mock-staff"></div>
                  <div className="mock-staff"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Composition Tools */}
      <section className="landing-section bg-secondary">
        <div className="section-content">
          <div className="split-layout reverse">
            <div className="split-text">
              <h2>Explore Advanced Composition Tools</h2>
              <p>The streamlined, easy-to-use interface makes it easy for students to learn the art of composing and music notation.</p>
              
              <ul className="feature-list">
                <li><Check size={16} /> Conveniently switch between notes and rests using keyboard shortcuts</li>
                <li><Check size={16} /> Insert text to specify a title, tempo, dynamics or lyrics</li>
                <li><Check size={16} /> Drag notes to change their pitch or placement</li>
                <li><Check size={16} /> Copy, cut and paste measures to easily insert themes</li>
                <li><Check size={16} /> Transcriber tool creates a visual representation of notes to aid transcribing</li>
                <li><Check size={16} /> Add pedal lines, octave lines, glissandi and tempo markings</li>
                <li><Check size={16} /> Auto formatting tools automatically clean up note placement</li>
              </ul>
            </div>
            <div className="split-image-placeholder">
               <div className="glass-panel dark">
                <Settings size={64} className="watermark-icon" />
                <div className="mock-ui config">
                  <div className="mock-slider"></div>
                  <div className="mock-slider"></div>
                  <div className="mock-button"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Practice Modes - New Section */}
      <section className="landing-section">
        <div className="section-content">
          <div className="center" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2>Multiple Ways to Practice</h2>
            <p className="section-subtitle">We convert audio into sheet music, piano roll, and guitar tabs. These can be exported in PDF, MIDI, MusicXML, or GuitarPro format.</p>
          </div>

          <div className="practice-features">
            {/* Sheet Music Practice */}
            <div className="split-layout">
              <div className="split-text">
                <h3><Music size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent-primary)' }}/> Sheet Music</h3>
                <p>Our AI technology picks out the notes from your audio and intelligently notates them on a musical staff, automatically detecting a wide range of musical features including time and key signature, trills, staccato, and other expressive markings.</p>
                <p>Sheet music is especially valuable for classically trained musicians, music students, music teachers, and composers.</p>
                <ul className="feature-list" style={{ marginTop: '24px' }}>
                  <li><Play size={16} /> Playback the score to hear the transcription</li>
                  <li><Settings size={16} /> Speed it up or slow it down to your liking</li>
                  <li><Edit3 size={16} /> Edit the transcription directly</li>
                </ul>
              </div>
              <div className="split-image-placeholder">
                <div className="glass-panel" style={{ height: '300px' }}>
                  <Music size={64} className="watermark-icon" />
                  <div className="mock-ui"><div className="mock-staff"></div><div className="mock-staff"></div></div>
                </div>
              </div>
            </div>

            <div style={{ margin: '60px 0', borderTop: '1px solid var(--border-subtle)' }}></div>

            {/* Piano Roll Practice */}
            <div className="split-layout reverse">
              <div className="split-text">
                <h3><Piano size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent-secondary)' }}/> Interactive Piano Roll</h3>
                <p>One of our output types is a MIDI file. Our interactive piano roll beautifully displays the notes as they fall onto the piano keyboard. Perfect for learning and practicing.</p>
                <p>This is best for musicians who may not have a lot of experience reading other notation formats, such as sheet music.</p>
                <ul className="feature-list" style={{ marginTop: '24px' }}>
                  <li><Check size={16} /> Split the notes into left and right hands</li>
                  <li><Settings size={16} /> Control the speed, transposition, colors, and more</li>
                  <li><Download size={16} /> Export as a MIDI file for use in your DAW</li>
                </ul>
              </div>
              <div className="split-image-placeholder">
                <div className="glass-panel dark" style={{ height: '300px' }}>
                  <Piano size={64} className="watermark-icon" />
                  <div className="mock-ui config">
                    <div style={{ display: 'flex', gap: '4px', height: '100%', alignItems: 'flex-end', paddingBottom: '20px' }}>
                      {[1,2,3,4,5].map(i => <div key={i} style={{ width: '20px', height: `${Math.random() * 80 + 20}%`, background: 'var(--accent-secondary)', borderRadius: '2px' }}></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ margin: '60px 0', borderTop: '1px solid var(--border-subtle)' }}></div>

            {/* Guitar Tabs Practice */}
            <div className="split-layout">
              <div className="split-text">
                <h3><Guitar size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--accent-tertiary)' }}/> Guitar Tabs</h3>
                <p>We're able to detect the notes from your acoustic guitar audio and notate them as guitar tabs, showing you exactly which finger to use for each note. Perfect for guitarists who want to know exactly how to play a song.</p>
                <ul className="feature-list" style={{ marginTop: '24px' }}>
                   <li><Play size={16} /> Playback the tabs to hear the transcription</li>
                   <li><Zap size={16} /> See exactly which finger to use for each note</li>
                   <li><Sparkles size={16} /> Interactive 3D system for practicing tabs (Rocksmith style)</li>
                   <li><Download size={16} /> Export as a PDF or GuitarPro file</li>
                </ul>
              </div>
              <div className="split-image-placeholder">
                <div className="glass-panel" style={{ height: '300px' }}>
                  <Guitar size={64} className="watermark-icon" />
                  <div className="mock-ui">
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
                      {[1,2,3,4,5,6].map(i => <div key={i} style={{ width: '100%', height: '2px', background: 'var(--border-strong)' }}></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ margin: '60px 0', borderTop: '1px solid var(--border-subtle)' }}></div>

            {/* Single Instrument Transcriptions */}
            <div className="center" style={{ textAlign: 'center' }}>
               <h3>Single Instrument Transcription</h3>
               <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '16px auto 0' }}>We currently support piano, guitar, bass, violin, flute, trumpet, saxophone, drums, and vocals, with more instruments coming soon!</p>
            </div>

          </div>
        </div>
      </section>

      {/* Target Audience / Styles */}
      <section className="landing-section">
        <div className="section-content center">
          <h2>Write Any Music Score</h2>
          <p className="section-subtitle">Compose music for a single instrument, a band or an orchestra.</p>
          
          <div className="styles-grid">
            <div className="style-card">
              <Music size={32} />
              <h4>Sheet Music</h4>
              <p>Standard notation for any instrument</p>
            </div>
            <div className="style-card">
              <Guitar size={32} />
              <h4>Guitar Tabs</h4>
              <p>Quickly create guitar tablature</p>
            </div>
            <div className="style-card">
              <Zap size={32} />
              <h4>Percussion</h4>
              <p>Write your own percussion notation</p>
            </div>
            <div className="style-card">
              <Type size={32} />
              <h4>Add Lyrics</h4>
              <p>Smoothly add lyrics to your score</p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Footer */}
      <section className="landing-section bg-tertiary call-to-action">
        <div className="section-content center">
          <h2>Compose, Arrange and Print Music for Any Instrument, Any Style</h2>
          <p>Whether you're learning music theory or composing a masterpiece, AutoScore supports every stage of your musical journey.</p>
          
          <div className="audience-tags">
            <span>Singer</span>
            <span>Drummer</span>
            <span>Guitarist</span>
            <span>Music Teacher</span>
            <span>Music Student</span>
            <span>Songwriter</span>
            <span>Concertmaster</span>
            <span>Pianist</span>
            <span>Lyricist</span>
            <span>Composer</span>
          </div>
        </div>
      </section>
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
