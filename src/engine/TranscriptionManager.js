/**
 * TranscriptionManager - Orchestrates the full transcription pipeline
 * Coordinates pitch detection, onset detection, beat tracking, and quantization
 * Non-blocking with granular progress reporting
 */

import { PitchDetector } from './PitchDetector';
import { OnsetDetector } from './OnsetDetector';
import { BeatDetector } from './BeatDetector';
import { NoteQuantizer } from './NoteQuantizer';

export class TranscriptionManager {
  constructor() {
    this.pitchDetector = null;
    this.onsetDetector = null;
    this.beatDetector = null;
    this.noteQuantizer = new NoteQuantizer();
    this.rawPitchData = null;
    this.rawOnsets = null;
    this.onProgress = null;
  }

  /**
   * Run the full transcription pipeline
   */
  async transcribe(audioBuffer, sensitivity = 50, onProgress = null) {
    this.onProgress = onProgress;
    const sampleRate = audioBuffer.sampleRate;

    // Initialize detectors
    this.pitchDetector = new PitchDetector(sampleRate);
    this.onsetDetector = new OnsetDetector(sampleRate);
    this.beatDetector = new BeatDetector(sampleRate);

    try {
      // Step 1: Pitch detection (0-60% of progress)
      this.reportProgress(2, 'Analyzing pitch...');
      await this.sleep(20);

      const pitchData = await this.pitchDetector.processBuffer(
        audioBuffer,
        (fraction) => {
          // Map pitch progress (0-1) to overall progress (2-58%)
          const progress = 2 + Math.round(fraction * 56);
          this.reportProgress(progress, `Detecting pitches... ${Math.round(fraction * 100)}%`);
        }
      );
      this.rawPitchData = pitchData;
      this.reportProgress(60, 'Pitch detection complete');
      await this.sleep(20);

      // Step 2: Onset detection (60-75%)
      this.reportProgress(62, 'Detecting note onsets...');
      await this.sleep(20);

      const onsets = this.onsetDetector.detectOnsets(audioBuffer, 0.3);
      this.rawOnsets = onsets;
      this.reportProgress(75, 'Onset detection complete');
      await this.sleep(20);

      // Step 3: Beat detection (75-85%)
      this.reportProgress(77, 'Analyzing tempo and beats...');
      await this.sleep(20);

      const { tempo, beats, timeSignature } = this.beatDetector.detectBeats(audioBuffer, onsets);
      this.reportProgress(85, 'Beat analysis complete');
      await this.sleep(20);

      // Step 4: Note quantization (85-95%)
      this.reportProgress(87, 'Quantizing notes...');
      await this.sleep(20);

      const notes = this.noteQuantizer.quantize(pitchData, onsets, beats, tempo, sensitivity);
      this.reportProgress(95, 'Building score...');
      await this.sleep(20);

      // Step 5: Generate measures
      const measures = this.generateMeasures(beats, timeSignature, audioBuffer.duration, tempo);

      this.reportProgress(100, 'Transcription complete!');

      return {
        notes,
        beats,
        tempo: Math.round(tempo),
        timeSignature,
        measures,
        pitchData,
        onsets,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  /**
   * Re-quantize notes with new sensitivity without re-running detection
   */
  reQuantize(sensitivity, tempo) {
    if (!this.rawPitchData || !this.rawOnsets) return null;

    const beats = this.beatDetector.generateBeatGrid(
      this.rawPitchData[this.rawPitchData.length - 1]?.time || 0,
      tempo,
      this.rawOnsets
    );

    return this.noteQuantizer.quantize(
      this.rawPitchData,
      this.rawOnsets,
      beats,
      tempo,
      sensitivity
    );
  }

  /**
   * Generate measure objects for the score
   */
  generateMeasures(beats, timeSignature, duration, tempo) {
    const beatsPerMeasure = timeSignature.num;
    const beatDuration = 60 / tempo;
    const measureDuration = beatsPerMeasure * beatDuration;
    const numMeasures = Math.ceil(duration / measureDuration);

    const measures = [];
    for (let i = 0; i < numMeasures; i++) {
      measures.push({
        number: i + 1,
        startTime: i * measureDuration,
        endTime: (i + 1) * measureDuration,
        timeSignature: { ...timeSignature },
        tempo,
      });
    }

    return measures;
  }

  /**
   * Report progress to callback
   */
  reportProgress(progress, step) {
    if (this.onProgress) {
      this.onProgress({ progress, step });
    }
  }

  /**
   * Small sleep to yield control back to the main thread
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
