/**
 * Onset Detector - Energy-based note onset detection
 * Identifies when new notes begin in an audio signal
 * Uses efficient energy/spectral difference approach (no naive DFT)
 */

export class OnsetDetector {
  constructor(sampleRate = 44100) {
    this.sampleRate = sampleRate;
    this.fftSize = 2048;
    this.hopSize = 512;
  }

  /**
   * Detect onsets using energy-based approach (fast, no DFT)
   */
  detectOnsets(audioBuffer, threshold = 0.3) {
    const data = audioBuffer.getChannelData(0);
    const numFrames = Math.floor((data.length - this.fftSize) / this.hopSize);
    const energyValues = [];

    // Step 1: Compute RMS energy per frame (O(N) total)
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * this.hopSize;
      let energy = 0;
      for (let i = start; i < start + this.fftSize; i++) {
        energy += data[i] * data[i];
      }
      energy = Math.sqrt(energy / this.fftSize);
      energyValues.push({
        time: start / this.sampleRate,
        energy,
        frameIndex: frame,
      });
    }

    // Step 2: Compute energy flux (positive differences only)
    const fluxValues = [];
    for (let i = 1; i < energyValues.length; i++) {
      const diff = energyValues[i].energy - energyValues[i - 1].energy;
      fluxValues.push({
        time: energyValues[i].time,
        flux: Math.max(0, diff),
        frameIndex: i,
      });
    }

    // Step 3: Adaptive onset picking
    const onsets = this.adaptiveOnsetPicking(fluxValues, threshold);
    return onsets;
  }

  /**
   * Adaptive onset picking with local median threshold
   */
  adaptiveOnsetPicking(fluxValues, sensitivity) {
    if (fluxValues.length === 0) return [];

    const windowSize = 10;
    const onsets = [];

    // Compute max flux for normalization
    const maxFlux = Math.max(...fluxValues.map(f => f.flux));
    if (maxFlux === 0) return [];

    const normalizedFlux = fluxValues.map(f => ({ ...f, flux: f.flux / maxFlux }));

    for (let i = windowSize; i < normalizedFlux.length - 1; i++) {
      // Local median
      const window = normalizedFlux.slice(i - windowSize, i).map(f => f.flux);
      window.sort((a, b) => a - b);
      const median = window[Math.floor(window.length / 2)];

      const adaptiveThreshold = median + sensitivity * 0.5;

      // Check if current frame is a peak above threshold
      if (normalizedFlux[i].flux > adaptiveThreshold &&
          normalizedFlux[i].flux > normalizedFlux[i - 1].flux &&
          normalizedFlux[i].flux > normalizedFlux[i + 1].flux) {
        // Minimum onset spacing: 50ms
        if (onsets.length === 0 ||
            normalizedFlux[i].time - onsets[onsets.length - 1].time > 0.05) {
          onsets.push({
            time: normalizedFlux[i].time,
            strength: normalizedFlux[i].flux,
          });
        }
      }
    }

    return onsets;
  }
}
