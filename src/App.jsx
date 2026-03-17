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
import LyricsViewer from './components/LyricsViewer';
import NoteEditor from './components/NoteEditor';
import ExportDialog from './components/ExportDialog';
import { Music, Guitar, Piano, Type } from 'lucide-react';

const viewTabs = [
  { id: 'sheet', label: 'Sheet Music', icon: Music },
  { id: 'tab', label: 'Tablature', icon: Guitar },
  { id: 'piano', label: 'Piano Roll', icon: Piano },
  { id: 'lyrics', label: 'Lyrics', icon: Type },
];

export default function App() {
  const { state, dispatch } = useApp();

  const renderMainContent = () => {
    switch (state.viewMode) {
      case 'sheet':
        return <SheetMusicViewer />;
      case 'tab':
        return <TablatureViewer />;
      case 'piano':
        return <PianoRollEditor />;
      case 'lyrics':
        return <LyricsViewer />;
      default:
        return <SheetMusicViewer />;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header />

      {/* Main workspace */}
      {!state.audioBuffer ? (
        /* Landing / Upload page */
        <div className="workspace" style={{ flex: 1 }}>
          <AudioUploader />
        </div>
      ) : (
        /* Editor workspace with resizable panels */
        <div className="workspace" style={{ flex: 1 }}>
          <PanelGroup direction="horizontal" autoSaveId="autoscore-layout">
            {/* Left Sidebar */}
            <Panel defaultSize={14} minSize={10} maxSize={25}>
              <Sidebar />
            </Panel>

            <PanelResizeHandle className="resize-handle" />

            {/* Main Editor */}
            <Panel defaultSize={62} minSize={40}>
              <div className="main-panel">
                {/* Tab Bar */}
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
                </div>

                {/* Waveform */}
                <WaveformViewer />

                {/* Notation Area */}
                <div className="notation-area">
                  <div className="notation-canvas-wrapper">
                    {renderMainContent()}
                  </div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="resize-handle" />

            {/* Right Properties Panel */}
            <Panel defaultSize={24} minSize={16} maxSize={35}>
              <NoteEditor />
            </Panel>
          </PanelGroup>
        </div>
      )}

      {/* Playback Controls (bottom bar) */}
      <PlaybackControls />

      {/* Processing Overlay */}
      {state.isTranscribing && (
        <div className="processing-overlay">
          <div className="processing-spinner" />
          <div className="processing-text">{state.transcriptionStep}</div>
          <div className="processing-progress">
            <div
              className="processing-progress-fill"
              style={{ width: `${state.transcriptionProgress}%` }}
            />
          </div>
          <div className="processing-subtitle">
            {state.transcriptionProgress}% complete
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog />
    </div>
  );
}
