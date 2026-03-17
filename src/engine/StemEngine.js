/**
 * StemEngine - Extremely lightweight DSP stem separator for Browsers
 * 
 * Uses a combination of Mid/Side processing, multi-band crossovers,
 * and transient detection to approximate 4 stems:
 * 1. Vocals (Mid channel, bandpassed)
 * 2. Bass (Mid channel, lowpassed)
 * 3. Drums (Transient bursts across spectrum)
 * 4. Other/Inst (Side channels + residual)
 */
export class StemEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
  }

  /**
   * Processes a source AudioBuffer and returns an object of 4 new AudioBuffers
   * @param {AudioBuffer} buffer The source stereo buffer
   * @param {Function} onProgress Callback for processing updates (0-100)
   * @returns {Promise<Object>} { vocals: AudioBuffer, bass: AudioBuffer, drums: AudioBuffer, other: AudioBuffer }
   */
  async separate(buffer, onProgress = () => {}) {
    onProgress(10);
    // Offline rendered processing to avoid web audio node graph latency / real-time drops
    const offlineCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );

    // If mono, separation via M/S is impossible. We fake it by returning the buffer 4 times
    if (buffer.numberOfChannels === 1) {
      console.warn("StemEngine: Mono file detected. Mid/Side separation requires stereo. Returning copies.");
      onProgress(100);
      return { vocals: buffer, bass: buffer, drums: buffer, other: buffer };
    }

    onProgress(20);
    
    // We do the math manually on Float32Arrays for speed and precision
    const leftBuffer = buffer.getChannelData(0);
    const rightBuffer = buffer.getChannelData(1);
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Create target arrays
    const midArr = new Float32Array(length);
    const sideArr = new Float32Array(length);
    const bassArr = new Float32Array(length);
    const drumMasterArr = new Float32Array(length);

    onProgress(30);

    // 1. Mid/Side Matrixing
    for (let i = 0; i < length; i++) {
      const l = leftBuffer[i];
      const r = rightBuffer[i];
      // Mid = (L + R) / 2
      const m = (l + r) * 0.5;
      midArr[i] = m;
      // Side = (L - R) / 2
      sideArr[i] = (l - r) * 0.5;
    }

    onProgress(40);

    // 2. Simple IIR Lo-pass for Bass (< 250Hz)
    // Very basic 1-pole filter math for speed
    let lpVal = 0;
    const fLo = 250;
    const rcLo = 1.0 / (fLo * 2 * Math.PI);
    const dt = 1.0 / sampleRate;
    const alphaLo = dt / (rcLo + dt);

    for (let i = 0; i < length; i++) {
      lpVal += (alphaLo * (midArr[i] - lpVal));
      bassArr[i] = lpVal;
    }

    onProgress(50);

    // 3. Simple High-pass for Vocals (> 150Hz) applied to Mid, minus the Bass
    const vocalArr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        // Vocal is roughly the Mid channel, subtracting the deep bass so it doesn't rumble
        vocalArr[i] = midArr[i] - bassArr[i];
    }

    onProgress(60);

    // 4. Transient Detection for Drums
    // We run an energy tracker and look for spikes
    let energy = 0;
    const energyAlpha = 0.005; // Smoothing
    let prevEnergy = 0;

    for (let i = 0; i < length; i++) {
      const sample = Math.abs(midArr[i]);
      energy = (energyAlpha * sample) + ((1 - energyAlpha) * energy);
      
      const delta = energy - prevEnergy;
      
      // If energy spikes fast, it's a transient (drum)
      if (delta > 0.05) { 
        drumMasterArr[i] = midArr[i]; // Keep transient
        // Duck the vocal/bass where the drum hit is huge
        vocalArr[i] *= 0.5; 
      } else {
        drumMasterArr[i] = midArr[i] * 0.1; // Bleed, but mostly quiet
      }
      
      prevEnergy = energy;
    }

    onProgress(70);

    // 5. Inst/Other is the Sides + anything leftover
    const otherArr = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      // It's mostly the stereo spread (synths, guitars, wide pianos)
      otherArr[i] = sideArr[i] * 1.5; // Boost side slightly to make up for mid loss
    }

    onProgress(80);

    // Package into AudioBuffers
    const createStereoBuffer = (monoData) => {
      const b = this.ctx.createBuffer(2, length, sampleRate);
      b.getChannelData(0).set(monoData);
      b.getChannelData(1).set(monoData);
      return b;
    };

    const createRealStereoBuffer = (leftData, rightData) => {
      const b = this.ctx.createBuffer(2, length, sampleRate);
      b.getChannelData(0).set(leftData);
      b.getChannelData(1).set(rightData);
      return b;
    };

    // The other track is actually stereo, we can reconstruct it by doing M'+S and M'-S
    // Wait, other is purely side here. Let's make it real stereo (L=S, R=-S)
    const otherLeft = new Float32Array(length);
    const otherRight = new Float32Array(length);
    for(let i=0; i<length; i++) {
        otherLeft[i] = otherArr[i];
        otherRight[i] = -otherArr[i];
    }

    onProgress(90);

    const stems = {
      vocals: createStereoBuffer(vocalArr),
      bass: createStereoBuffer(bassArr),
      drums: createStereoBuffer(drumMasterArr),
      other: createRealStereoBuffer(otherLeft, otherRight)
    };

    onProgress(100);
    return stems;
  }
}
