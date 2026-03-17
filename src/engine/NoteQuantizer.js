/**
 * Note Quantizer - Snaps detected pitches to a musical grid
 * Handles note filtering by confidence threshold (sensitivity slider)
 */

import { frequencyToMidi, midiToNoteName, beatsToDuration, quantizeTime } from '../utils/musicTheory';

export class NoteQuantizer {
    constructor() {
        this.minNoteDuration = 0.05; // 50ms minimum note
    }

    /**
     * Convert raw pitch/onset data into quantized musical notes
     */
    quantize(pitchData, onsets, beats, tempo, sensitivity = 50) {
        if (!pitchData || pitchData.length === 0) return [];

        // 1. Group consecutive pitched frames into note candidates
        const rawNotes = this.groupPitchFrames(pitchData);

        // 2. Align notes to onsets
        const alignedNotes = this.alignToOnsets(rawNotes, onsets);

        // 3. Filter by confidence threshold (sensitivity)
        const confidenceThreshold = 1 - (sensitivity / 100);
        const filteredNotes = alignedNotes.filter(n => n.confidence >= confidenceThreshold);

        // 4. Quantize to beat grid
        const quantizedNotes = this.snapToBeatGrid(filteredNotes, tempo, beats);

        // 5. Assign durations and IDs
        return quantizedNotes.map((note, i) => ({
            id: `note-${i}-${Date.now()}`,
            midi: note.midi,
            noteName: midiToNoteName(note.midi),
            frequency: note.frequency,
            startTime: note.startTime,
            endTime: note.endTime,
            duration: note.endTime - note.startTime,
            durationName: beatsToDuration((note.endTime - note.startTime) * tempo / 60),
            confidence: note.confidence,
            velocity: Math.round(note.confidence * 100 + 27),
        }));
    }

    /**
     * Group consecutive pitched frames into note candidates
     */
    groupPitchFrames(pitchData) {
        const notes = [];
        let currentNote = null;

        for (const frame of pitchData) {
            if (frame.hasPitch && frame.frequency > 0) {
                const midi = frequencyToMidi(frame.frequency);

                if (currentNote && Math.abs(currentNote.midi - midi) <= 1) {
                    // Continue current note
                    currentNote.endTime = frame.time + 0.012; // ~hop duration
                    currentNote.frequencies.push(frame.frequency);
                    currentNote.confidences.push(frame.confidence);
                } else {
                    // Start new note
                    if (currentNote && currentNote.endTime - currentNote.startTime >= this.minNoteDuration) {
                        this.finalizeNote(currentNote);
                        notes.push(currentNote);
                    }
                    currentNote = {
                        midi,
                        startTime: frame.time,
                        endTime: frame.time + 0.012,
                        frequencies: [frame.frequency],
                        confidences: [frame.confidence],
                    };
                }
            } else {
                // No pitch - end current note
                if (currentNote && currentNote.endTime - currentNote.startTime >= this.minNoteDuration) {
                    this.finalizeNote(currentNote);
                    notes.push(currentNote);
                }
                currentNote = null;
            }
        }

        // Don't forget last note
        if (currentNote && currentNote.endTime - currentNote.startTime >= this.minNoteDuration) {
            this.finalizeNote(currentNote);
            notes.push(currentNote);
        }

        return notes;
    }

    /**
     * Compute average frequency and confidence for a note
     */
    finalizeNote(note) {
        const avgFreq = note.frequencies.reduce((a, b) => a + b, 0) / note.frequencies.length;
        const avgConf = note.confidences.reduce((a, b) => a + b, 0) / note.confidences.length;
        note.frequency = avgFreq;
        note.midi = frequencyToMidi(avgFreq);
        note.confidence = avgConf;
        delete note.frequencies;
        delete note.confidences;
    }

    /**
     * Align note start times to nearest detected onsets
     */
    alignToOnsets(notes, onsets) {
        if (onsets.length === 0) return notes;

        return notes.map(note => {
            // Find nearest onset within 100ms of note start
            let nearestOnset = null;
            let minDist = 0.1;

            for (const onset of onsets) {
                const dist = Math.abs(onset.time - note.startTime);
                if (dist < minDist) {
                    minDist = dist;
                    nearestOnset = onset;
                }
            }

            if (nearestOnset) {
                const shift = nearestOnset.time - note.startTime;
                return {
                    ...note,
                    startTime: nearestOnset.time,
                    endTime: note.endTime + shift,
                };
            }
            return note;
        });
    }

    /**
     * Snap note start/end times to beat grid
     */
    snapToBeatGrid(notes, tempo, beats) {
        return notes.map(note => ({
            ...note,
            startTime: quantizeTime(note.startTime, tempo, 4),
            endTime: quantizeTime(note.endTime, tempo, 4),
        }));
    }

    /**
     * Re-filter notes based on new sensitivity value
     */
    static filterBySensitivity(allNotes, sensitivity) {
        const threshold = 1 - (sensitivity / 100);
        return allNotes.filter(n => n.confidence >= threshold);
    }
}
