import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useApp } from './context/AppContext';
import { useLayout } from './context/LayoutContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AudioUploader from './components/AudioUploader';
import WaveformViewer from './components/WaveformViewer';
import PlaybackControls from './components/PlaybackControls';
import NoteEditor from './components/NoteEditor';
import MeasureEditingMode from './components/MeasureEditingMode';
import ExportDialog from './components/ExportDialog';
import OpenFileDialog from './components/OpenFileDialog';
import SettingsDialog from './components/SettingsDialog';
import ChannelStrip from './components/daw/ChannelStrip';
import PropertiesInspector from './components/daw/PropertiesInspector';
import PluginTabs from './components/daw/PluginTabs';
import DockZone from './components/daw/DockZone';
import { LayoutList } from 'lucide-react';

export default function App() {
  const { state, dispatch } = useApp();
  const { layout, layoutDispatch } = useLayout();

  // Sync Accent Color to CSS variables
  React.useEffect(() => {
    const root = document.documentElement;
    const accent = state.preferences.accentColor || '#7c5cfc';
    root.style.setProperty('--accent-primary', accent);
    root.style.setProperty('--accent-glow', `${accent}40`);
    root.style.setProperty('--border-hover', `${accent}66`);
  }, [state.preferences.accentColor]);

  // Handle file from OpenFileDialog
  const handleFileReady = async (file, settings) => {
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

        const result = await mgr.transcribe(
          audioBuffer,
          state.sensitivity,
          state.preferences.advancedDSP,
          ({ progress, step }) => {
            dispatch({ type: 'UPDATE_TRANSCRIPTION_PROGRESS', payload: { progress, step } });
          }
        );

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

  const renderRightPanel = () => {
    if (state.editMode === 'measure') {
      return <MeasureEditingMode />;
    }
    return <NoteEditor />;
  };

  return (
    <div className="app-container daw-layout">
      <Header />

      {!state.audioBuffer ? (
        <div className="workspace" style={{ flex: 1 }}>
          <AudioUploader />
        </div>
      ) : (
        <div className="workspace daw-workspace" style={{ flex: 1 }}>
          <PanelGroup direction="horizontal" autoSaveId="daw-layout-h">
            {/* ==== LEFT ZONE: Channels + Properties + Tools ==== */}
            <Panel defaultSize={20} minSize={12} maxSize={30}>
              <DockZone zone="left">
                <PanelGroup direction="vertical" autoSaveId="daw-left-v">
                  {/* Channel Strip */}
                  <Panel defaultSize={40} minSize={20}>
                    <div className="daw-panel-wrapper">
                      <div className="daw-panel-label">
                        <span>CHANNELS</span>
                      </div>
                      <div className="daw-panel-body">
                        <ChannelStrip />
                      </div>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="resize-handle-h" />

                  {/* Properties Inspector */}
                  <Panel defaultSize={35} minSize={15}>
                    <div className="daw-panel-wrapper">
                      <div className="daw-panel-label">
                        <span>PROPERTIES</span>
                      </div>
                      <div className="daw-panel-body">
                        <PropertiesInspector />
                      </div>
                    </div>
                  </Panel>
                  <PanelResizeHandle className="resize-handle-h" />

                  {/* Tools */}
                  <Panel defaultSize={25} minSize={15}>
                    <div className="daw-panel-wrapper">
                      <div className="daw-panel-label">
                        <span>TOOLS</span>
                      </div>
                      <div className="daw-panel-body">
                        <Sidebar />
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </DockZone>
            </Panel>
            <PanelResizeHandle className="resize-handle-v" />

            {/* ==== CENTER ZONE: Timeline + Bottom Dock ==== */}
            <Panel defaultSize={55} minSize={35}>
              <DockZone zone="center">
                <PanelGroup direction="vertical" autoSaveId="daw-center-v">
                  {/* Main Timeline / Waveform */}
                  <Panel defaultSize={100} minSize={40}>
                    <div className="daw-panel-wrapper center-panel">
                      <div className="daw-panel-label">
                        <span>TIMELINE</span>
                        <div className="timeline-mode-indicator">
                          <LayoutList size={11} />
                          <span>{state.editMode === 'note' ? 'Note Mode' : 'Measure Mode'}</span>
                        </div>
                      </div>
                      <div className="daw-panel-body timeline-body">
                        <WaveformViewer />
                        <div className="timeline-content-area">
                          {renderRightPanel()}
                        </div>
                      </div>
                    </div>
                  </Panel>
                </PanelGroup>
              </DockZone>
            </Panel>
            <PanelResizeHandle className="resize-handle-v" />

            {/* ==== RIGHT ZONE: Plugins + Sorted Tabs ==== */}
            <Panel defaultSize={25} minSize={16} maxSize={40}>
              <DockZone zone="right">
                <div className="daw-panel-wrapper right-panel">
                  <PluginTabs />
                </div>
              </DockZone>
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
      <SettingsDialog />
    </div>
  );
}
