import React, { useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useApp } from './context/AppContext';
import { useLayout } from './context/LayoutContext';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import AudioUploader from './components/AudioUploader';
import PlaybackControls from './components/PlaybackControls';
import ExportDialog from './components/ExportDialog';
import OpenFileDialog from './components/OpenFileDialog';
import SettingsDialog from './components/SettingsDialog';

import ChannelStrip from './components/daw/ChannelStrip';
import PropertiesInspector from './components/daw/PropertiesInspector';
import PluginTabs from './components/daw/PluginTabs';
import DockZone from './components/daw/DockZone';
import DockablePanel from './components/daw/DockablePanel';
import TimelinePanel from './components/daw/TimelinePanel';
import NotationTabs from './components/daw/NotationTabs';
import VirtualFretboard from './components/daw/VirtualFretboard';
import DrumPad from './components/daw/DrumPad';

import { Menu, Sliders, Settings, PenTool, LayoutList, Music, Plug, Mic, Radio } from 'lucide-react';
import { MidiManager } from './engine/MidiManager';
import { AutoSaveManager } from './engine/AutoSaveManager';

const PANEL_CONFIG = {
  header: { component: Header, title: 'MAIN MENU', icon: Menu, noPadding: true, collapsible: false, closable: false },
  channels: { component: ChannelStrip, title: 'CHANNELS', icon: Sliders },
  properties: { component: PropertiesInspector, title: 'PROPERTIES', icon: Settings },
  tools: { component: Sidebar, title: 'TOOLS', icon: PenTool, noPadding: true },
  timeline: { component: TimelinePanel, title: 'TIMELINE', icon: LayoutList, noPadding: true, collapsible: false, closable: false },
  notations: { component: NotationTabs, title: 'NOTATION & VIEWS', icon: Music, noPadding: true },
  plugins: { component: PluginTabs, title: 'PLUGINS', icon: Plug, noPadding: true },
  fretboard: { component: VirtualFretboard, title: 'VIRTUAL FRETBOARD', icon: Music },
  drumpad: { component: DrumPad, title: 'DRUM PAD', icon: Radio },
};

function ZoneRenderer({ zoneId, direction = 'vertical' }) {
  const { layout, layoutDispatch } = useLayout();
  // Filter panels by their visibility state before rendering
  const panels = (layout.zones[zoneId]?.panels || []).filter(
    (id) => layout.panelVisibility[id] !== false
  );

  if (panels.length === 0) {
    return (
      <DockZone zone={zoneId} className="empty-zone">
        <div className="empty-zone-text">Drop panels here</div>
      </DockZone>
    );
  }

  return (
    <DockZone zone={zoneId} className={`zone-${direction}`}>
      <PanelGroup direction={direction}>
        {panels.map((panelId, index) => {
          const config = PANEL_CONFIG[panelId];
          if (!config) return null;
          const Component = config.component;
          return (
            <React.Fragment key={panelId}>
              {index > 0 && <PanelResizeHandle className={`resize-handle-${direction === 'vertical' ? 'h' : 'v'}`} />}
              <Panel minSize={10}>
                 <DockablePanel
                   id={panelId}
                   title={config.title}
                   icon={config.icon}
                   noPadding={config.noPadding}
                   collapsible={config.collapsible !== false}
                   closable={config.closable !== false}
                   sourceZone={zoneId}
                   onClose={() => layoutDispatch({ type: 'SET_PANEL_VISIBILITY', payload: { panel: panelId, visible: false } })}
                 >
                   <Component />
                 </DockablePanel>
              </Panel>
            </React.Fragment>
          );
        })}
      </PanelGroup>
    </DockZone>
  );
}

export default function App() {
  const { state, dispatch } = useApp();
  const { layout, layoutDispatch } = useLayout();
  const midiManagerRef = React.useRef(null);

  // Initialize MIDI
  useEffect(() => {
    const initMidi = async () => {
      const mgr = new MidiManager(
        (note) => {
          // Note On
          if (state.isRecording) {
            dispatch({ type: 'APPEND_MIDI_NOTE', payload: { ...note, type: 'on' } });
          }
          if (state.stepInputMode) {
            // Step Entry logic would go here
            console.log('Step In:', note.pitch);
          }
        },
        (note) => {
          // Note Off
          if (state.isRecording) {
            dispatch({ type: 'APPEND_MIDI_NOTE', payload: { ...note, type: 'off' } });
          }
        }
      );
      const success = await mgr.initialize();
      if (success) {
        midiManagerRef.current = mgr;
        dispatch({ type: 'SET_MIDI_ENABLED', payload: true });
      }
    };
    initMidi();
  }, [state.isRecording, state.stepInputMode, dispatch]);

  // Initialize Auto-Save
  useEffect(() => {
    const autoSaver = new AutoSaveManager();
    autoSaver.start(() => {
      autoSaver.saveToLocal(state);
    });
    return () => autoSaver.stop();
  }, [state]);

  // Sync Accent Color to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const accent = state.preferences.accentColor || '#7c5cfc';
    root.style.setProperty('--accent-primary', accent);
    root.style.setProperty('--accent-glow', `${accent}40`);
    root.style.setProperty('--border-hover', `${accent}66`);
  }, [state.preferences.accentColor]);

  const handleFileReady = async (file, settings) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      dispatch({
        type: 'SET_AUDIO',
        payload: { file, buffer: audioBuffer, name: file.name, duration: audioBuffer.duration },
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
          ({ progress, step }) => dispatch({ type: 'UPDATE_TRANSCRIPTION_PROGRESS', payload: { progress, step } })
        );

        dispatch({
          type: 'SET_TRANSCRIPTION_RESULT',
          payload: {
            notes: result.notes,
            beats: result.beats,
            tempo: result.tempo,
            timeSignature: result.timeSignature,
            measures: result.measures,
          },
        });

        // Automatically configure layout to show Notations after transcription
        layoutDispatch({ type: 'SET_ACTIVE_SORTED_TAB', payload: 'sheet' });
        layoutDispatch({ type: 'SET_VIEW_MODE', payload: 'sheet' });
      }

      // Compute spectrogram
      const { SpectrogramEngine } = await import('./engine/SpectrogramEngine');
      SpectrogramEngine.compute(audioBuffer, {
        fftSize: settings.frequencyResolution,
        hopSize: settings.timeStep,
      }).then(data => dispatch({ type: 'SET_SPECTROGRAM_DATA', payload: data }));
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Error processing file. Try a different format.');
    }
  };

  return (
    <div className="app-container daw-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {!state.audioBuffer ? (
        <>
          <Header />
          <div className="workspace" style={{ flex: 1 }}>
            <AudioUploader />
          </div>
        </>
      ) : (
        <div className="workspace daw-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <PanelGroup direction="vertical">
            {/* ==== TOP ZONE ==== */}
            {layout.zones?.top?.panels?.length > 0 && (
              <>
                <Panel defaultSize={8} minSize={5} maxSize={15} style={{ zIndex: 50 }}>
                  <ZoneRenderer zoneId="top" direction="horizontal" />
                </Panel>
                <PanelResizeHandle className="resize-handle-h" />
              </>
            )}

            {/* ==== MAIN MIDDLE AREA ==== */}
            <Panel>
              <PanelGroup direction="horizontal">
                
                {/* ==== LEFT ZONE ==== */}
                {layout.zones?.left?.panels?.length > 0 && (
                  <>
                    <Panel defaultSize={20} minSize={12} maxSize={40}>
                      <ZoneRenderer zoneId="left" direction="vertical" />
                    </Panel>
                    <PanelResizeHandle className="resize-handle-v" />
                  </>
                )}

                {/* ==== CENTER ZONE ==== */}
                <Panel defaultSize={55} minSize={30}>
                  <ZoneRenderer zoneId="center" direction="vertical" />
                </Panel>

                {/* ==== RIGHT ZONE ==== */}
                {layout.zones?.right?.panels?.length > 0 && (
                  <>
                    <PanelResizeHandle className="resize-handle-v" />
                    <Panel defaultSize={25} minSize={15} maxSize={40}>
                      <ZoneRenderer zoneId="right" direction="vertical" />
                    </Panel>
                  </>
                )}

              </PanelGroup>
            </Panel>
            
            {/* ==== BOTTOM ZONE ==== */}
            {layout.zones?.bottom?.panels?.length > 0 && (
              <>
                <PanelResizeHandle className="resize-handle-h" />
                <Panel defaultSize={20} minSize={10} maxSize={50}>
                  <ZoneRenderer zoneId="bottom" direction="horizontal" />
                </Panel>
              </>
            )}
            
          </PanelGroup>
        </div>
      )}

      {state.audioBuffer && <PlaybackControls />}

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
