/**
 * TranscriptionManager - Orchestrates the full transcription pipeline
 * Integrates Web Worker to offload DSP processing from the main UI thread.
 */

import { BeatDetector } from './BeatDetector';
import { NoteQuantizer } from './NoteQuantizer';

export class TranscriptionManager {
  constructor() {
    this.rawPitchData = null;
    this.rawOnsets = null;
    this.onProgress = null;
    this.worker = null;
    
    // For synchronous re-quantization locally
    this.beatDetector = null; 
    this.noteQuantizer = null; 
  }

  /**
   * Run the full transcription pipeline using a Web Worker
   */
  async transcribe(audioBuffer, sensitivity = 50, onProgress = null) {
    this.onProgress = onProgress;
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);

    return new Promise((resolve, reject) => {
      // Initialize the Web Worker
      this.worker = new Worker(new URL('./TranscriptionWorker.js', import.meta.url), { type: 'module' });

      this.worker.onmessage = (e) => {
        const { type, payload } = e.data;

        if (type === 'PROGRESS') {
          if (this.onProgress) {
            this.onProgress(payload);
          }
        } else if (type === 'COMPLETE') {
          this.rawPitchData = payload.pitchData;
          this.rawOnsets = payload.onsets;
          this.worker.terminate();
          this.worker = null;
          resolve(payload);
        } else if (type === 'ERROR') {
          this.worker.terminate();
          this.worker = null;
          reject(new Error(payload));
        }
      };

      this.worker.onerror = (err) => {
        this.worker.terminate();
        this.worker = null;
        reject(err);
      };

      // Send data to worker
      this.worker.postMessage({
        type: 'START_TRANSCRIPTION',
        payload: {
          channelData,
          sampleRate,
          sensitivity
        }
      });
    });
  }

  /**
   * Re-quantize notes with new sensitivity without re-running detection
   * This is fast enough to run synchronously on the main thread
   */
  reQuantize(sensitivity, tempo) {
    if (!this.rawPitchData || !this.rawOnsets) return null;

    if (!this.beatDetector) this.beatDetector = new BeatDetector(44100);
    if (!this.noteQuantizer) this.noteQuantizer = new NoteQuantizer();

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
}
