import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { DEFAULT_TEMPO, DEFAULT_TIME_SIGNATURE, DEFAULT_KEY, INSTRUMENTS } from '../utils/constants';

const AppContext = createContext(null);

const initialState = {
  // Audio
  audioFile: null,
  audioBuffer: null,
  fileName: '',
  duration: 0,

  // Playback
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1.0,
  volume: 0.8,
  isLooping: false,

  // Transcription
  isTranscribing: false,
  transcriptionProgress: 0,
  transcriptionStep: '',
  notes: [],
  beats: [],
  detectedTempo: DEFAULT_TEMPO,

  // Editing
  selectedNotes: [],
  sensitivity: 50,
  clipboard: [],

  // Score settings
  instrument: INSTRUMENTS[0],
  viewMode: 'sheet', // 'sheet' | 'tab' | 'piano' | 'lyrics'
  tempo: DEFAULT_TEMPO,
  timeSignature: DEFAULT_TIME_SIGNATURE,
  keySignature: DEFAULT_KEY,
  measures: [],

  // UI
  showExportDialog: false,
  showSettings: false,
  activeTool: 'select', // 'select' | 'pencil' | 'eraser' | 'slice'
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_AUDIO':
      return {
        ...state,
        audioFile: action.payload.file,
        audioBuffer: action.payload.buffer,
        fileName: action.payload.name,
        duration: action.payload.duration,
        notes: [],
        beats: [],
        measures: [],
        selectedNotes: [],
        currentTime: 0,
      };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.payload };

    case 'SET_VOLUME':
      return { ...state, volume: action.payload };

    case 'SET_LOOPING':
      return { ...state, isLooping: action.payload };

    case 'START_TRANSCRIPTION':
      return {
        ...state,
        isTranscribing: true,
        transcriptionProgress: 0,
        transcriptionStep: 'Analyzing audio...',
      };

    case 'UPDATE_TRANSCRIPTION_PROGRESS':
      return {
        ...state,
        transcriptionProgress: action.payload.progress,
        transcriptionStep: action.payload.step,
      };

    case 'SET_TRANSCRIPTION_RESULT':
      return {
        ...state,
        isTranscribing: false,
        transcriptionProgress: 100,
        notes: action.payload.notes,
        beats: action.payload.beats,
        detectedTempo: action.payload.tempo,
        tempo: action.payload.tempo,
        measures: action.payload.measures,
      };

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'SET_SENSITIVITY':
      return { ...state, sensitivity: action.payload };

    case 'SET_SELECTED_NOTES':
      return { ...state, selectedNotes: action.payload };

    case 'COPY_NOTES':
      return { ...state, clipboard: [...state.selectedNotes] };

    case 'PASTE_NOTES':
      if (state.clipboard.length === 0) return state;
      const pasteOffset = action.payload.time || state.currentTime;
      const clipStart = Math.min(...state.clipboard.map(n => n.startTime));
      const pastedNotes = state.clipboard.map((n, i) => ({
        ...n,
        id: `pasted-${Date.now()}-${i}`,
        startTime: n.startTime - clipStart + pasteOffset,
        endTime: n.endTime - clipStart + pasteOffset,
      }));
      return { ...state, notes: [...state.notes, ...pastedNotes] };

    case 'DELETE_SELECTED':
      const selectedIds = new Set(state.selectedNotes.map(n => n.id));
      return {
        ...state,
        notes: state.notes.filter(n => !selectedIds.has(n.id)),
        selectedNotes: [],
      };

    case 'SET_INSTRUMENT':
      return { ...state, instrument: action.payload };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };

    case 'SET_TEMPO':
      return { ...state, tempo: action.payload };

    case 'SET_TIME_SIGNATURE':
      return { ...state, timeSignature: action.payload };

    case 'SET_KEY_SIGNATURE':
      return { ...state, keySignature: action.payload };

    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.payload };

    case 'TOGGLE_EXPORT_DIALOG':
      return { ...state, showExportDialog: !state.showExportDialog };

    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings };

    case 'INSERT_MEASURE':
      return { ...state, measures: [...state.measures, action.payload] };

    case 'REMOVE_MEASURE':
      return {
        ...state,
        measures: state.measures.filter((_, i) => i !== action.payload),
      };

    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload.changes } : n
        ),
      };

    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, getAudioContext, sourceNodeRef }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

export default AppContext;
