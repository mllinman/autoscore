/**
 * TranscriptionManager - Orchestrates the full transcription pipeline
 * Coordinates pitch detection, onset detection, beat tracking, and quantization
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
            // Step 1: Pitch detection (40% of work)
            this.reportProgress(5, 'Detecting pitches...');
            await this.sleep(50); // yield to UI

            const pitchData = this.pitchDetector.processBuffer(audioBuffer, 512, 2048);
            this.rawPitchData = pitchData;
            this.reportProgress(40, 'Pitch detection complete');

            // Step 2: Onset detection (25% of work)
            await this.sleep(50);
            this.reportProgress(45, 'Detecting note onsets...');

            const onsets = this.onsetDetector.detectOnsets(audioBuffer, 0.3);
            this.rawOnsets = onsets;
            this.reportProgress(65, 'Onset detection complete');

            // Step 3: Beat detection (15% of work)
            await this.sleep(50);
            this.reportProgress(68, 'Analyzing tempo and beats...');

            const { tempo, beats, timeSignature } = this.beatDetector.detectBeats(audioBuffer, onsets);
            this.reportProgress(80, 'Beat analysis complete');

            // Step 4: Note quantization (15% of work)
            await this.sleep(50);
            this.reportProgress(82, 'Quantizing notes...');

            const notes = this.noteQuantizer.quantize(pitchData, onsets, beats, tempo, sensitivity);
            this.reportProgress(95, 'Building score...');

            // Step 5: Generate measures
            await this.sleep(50);
            const measures = this.generateMeasures(beats, timeSignature, audioBuffer.duration, tempo);

            this.reportProgress(100, 'Transcription complete!');

            return {
                notes,
                beats,
                tempo: Math.round(tempo),
                timeSignature,
                measures,
                pitchData, // Keep raw data for re-quantization
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
