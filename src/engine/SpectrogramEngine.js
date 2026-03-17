/**
 * SpectrogramEngine - Compute spectrogram data from audio buffer
 * Generates a 2D amplitude array for rendering as a heatmap
 */

export class SpectrogramEngine {
  /**
   * Compute spectrogram from audio buffer
   * @param {AudioBuffer} audioBuffer
   * @param {Object} options
   * @returns {Object} { data: Float32Array[], frequencies: number[], times: number[], maxAmplitude: number }
   */
  static async compute(audioBuffer, options = {}, onProgress = null) {
    const {
      fftSize = 2048,
      hopSize = 512,
      startTime = 0,
      endTime = audioBuffer.duration,
    } = options;

    const sampleRate = audioBuffer.sampleRate;
    const rawData = audioBuffer.getChannelData(0);

    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.min(Math.floor(endTime * sampleRate), rawData.length);
    const data = rawData.slice(startSample, endSample);

    const numFrames = Math.floor((data.length - fftSize) / hopSize);
    const numBins = fftSize / 2;

    // Pre-compute Hann window
    const window = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    }

    // Frequency values for each bin
    const frequencies = new Float32Array(numBins);
    for (let k = 0; k < numBins; k++) {
      frequencies[k] = k * sampleRate / fftSize;
    }

    // Time values for each frame
    const times = new Float32Array(numFrames);

    // We'll downsample the frequency axis for rendering efficiency
    // Use log-frequency bins corresponding to piano range (27.5 Hz to 4186 Hz)
    const minFreq = 27.5; // A0
    const maxFreq = 4186; // C8
    const numLogBins = 256; // Number of display bins
    const logFreqs = new Float32Array(numLogBins);
    for (let i = 0; i < numLogBins; i++) {
      logFreqs[i] = minFreq * Math.pow(maxFreq / minFreq, i / (numLogBins - 1));
    }

    // Spectrogram data: array of frames, each with numLogBins amplitudes
    const spectrogramData = [];
    let maxAmplitude = 0;
    const yieldEvery = Math.max(1, Math.floor(numFrames / 40));

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      times[frame] = (start + startSample) / sampleRate;

      // Apply window and compute simplified magnitude spectrum
      // Use only the bins we need (much faster than full FFT)
      const frameAmps = new Float32Array(numLogBins);

      // Compute energy in frequency bands using Goertzel-like approach
      // But for performance, we'll use a band-energy approximation
      const windowed = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        windowed[i] = data[start + i] * window[i];
      }

      // Compute real DFT only for the log-frequency bins we need
      for (let b = 0; b < numLogBins; b++) {
        const freq = logFreqs[b];
        const k = Math.round(freq * fftSize / sampleRate);
        if (k >= 0 && k < numBins) {
          // Goertzel algorithm for single frequency
          const w = 2 * Math.PI * k / fftSize;
          const coeff = 2 * Math.cos(w);
          let s0 = 0, s1 = 0, s2 = 0;

          // Process in chunks for speed
          const step = Math.max(1, Math.floor(fftSize / 256));
          for (let n = 0; n < fftSize; n += step) {
            s0 = windowed[n] + coeff * s1 - s2;
            s2 = s1;
            s1 = s0;
          }

          const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
          frameAmps[b] = Math.sqrt(Math.abs(power));
        }
      }

      // Track max for normalization
      for (let b = 0; b < numLogBins; b++) {
        if (frameAmps[b] > maxAmplitude) maxAmplitude = frameAmps[b];
      }

      spectrogramData.push(frameAmps);

      // Yield periodically
      if (frame % yieldEvery === 0) {
        if (onProgress) onProgress(frame / numFrames);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Normalize to 0-1
    if (maxAmplitude > 0) {
      for (const frame of spectrogramData) {
        for (let b = 0; b < numLogBins; b++) {
          frame[b] /= maxAmplitude;
        }
      }
    }

    return {
      data: spectrogramData,
      frequencies: logFreqs,
      times,
      maxAmplitude,
      numBins: numLogBins,
      numFrames,
    };
  }
}
