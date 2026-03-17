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
 * Get ALL possible guitar tab fret positions for a MIDI note given a tuning
 */
export function getPossibleTabPositions(midi, tuning, maxFret = 24) {
    const positions = [];
    for (let s = 0; s < tuning.length; s++) {
        const fret = midi - tuning[s];
        if (fret >= 0 && fret <= maxFret) {
            positions.push({ string: s, fret });
        }
    }
    // Sort by fret ascending (prefer lower frets generally)
    positions.sort((a, b) => a.fret - b.fret);
    return positions;
}

/**
 * Kept for backwards compatibility. Returns the tightest/lowest position.
 */
export function midiToTabPosition(midi, tuning) {
    const positions = getPossibleTabPositions(midi, tuning);
    return positions.length > 0 ? positions[0] : null;
}

/**
 * Context-aware fingering algorithm.
 * Mutates the passed `notes` array to add `.tabString`, `.tabFret`, and `.finger`.
 * Attempts to minimize hand movement across the fretboard.
 */
export function calculateGuitarFingering(notes, tuning, maxFret = 24) {
    if (!notes || notes.length === 0 || !tuning) return notes;

    let currentPosition = 0; // The fret the index finger is hovering over

    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        
        // Skip rests or unpitched
        if (!note.midi) {
             note.hasPosition = false;
             continue;
        }

        const possible = getPossibleTabPositions(note.midi, tuning, maxFret);
        
        if (possible.length === 0) {
            note.hasPosition = false;
            note.tabFret = '?';
            note.tabString = 0;
            note.finger = '?';
            continue;
        }

        let bestPos = possible[0];
        
        // If we established a hand position previously, try to find a note that fits in it.
        // Hand position covers ~4 frets.
        if (i > 0 && currentPosition > 0) {
             let minPenalty = Infinity;
             
             for (const pos of possible) {
                 if (pos.fret === 0) {
                     // Open strings are always 'free' to play
                     if (0 < minPenalty) {
                         minPenalty = 0;
                         bestPos = pos;
                     }
                     continue;
                 }

                 // Calculate penalty based on distance from current hand position
                 // Normal stretch is currentPosition to currentPosition + 3 (4 frets)
                 let penalty = 0;
                 if (pos.fret < currentPosition) {
                     penalty = currentPosition - pos.fret; // Reaching back
                 } else if (pos.fret > currentPosition + 3) {
                     penalty = pos.fret - (currentPosition + 3); // Reaching forward
                 }

                 // Prefer thicker strings for higher notes if it keeps us in position
                 // Add a slight penalty for playing very high up on thick strings unless forced
                 if (pos.fret > 12 && pos.string > 3) {
                     penalty += (pos.fret - 12) * 0.5;
                 }

                 if (penalty < minPenalty) {
                     minPenalty = penalty;
                     bestPos = pos;
                 }
             }
        }

        note.tabString = bestPos.string;
        note.tabFret = bestPos.fret;
        note.hasPosition = true;

        // Assign finger (1=Index, 2=Middle, 3=Ring, 4=Pinky, 0=Open)
        if (note.tabFret === 0) {
            note.finger = 0;
        } else {
            // Update the running hand position if we jumped
            if (currentPosition === 0 || note.tabFret < currentPosition || note.tabFret > currentPosition + 4) {
                 // For absolute basic positioning, assume index finger plants on the fret
                 // UNLESS it's the start of a scale going down, then maybe plant pinky. 
                 // We will just plant Index for simplicity in this baseline model.
                 currentPosition = Math.max(1, note.tabFret);
            }
            
            let relativeFinger = (note.tabFret - currentPosition) + 1;
            // Bound it to 1-4
            if (relativeFinger > 4) relativeFinger = 4;
            if (relativeFinger < 1) relativeFinger = 1;
            note.finger = relativeFinger;
        }
    }
    
    return notes;
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
    if (!instrument || !instrument.range) return true;
    return midi >= instrument.range.low && midi <= instrument.range.high;
}
