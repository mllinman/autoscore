/* Music theory utility functions */

import { NOTE_NAMES } from './constants';

/**
 * Convert MIDI note number to frequency in Hz
 */
export function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert frequency in Hz to MIDI note number (rounded)
 */
export function frequencyToMidi(freq) {
    if (freq <= 0) return 0;
    return Math.round(12 * Math.log2(freq / 440) + 69);
}

/**
 * Convert frequency to the nearest MIDI note with cents deviation
 */
export function frequencyToMidiExact(freq) {
    if (freq <= 0) return { midi: 0, cents: 0 };
    const exact = 12 * Math.log2(freq / 440) + 69;
    const midi = Math.round(exact);
    const cents = Math.round((exact - midi) * 100);
    return { midi, cents };
}

/**
 * Get note name from MIDI number (e.g., 60 -> "C4")
 */
export function midiToNoteName(midi) {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Parse note name to MIDI number (e.g., "C4" -> 60)
 */
export function noteNameToMidi(name) {
    const match = name.match(/^([A-G]#?)(\d+)$/);
    if (!match) return null;
    const noteIndex = NOTE_NAMES.indexOf(match[1]);
    const octave = parseInt(match[2]);
    if (noteIndex === -1) return null;
    return (octave + 1) * 12 + noteIndex;
}

/**
 * Quantize a time value to the nearest beat division
 */
export function quantizeTime(time, tempo, division = 4) {
    const beatDuration = 60 / tempo;
    const divisionDuration = beatDuration / division;
    return Math.round(time / divisionDuration) * divisionDuration;
}

/**
 * Determine note duration name from beat count
 */
export function beatsToDuration(beats) {
    if (beats >= 3.5) return 'whole';
    if (beats >= 1.5) return 'half';
    if (beats >= 0.75) return 'quarter';
    if (beats >= 0.375) return 'eighth';
    return 'sixteenth';
}

/**
 * Convert time in seconds to measure and beat position
 */
export function timeToPosition(time, tempo, timeSignature) {
    const beatDuration = 60 / tempo;
    const beatsPerMeasure = timeSignature.num;
    const totalBeats = time / beatDuration;
    const measure = Math.floor(totalBeats / beatsPerMeasure) + 1;
    const beat = (totalBeats % beatsPerMeasure) + 1;
    return { measure, beat: Math.floor(beat * 10) / 10 };
}

/**
 * Format time in seconds to mm:ss.ms
 */
export function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get guitar tab fret position for a MIDI note given a tuning
 */
export function midiToTabPosition(midi, tuning) {
    const positions = [];
    for (let s = 0; s < tuning.length; s++) {
        const fret = midi - tuning[s];
        if (fret >= 0 && fret <= 24) {
            positions.push({ string: s, fret });
        }
    }
    // Sort by lower fret preferred
    positions.sort((a, b) => a.fret - b.fret);
    return positions.length > 0 ? positions[0] : null;
}

/**
 * Get the scale notes for a given key
 */
export function getScaleNotes(key, mode = 'major') {
    const keyIndex = NOTE_NAMES.indexOf(key);
    if (keyIndex === -1) return NOTE_NAMES;

    const intervals = mode === 'major'
        ? [0, 2, 4, 5, 7, 9, 11]
        : [0, 2, 3, 5, 7, 8, 10];

    return intervals.map(i => NOTE_NAMES[(keyIndex + i) % 12]);
}

/**
 * Check if a MIDI note is within an instrument's range
 */
export function isInRange(midi, instrument) {
    return midi >= instrument.range.low && midi <= instrument.range.high;
}
