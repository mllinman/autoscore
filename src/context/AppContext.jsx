import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { DEFAULT_TEMPO, DEFAULT_TIME_SIGNATURE, DEFAULT_KEY, INSTRUMENTS } from '../utils/constants';

const AppContext = createContext(null);

const initialState = {
  // Audio
  audioFile: null,
  audioBuffer: null,
  fileName: '',
  duration: 0,

  // File settings
  fileSettings: {
    processMode: 'full', // 'full' | 'section'
    sectionStart: 0,
    sectionEnd: 0,
    processingMode: 'findNotes', // 'findNotes' | 'spectrogramOnly'
    frequencyResolution: 2048,
    timeStep: 512,
  },

  // Global Preferences
  preferences: {
    theme: 'dark',
    accentColor: '#7c5cfc',
    notationStyle: 'standard', // 'standard' | 'jazz'
    autoSave: true,
    advancedDSP: {
      yinThreshold: 0.15,
      onsetSensitivity: 0.3,
      medianFilterWindow: 5,
    }
  },

  // Playback
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1.0,
  volume: 0.8,
  noteVolume: 0.6,
  isLooping: false,
  playbackMode: 'music', // 'music' | 'notes' | 'both'
  playbackRegion: 'full', // 'full' | 'selection' | 'hereToEnd'
  showPlaybackLine: true,
  selectionRange: null, // { start, end } in seconds

  // Transcription
  isTranscribing: false,
  transcriptionProgress: 0,
  transcriptionStep: '',
  notes: [],
  candidateNotes: [], // lower confidence notes shown as hints
  beats: [],
  detectedTempo: DEFAULT_TEMPO,

  // Spectrogram
  spectrogramData: null,
  showNoteLines: true,
  showHarmonicLines: false,

  // Stem Separation
  stems: null, // { vocals, bass, drums, other }

  // Vocal Tuning
  vocalTuning: {
    retuneSpeed: 50,
    amount: 100,
    scale: 'chromatic',
    key: 'C'
  },

  // Editing
  selectedNotes: [],
  sensitivity: 50,
  clipboard: [],
  editMode: 'note', // 'note' | 'measure'
  smallestNote: 'eighth', // 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'

  // Note groups
  noteGroups: [
    { id: 0, name: 'Group 1', partId: 0, visible: true, muted: false, color: '#7c5cfc' },
  ],
  activeNoteGroup: 0,
  lockedNoteIds: new Set(),
  showCandidateNotes: true,
  learnFromEdits: false,

  // Instrument Parts
  instrumentParts: [
    {
      id: 0,
      instrument: INSTRUMENTS[0],
      name: 'Piano',
      staffMode: 'treble', // 'treble' | 'bass' | 'both' | 'tablature'
      writtenTranspose: 0,
      noteRangeLow: 21,
      noteRangeHigh: 108,
      midiProgram: 0,
    },
  ],

  // Score settings
  instrument: INSTRUMENTS[0],
  viewMode: 'sheet', // 'sheet' | 'tab' | 'piano' | 'spectrogram' | 'lyrics'
  tempo: DEFAULT_TEMPO,
  timeSignature: DEFAULT_TIME_SIGNATURE,
  keySignature: DEFAULT_KEY,
  measures: [],
  scoreTitle: '',
  scoreTranspose: 0,
  simplifyScore: 0,

  // UI
  showExportDialog: false,
  showOpenDialog: false,
  showSettings: false,
  showFileMenu: false,
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
        candidateNotes: [],
        beats: [],
        measures: [],
        selectedNotes: [],
        currentTime: 0,
        spectrogramData: null,
      };

    case 'SET_FILE_SETTINGS':
      return { ...state, fileSettings: { ...state.fileSettings, ...action.payload } };

    case 'UPDATE_PREFERENCES':
      // Deep merge for preferences
      return { 
        ...state, 
        preferences: { 
          ...state.preferences, 
          ...action.payload,
          advancedDSP: {
            ...state.preferences.advancedDSP,
            ...(action.payload.advancedDSP || {})
          }
        } 
      };

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };

    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };

    case 'SET_PLAYBACK_RATE':
      return { ...state, playbackRate: action.payload };

    case 'SET_VOLUME':
      return { ...state, volume: action.payload };

    case 'SET_NOTE_VOLUME':
      return { ...state, noteVolume: action.payload };

    case 'SET_LOOPING':
      return { ...state, isLooping: action.payload };

    case 'SET_PLAYBACK_MODE':
      return { ...state, playbackMode: action.payload };

    case 'SET_PLAYBACK_REGION':
      return { ...state, playbackRegion: action.payload };

    case 'SET_SELECTION_RANGE':
      return { ...state, selectionRange: action.payload };

    case 'SET_SHOW_PLAYBACK_LINE':
      return { ...state, showPlaybackLine: action.payload };

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
        candidateNotes: action.payload.candidateNotes || [],
        beats: action.payload.beats,
        detectedTempo: action.payload.tempo,
        tempo: action.payload.tempo,
        measures: action.payload.measures,
      };

    case 'SET_SPECTROGRAM_DATA':
      return { ...state, spectrogramData: action.payload };

    case 'SET_SHOW_NOTE_LINES':
      return { ...state, showNoteLines: action.payload };

    case 'SET_SHOW_HARMONIC_LINES':
      return { ...state, showHarmonicLines: action.payload };

    case 'SET_STEMS':
      return { ...state, stems: action.payload };

    case 'UPDATE_VOCAL_TUNING':
      return { ...state, vocalTuning: { ...state.vocalTuning, ...action.payload } };

    case 'SET_NOTES':
      return { ...state, notes: action.payload };

    case 'SET_CANDIDATE_NOTES':
      return { ...state, candidateNotes: action.payload };

    case 'SET_SENSITIVITY':
      return { ...state, sensitivity: action.payload };

    case 'SET_SELECTED_NOTES':
      return { ...state, selectedNotes: action.payload };

    case 'SET_EDIT_MODE':
      return { ...state, editMode: action.payload };

    case 'SET_SMALLEST_NOTE':
      return { ...state, smallestNote: action.payload };

    case 'COPY_NOTES':
      return { ...state, clipboard: [...state.selectedNotes] };

    case 'PASTE_NOTES':
      if (state.clipboard.length === 0) return state;
      const pasteOffset = action.payload?.time || state.currentTime;
      const clipStart = Math.min(...state.clipboard.map(n => n.startTime));
      const pastedNotes = state.clipboard.map((n, i) => ({
        ...n,
        id: `pasted-${Date.now()}-${i}`,
        startTime: n.startTime - clipStart + pasteOffset,
        endTime: n.endTime - clipStart + pasteOffset,
      }));
      return { ...state, notes: [...state.notes, ...pastedNotes] };

    case 'DELETE_SELECTED': {
      const selectedIds = new Set(state.selectedNotes.map(n => n.id));
      return {
        ...state,
        notes: state.notes.filter(n => !selectedIds.has(n.id)),
        selectedNotes: [],
      };
    }

    // Note groups
    case 'SET_NOTE_GROUP_FOR_SELECTED': {
      const selIds = new Set(state.selectedNotes.map(n => n.id));
      return {
        ...state,
        notes: state.notes.map(n =>
          selIds.has(n.id) ? { ...n, group: action.payload } : n
        ),
      };
    }

    case 'SET_ACTIVE_NOTE_GROUP':
      return { ...state, activeNoteGroup: action.payload };

    case 'ADD_NOTE_GROUP':
      return {
        ...state,
        noteGroups: [...state.noteGroups, action.payload],
      };

    case 'REMOVE_NOTE_GROUP':
      return {
        ...state,
        noteGroups: state.noteGroups.filter(g => g.id !== action.payload),
      };

    case 'UPDATE_NOTE_GROUP':
      return {
        ...state,
        noteGroups: state.noteGroups.map(g =>
          g.id === action.payload.id ? { ...g, ...action.payload.changes } : g
        ),
      };

    case 'TOGGLE_NOTE_GROUP_VISIBLE':
      return {
        ...state,
        noteGroups: state.noteGroups.map(g =>
          g.id === action.payload ? { ...g, visible: !g.visible } : g
        ),
      };

    case 'TOGGLE_NOTE_GROUP_MUTED':
      return {
        ...state,
        noteGroups: state.noteGroups.map(g =>
          g.id === action.payload ? { ...g, muted: !g.muted } : g
        ),
      };

    case 'SET_SHOW_CANDIDATE_NOTES':
      return { ...state, showCandidateNotes: action.payload };

    case 'SET_LEARN_FROM_EDITS':
      return { ...state, learnFromEdits: action.payload };

    // Lock/unlock
    case 'TOGGLE_LOCK_SELECTED': {
      const newLocked = new Set(state.lockedNoteIds);
      for (const n of state.selectedNotes) {
        if (newLocked.has(n.id)) newLocked.delete(n.id);
        else newLocked.add(n.id);
      }
      return { ...state, lockedNoteIds: newLocked };
    }

    // Promote candidate note to real note
    case 'PROMOTE_CANDIDATE': {
      const candidate = state.candidateNotes.find(n => n.id === action.payload);
      if (!candidate) return state;
      return {
        ...state,
        notes: [...state.notes, { ...candidate, isCandidate: false }],
        candidateNotes: state.candidateNotes.filter(n => n.id !== action.payload),
      };
    }

    // Instrument parts
    case 'ADD_INSTRUMENT_PART':
      return {
        ...state,
        instrumentParts: [...state.instrumentParts, action.payload],
      };

    case 'REMOVE_INSTRUMENT_PART':
      return {
        ...state,
        instrumentParts: state.instrumentParts.filter(p => p.id !== action.payload),
      };

    case 'UPDATE_INSTRUMENT_PART':
      return {
        ...state,
        instrumentParts: state.instrumentParts.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.changes } : p
        ),
      };

    case 'REORDER_PARTS':
      return { ...state, instrumentParts: action.payload };

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

    case 'SET_SCORE_TITLE':
      return { ...state, scoreTitle: action.payload };

    case 'SET_SCORE_TRANSPOSE':
      return { ...state, scoreTranspose: action.payload };

    case 'SET_SIMPLIFY_SCORE':
      return { ...state, simplifyScore: action.payload };

    case 'TOGGLE_EXPORT_DIALOG':
      return { ...state, showExportDialog: !state.showExportDialog };

    case 'TOGGLE_OPEN_DIALOG':
      return { ...state, showOpenDialog: !state.showOpenDialog };

    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: !state.showSettings };

    case 'TOGGLE_FILE_MENU':
      return { ...state, showFileMenu: !state.showFileMenu };

    case 'CLOSE_FILE_MENU':
      return { ...state, showFileMenu: false };

    // Measure operations
    case 'SET_MEASURES':
      return { ...state, measures: action.payload };

    case 'INSERT_MEASURE': {
      const idx = action.payload.afterIndex;
      const newMeasures = [...state.measures];
      const prevMeasure = newMeasures[idx] || newMeasures[newMeasures.length - 1];
      const beatDuration = 60 / (prevMeasure?.tempo || state.tempo);
      const measureDuration = (prevMeasure?.timeSignature?.num || state.timeSignature.num) * beatDuration;
      const insertTime = prevMeasure ? prevMeasure.endTime : 0;
      const newMeasure = {
        number: idx + 2,
        startTime: insertTime,
        endTime: insertTime + measureDuration,
        timeSignature: { ...(prevMeasure?.timeSignature || state.timeSignature) },
        tempo: prevMeasure?.tempo || state.tempo,
      };
      newMeasures.splice(idx + 1, 0, newMeasure);
      // Renumber
      newMeasures.forEach((m, i) => m.number = i + 1);
      return { ...state, measures: newMeasures };
    }

    case 'REMOVE_MEASURE': {
      const newMeasures = state.measures.filter((_, i) => i !== action.payload);
      newMeasures.forEach((m, i) => m.number = i + 1);
      return { ...state, measures: newMeasures };
    }

    case 'UPDATE_MEASURE':
      return {
        ...state,
        measures: state.measures.map((m, i) =>
          i === action.payload.index ? { ...m, ...action.payload.changes } : m
        ),
      };

    case 'DOUBLE_MEASURES': {
      // Double from a given index onwards
      const fromIdx = action.payload || 0;
      const newMeasures = [...state.measures];
      const toDouble = newMeasures.slice(fromIdx);
      const doubled = [];
      for (const m of toDouble) {
        const halfDur = (m.endTime - m.startTime) / 2;
        doubled.push({ ...m, endTime: m.startTime + halfDur });
        doubled.push({
          ...m,
          number: m.number,
          startTime: m.startTime + halfDur,
          endTime: m.endTime,
        });
      }
      const result = [...newMeasures.slice(0, fromIdx), ...doubled];
      result.forEach((m, i) => m.number = i + 1);
      return { ...state, measures: result };
    }

    case 'HALVE_MEASURES': {
      const fromIdx = action.payload || 0;
      const newMeasures = [...state.measures];
      const toHalve = newMeasures.slice(fromIdx);
      const halved = [];
      for (let i = 0; i < toHalve.length; i += 2) {
        const m1 = toHalve[i];
        const m2 = toHalve[i + 1];
        halved.push({
          ...m1,
          endTime: m2 ? m2.endTime : m1.endTime,
        });
      }
      const result = [...newMeasures.slice(0, fromIdx), ...halved];
      result.forEach((m, i) => m.number = i + 1);
      return { ...state, measures: result };
    }

    case 'UPDATE_NOTE':
      return {
        ...state,
        notes: state.notes.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload.changes } : n
        ),
      };

    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.payload] };

    // Triplet toggle for selected notes
    case 'TOGGLE_TRIPLET': {
      const selIds = new Set(state.selectedNotes.map(n => n.id));
      return {
        ...state,
        notes: state.notes.map(n =>
          selIds.has(n.id) ? { ...n, isTriplet: !n.isTriplet } : n
        ),
      };
    }

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
