import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useApp } from './context/AppContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AudioUploader from './components/AudioUploader';
import WaveformViewer from './components/WaveformViewer';
import PlaybackControls from './components/PlaybackControls';
import SheetMusicViewer from './components/SheetMusicViewer';
import TablatureViewer from './components/TablatureViewer';
import PianoRollEditor from './components/PianoRollEditor';
import SpectrogramViewer from './components/SpectrogramViewer';
import LyricsViewer from './components/LyricsViewer';
import NoteEditor from './components/NoteEditor';
import MeasureEditingMode from './components/MeasureEditingMode';
import ExportDialog from './components/ExportDialog';
import OpenFileDialog from './components/OpenFileDialog';
import { Music, Guitar, Piano, BarChart3, Type, LayoutList } from 'lucide-react';

const viewTabs = [
  { id: 'sheet', label: 'Sheet Music', icon: Music },
  { id: 'tab', label: 'Tablature', icon: Guitar },
  { id: 'piano', label: 'Piano Roll', icon: Piano },
  { id: 'spectrogram', label: 'Spectrogram', icon: BarChart3 },
  { id: 'lyrics', label: 'Lyrics', icon: Type },
];

export default function App() {
  const { state, dispatch } = useApp();

  const renderMainContent = () => {
    switch (state.viewMode) {
      case 'sheet': return <SheetMusicViewer />;
      case 'tab': return <TablatureViewer />;
      case 'piano': return <PianoRollEditor />;
      case 'spectrogram': return <SpectrogramViewer />;
      case 'lyrics': return <LyricsViewer />;
      default: return <SheetMusicViewer />;
    }
  };

  const renderRightPanel = () => {
    if (state.editMode === 'measure') {
      return <MeasureEditingMode />;
    }
    return <NoteEditor />;
  };

  // Handle file from OpenFileDialog
  const handleFileReady = async (file, settings) => {
    // The AudioUploader's processFile logic is re-used here
    // We dispatch the open dialog close and trigger file processing
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
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

      dispatch({ type: 'SET_FILE_SETTINGS', payload: settings });

      if (settings.processingMode === 'findNotes') {
        dispatch({ type: 'START_TRANSCRIPTION' });
        const { TranscriptionManager } = await import('./engine/TranscriptionManager');
        const mgr = new TranscriptionManager();
        const { setTranscriptionManager } = await import('./components/NoteEditor');
        setTranscriptionManager(mgr);

        const result = await mgr.transcribe(audioBuffer, state.sensitivity, ({ progress, step }) => {
          dispatch({ type: 'UPDATE_TRANSCRIPTION_PROGRESS', payload: { progress, step } });
        });

        dispatch({
          type: 'SET_TRANSCRIPTION_RESULT',
          payload: {
            notes: result.notes,
            candidateNotes: [],
            beats: result.beats,
            tempo: result.tempo,
            timeSignature: result.timeSignature,
            measures: result.measures,
          },
        });
      }

      // Compute spectrogram
      const { SpectrogramEngine } = await import('./engine/SpectrogramEngine');
      SpectrogramEngine.compute(audioBuffer, {
        fftSize: settings.frequencyResolution,
        hopSize: settings.timeStep,
      }).then(data => {
        dispatch({ type: 'SET_SPECTROGRAM_DATA', payload: data });
      });
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Error processing file. Try a different format.');
    }
  };

  return (
    <div className="app-container">
      <Header />

      {!state.audioBuffer ? (
        <div className="workspace" style={{ flex: 1 }}>
          <AudioUploader />
        </div>
      ) : (
        <div className="workspace" style={{ flex: 1 }}>
          <PanelGroup direction="horizontal" autoSaveId="autoscore-layout">
            {/* Sidebar */}
            <Panel defaultSize={14} minSize={10} maxSize={25}>
              <Sidebar />
            </Panel>
            <PanelResizeHandle className="resize-handle" />

            {/* Main editor */}
            <Panel defaultSize={62} minSize={40}>
              <div className="main-panel">
                {/* Tab bar */}
                <div className="tab-bar">
                  {viewTabs.map(tab => (
                    <button
                      key={tab.id}
                      className={`tab ${state.viewMode === tab.id ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: tab.id })}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}

                  {/* Edit mode indicator */}
                  <div style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    padding: '0 var(--space-md)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                  }}>
                    <LayoutList size={12} />
                    {state.editMode === 'note' ? 'Note Mode' : 'Measure Mode'}
                  </div>
                </div>

                {/* Waveform */}
                <WaveformViewer />

                {/* Notation / spectrogram area */}
                <div className="notation-area">
                  <div className="notation-canvas-wrapper">
                    {renderMainContent()}
                  </div>
                </div>
              </div>
            </Panel>
            <PanelResizeHandle className="resize-handle" />

            {/* Right: Properties / Measure editing */}
            <Panel defaultSize={24} minSize={16} maxSize={35}>
              <div style={{ height: '100%', overflowY: 'auto' }}>
                {renderRightPanel()}
              </div>
            </Panel>
          </PanelGroup>
        </div>
      )}

      <PlaybackControls />

      {/* Processing overlay */}
      {state.isTranscribing && (
        <div className="processing-overlay">
          <div className="processing-spinner" />
          <div className="processing-text">{state.transcriptionStep}</div>
          <div className="processing-progress">
            <div className="processing-progress-fill" style={{ width: `${state.transcriptionProgress}%` }} />
          </div>
          <div className="processing-subtitle">{state.transcriptionProgress}% complete</div>
        </div>
      )}

      {/* Modals */}
      <ExportDialog />
      <OpenFileDialog onFileReady={handleFileReady} />
    </div>
  );
}
