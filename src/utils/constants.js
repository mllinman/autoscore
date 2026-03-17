/* Music theory constants and instrument configurations */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const KEY_SIGNATURES = [
    { name: 'C Major / A Minor', sharps: 0, flats: 0, key: 'C' },
    { name: 'G Major / E Minor', sharps: 1, flats: 0, key: 'G' },
    { name: 'D Major / B Minor', sharps: 2, flats: 0, key: 'D' },
    { name: 'A Major / F# Minor', sharps: 3, flats: 0, key: 'A' },
    { name: 'E Major / C# Minor', sharps: 4, flats: 0, key: 'E' },
    { name: 'B Major / G# Minor', sharps: 5, flats: 0, key: 'B' },
    { name: 'F Major / D Minor', sharps: 0, flats: 1, key: 'F' },
    { name: 'Bb Major / G Minor', sharps: 0, flats: 2, key: 'Bb' },
    { name: 'Eb Major / C Minor', sharps: 0, flats: 3, key: 'Eb' },
    { name: 'Ab Major / F Minor', sharps: 0, flats: 4, key: 'Ab' },
];

export const TIME_SIGNATURES = [
    { num: 2, den: 4, label: '2/4' },
    { num: 3, den: 4, label: '3/4' },
    { num: 4, den: 4, label: '4/4' },
    { num: 5, den: 4, label: '5/4' },
    { num: 6, den: 8, label: '6/8' },
    { num: 7, den: 8, label: '7/8' },
    { num: 9, den: 8, label: '9/8' },
    { num: 12, den: 8, label: '12/8' },
];

export const INSTRUMENTS = [
    {
        id: 'piano',
        name: 'Piano',
        icon: 'Piano',
        category: 'Keyboard',
        clef: 'treble',
        range: { low: 21, high: 108 },
        useTab: false,
    },
    {
        id: 'guitar',
        name: 'Acoustic Guitar',
        icon: 'Guitar',
        category: 'String',
        clef: 'treble',
        range: { low: 40, high: 84 },
        useTab: true,
        tuning: [64, 59, 55, 50, 45, 40], // E4 B3 G3 D3 A2 E2
        strings: 6,
        frets: 24,
    },
    {
        id: 'electric-guitar',
        name: 'Electric Guitar',
        icon: 'Guitar',
        category: 'String',
        clef: 'treble',
        range: { low: 40, high: 88 },
        useTab: true,
        tuning: [64, 59, 55, 50, 45, 40],
        strings: 6,
        frets: 24,
    },
    {
        id: 'bass',
        name: 'Bass Guitar',
        icon: 'Guitar',
        category: 'String',
        clef: 'bass',
        range: { low: 28, high: 67 },
        useTab: true,
        tuning: [43, 38, 33, 28],
        strings: 4,
        frets: 24,
    },
    {
        id: 'ukulele',
        name: 'Ukulele',
        icon: 'Guitar',
        category: 'String',
        clef: 'treble',
        range: { low: 60, high: 84 },
        useTab: true,
        tuning: [69, 64, 60, 67], // A4 E4 C4 G4
        strings: 4,
        frets: 15,
    },
    {
        id: 'violin',
        name: 'Violin',
        icon: 'Music',
        category: 'String',
        clef: 'treble',
        range: { low: 55, high: 103 },
        useTab: false,
    },
    {
        id: 'cello',
        name: 'Cello',
        icon: 'Music',
        category: 'String',
        clef: 'bass',
        range: { low: 36, high: 84 },
        useTab: false,
    },
    {
        id: 'voice',
        name: 'Voice / Vocals',
        icon: 'Mic',
        category: 'Vocal',
        clef: 'treble',
        range: { low: 48, high: 84 },
        useTab: false,
    },
    {
        id: 'flute',
        name: 'Flute',
        icon: 'Music',
        category: 'Woodwind',
        clef: 'treble',
        range: { low: 60, high: 96 },
        useTab: false,
    },
    {
        id: 'trumpet',
        name: 'Trumpet',
        icon: 'Music',
        category: 'Brass',
        clef: 'treble',
        range: { low: 55, high: 82 },
        useTab: false,
    },
    {
        id: 'drums',
        name: 'Drums / Percussion',
        icon: 'Drum',
        category: 'Percussion',
        clef: 'percussion',
        range: { low: 35, high: 81 },
        useTab: false,
    },
];

export const NOTE_DURATIONS = [
    { id: 'whole', name: 'Whole Note', beats: 4, symbol: '𝅝' },
    { id: 'half', name: 'Half Note', beats: 2, symbol: '𝅗𝅥' },
    { id: 'quarter', name: 'Quarter Note', beats: 1, symbol: '♩' },
    { id: 'eighth', name: 'Eighth Note', beats: 0.5, symbol: '♪' },
    { id: 'sixteenth', name: 'Sixteenth Note', beats: 0.25, symbol: '𝅘𝅥𝅯' },
    { id: 'triplet', name: 'Triplet', beats: 1 / 3, symbol: '3' },
];

export const DEFAULT_TEMPO = 120;
export const DEFAULT_TIME_SIGNATURE = { num: 4, den: 4 };
export const DEFAULT_KEY = 'C';

export const EXPORT_FORMATS = [
    { id: 'pdf', name: 'PDF', extension: '.pdf', description: 'Sheet music document' },
    { id: 'musicxml', name: 'MusicXML', extension: '.musicxml', description: 'Standard notation format' },
    { id: 'midi', name: 'MIDI', extension: '.mid', description: 'Musical instrument data' },
];
