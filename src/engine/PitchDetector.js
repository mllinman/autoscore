/**
 * Pitch Detector - YIN algorithm implementation for monophonic pitch detection
 * Detects fundamental frequency (F0) from audio samples
 * Async processBuffer with periodic yielding to prevent UI freezing
 */

export class PitchDetector {
  constructor(sampleRate = 44100, threshold = 0.15, medianWindowSize = 5) {
    this.sampleRate = sampleRate;
    this.threshold = threshold;
    this.probabilityThreshold = 0.7;
    this.medianWindowSize = medianWindowSize;
  }

  /**
   * Detect pitch using YIN algorithm
   * Returns { frequency, confidence } or null if no pitch detected
   */
  detect(audioFrame) {
    const bufferSize = audioFrame.length;
    const halfSize = Math.floor(bufferSize / 2);

    // Step 1: Difference function
    const diff = new Float32Array(halfSize);
    for (let tau = 0; tau < halfSize; tau++) {
      let sum = 0;
      for (let i = 0; i < halfSize; i++) {
        const delta = audioFrame[i] - audioFrame[i + tau];
        sum += delta * delta;
      }
      diff[tau] = sum;
    }

    // Step 2: Cumulative mean normalized difference
    const cmndf = new Float32Array(halfSize);
    cmndf[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < halfSize; tau++) {
      runningSum += diff[tau];
      cmndf[tau] = diff[tau] * tau / runningSum;
    }

    // Step 3: Absolute threshold
    let tau = -1;
    for (let i = 2; i < halfSize; i++) {
      if (cmndf[i] < this.threshold) {
        while (i + 1 < halfSize && cmndf[i + 1] < cmndf[i]) {
          i++;
        }
        tau = i;
        break;
      }
    }

    if (tau === -1) return null;

    // Step 4: Parabolic interpolation for better accuracy
    let betterTau = tau;
    if (tau > 0 && tau < halfSize - 1) {
      const s0 = cmndf[tau - 1];
      const s1 = cmndf[tau];
      const s2 = cmndf[tau + 1];
      betterTau = tau + (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
    }

    const frequency = this.sampleRate / betterTau;
    const confidence = 1 - cmndf[tau];

    if (frequency < 20 || frequency > 4400 || confidence < this.probabilityThreshold) {
      return null;
    }

    return { frequency, confidence };
  }

  /**
   * Process an entire audio buffer and return pitch data over time.
   * Async with periodic yielding to prevent UI freezing.
   * Uses larger hop size and smaller frame for speed on long files.
   */
  async processBuffer(audioBuffer, onProgress = null) {
    const data = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;

    // Adapt parameters based on audio length to stay responsive
    // For longer files, use larger hop (less frames to process)
    let hopSize, frameSize;
    if (duration > 60) {
      hopSize = 2048;
      frameSize = 4096;
    } else if (duration > 20) {
      hopSize = 1024;
      frameSize = 2048;
    } else {
      hopSize = 512;
      frameSize = 2048;
    }

    const pitches = [];
    const totalFrames = Math.floor((data.length - frameSize) / hopSize);
    const yieldEvery = Math.max(1, Math.floor(totalFrames / 50)); // yield ~50 times

    for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
      const i = frameIdx * hopSize;
      const frame = data.slice(i, i + frameSize);
      const result = this.detect(frame);
      const time = i / this.sampleRate;

      pitches.push({
        time,
        frequency: result ? result.frequency : 0,
        confidence: result ? result.confidence : 0,
        hasPitch: result !== null,
        frameIndex: frameIdx,
      });

      // Yield to UI periodically
      if (frameIdx % yieldEvery === 0) {
        if (onProgress) {
          onProgress(frameIdx / totalFrames);
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    return this.applyMedianFilter(pitches, this.medianWindowSize);
  }

  /**
   * Applies a median filter to pitch sequences to remove octave jumps and errors
   */
  applyMedianFilter(pitches, windowSize = 5) {
    const smoothed = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < pitches.length; i++) {
      const current = pitches[i];
      if (!current.hasPitch) {
        smoothed.push(current);
        continue;
      }

      // Collect valid frequencies in the surrounding window
      const windowFreqs = [];
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(pitches.length - 1, i + halfWindow); j++) {
        if (pitches[j].hasPitch) {
          windowFreqs.push(pitches[j].frequency);
        }
      }

      if (windowFreqs.length > 2) {
        windowFreqs.sort((a, b) => a - b);
        const medianFreq = windowFreqs[Math.floor(windowFreqs.length / 2)];
        smoothed.push({
          ...current,
          frequency: medianFreq
        });
      } else {
        smoothed.push(current);
      }
    }
    return smoothed;
  }
}
