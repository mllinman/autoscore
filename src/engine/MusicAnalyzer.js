/**
 * MusicAnalyzer - Advanced music theory analysis engine
 * Handles key detection, chord recognition, and harmonic analysis
 */

export class MusicAnalyzer {
  constructor() {
    // Krumhansl-Schmuckler Key Profiles
    this.MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    this.MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    this.NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  }

  /**
   * Detect musical key from a set of notes using Krumhansl-Schmuckler profiles
   */
  detectKey(notes) {
    if (!notes || notes.length === 0) return { key: 'C', scale: 'major' };

    // 1. Build chromagram (histogram of total duration for each pitch class)
    const chromagram = new Float32Array(12);
    notes.forEach(note => {
      const pitchClass = note.midi % 12;
      const weight = note.duration || (note.endTime - note.startTime);
      chromagram[pitchClass] += weight;
    });

    // 2. Correlate against shifted profiles
    let bestScore = -Infinity;
    let bestKey = 0;
    let bestScale = 'major';

    for (let i = 0; i < 12; i++) {
      // Major
      const majorScore = this.calculateCorrelation(this.rotateProfile(this.MAJOR_PROFILE, i), chromagram);
      if (majorScore > bestScore) {
        bestScore = majorScore;
        bestKey = i;
        bestScale = 'major';
      }

      // Minor
      const minorScore = this.calculateCorrelation(this.rotateProfile(this.MINOR_PROFILE, i), chromagram);
      if (minorScore > bestScore) {
        bestScore = minorScore;
        bestKey = i;
        bestScale = 'minor';
      }
    }

    return {
      key: this.NOTE_NAMES[bestKey],
      scale: bestScale,
      root: bestKey,
      name: `${this.NOTE_NAMES[bestKey]} ${bestScale}`
    };
  }

  /**
   * Group simultaneous/overlapping notes into chords
   */
  identifyChords(notes) {
    if (!notes || notes.length === 0) return [];

    // Sort notes by start time
    const sorted = [...notes].sort((a, b) => a.startTime - b.startTime);
    const chords = [];
    const chordThreshold = 0.08; // 80ms window for simultaneous notes

    let currentChordNotes = [];
    let chordStartTime = -1;

    sorted.forEach(note => {
      if (currentChordNotes.length === 0) {
        currentChordNotes = [note];
        chordStartTime = note.startTime;
      } else if (note.startTime - chordStartTime < chordThreshold) {
        currentChordNotes.push(note);
      } else {
        // Evaluate previous chord
        if (currentChordNotes.length > 1) {
          chords.push(this.identifyChordName(currentChordNotes));
        }
        currentChordNotes = [note];
        chordStartTime = note.startTime;
      }
    });

    // Final one
    if (currentChordNotes.length > 1) {
      chords.push(this.identifyChordName(currentChordNotes));
    }

    return chords;
  }

  /**
   * Simple chord name identification based on intervals
   */
  identifyChordName(noteGroup) {
    const midis = [...new Set(noteGroup.map(n => n.midi))].sort((a, b) => a - b);
    if (midis.length < 2) return null;

    const root = midis[0];
    const rootName = this.NOTE_NAMES[root % 12];
    const intervals = midis.map(m => m - root);

    // Basic common chord patterns
    const hasInterval = (semitones) => intervals.includes(semitones) || intervals.some(i => (i % 12) === semitones);

    let type = '';
    if (hasInterval(4) && hasInterval(7)) {
       type = hasInterval(10) ? '7' : (hasInterval(11) ? 'maj7' : '');
    } else if (hasInterval(3) && hasInterval(7)) {
       type = hasInterval(10) ? 'm7' : 'm';
    } else if (hasInterval(4)) {
       type = 'no5'; // Dyad
    } else if (hasInterval(3)) {
       type = 'm(no5)';
    } else if (hasInterval(5) && hasInterval(7)) {
       type = 'sus4';
    } else if (hasInterval(2) && hasInterval(7)) {
       type = 'sus2';
    } else if (hasInterval(7)) {
       type = '5'; // Power chord
    }

    return {
      name: rootName + type,
      startTime: Math.min(...noteGroup.map(n => n.startTime)),
      endTime: Math.max(...noteGroup.map(n => n.endTime)),
      notes: noteGroup.map(n => n.id)
    };
  }

  // Helpers
  rotateProfile(profile, shift) {
    const arr = new Float32Array(12);
    for (let i = 0; i < 12; i++) {
      arr[(i + shift) % 12] = profile[i];
    }
    return arr;
  }

  calculateCorrelation(p1, p2) {
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 12; i++) {
      sum1 += p1[i];
      sum2 += p2[i];
    }
    const mean1 = sum1 / 12;
    const mean2 = sum2 / 12;

    let num = 0, den1 = 0, den2 = 0;
    for (let i = 0; i < 12; i++) {
      const d1 = p1[i] - mean1;
      const d2 = p2[i] - mean2;
      num += d1 * d2;
      den1 += d1 * d1;
      den2 += d2 * d2;
    }

    return num / Math.sqrt(den1 * den2);
  }
}
