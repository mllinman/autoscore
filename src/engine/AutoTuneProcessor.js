import { PitchDetector } from './PitchDetector';

export class AutoTuneProcessor {
  constructor(audioContext) {
    this.ctx = audioContext;
  }

  /**
   * Applies auto-tune to an AudioBuffer
   * @param {AudioBuffer} buffer 
   * @param {Object} settings { retuneSpeed: 0-100, scale: 'chromatic'|'major'|'minor', key: 'C' }
   * @param {Function} onProgress 0-100
   */
  async process(buffer, settings, onProgress = () => {}) {
    onProgress(5);
    
    // 1. Detect Pitch over time
    const detector = new PitchDetector(buffer.sampleRate, 0.15, 5);
    const pitchData = await detector.processBuffer(buffer, (p) => {
      onProgress(5 + p * 30); // 5% to 35% is pitch detection
    });

    onProgress(40);

    // 2. Map pitches to target frequencies
    const targetPitches = this.calculateTargetPitches(pitchData, settings);

    onProgress(50);

    // 3. Apply Granular Pitch Shifting (Offline PSOLA approximation)
    const newBuffer = this.granularPitchShift(buffer, pitchData, targetPitches, settings, (p) => {
      onProgress(50 + p * 50); // 50% to 100% is pitch shifting
    });

    onProgress(100);
    return newBuffer;
  }

  /**
   * Calculates what the frequency *should* be at each frame based on settings
   */
  calculateTargetPitches(pitchData, settings) {
    const targets = new Float32Array(pitchData.length);
    const speed = settings.retuneSpeed / 100.0; // 0 (slow/natural) to 1 (fast/robotic)
    
    // Simple chromatic snapping for proof of concept
    // You could expand this to snap to specific scales (Major, Minor, Pentatonic)
    
    let currentTarget = 0;
    
    for (let i = 0; i < pitchData.length; i++) {
      const data = pitchData[i];
      if (!data.hasPitch || data.frequency < 50) {
        targets[i] = 0;
        currentTarget = 0;
        continue;
      }

      // Convert Hz to MIDI Note
      const midiFloat = 69 + 12 * Math.log2(data.frequency / 440.0);
      
      // Quantize to nearest whole note (Chromatic scale)
      const targetMidi = Math.round(midiFloat);
      
      // Convert back to Hz
      const exactFreq = 440.0 * Math.pow(2, (targetMidi - 69) / 12.0);
      
      // Retune speed smoothing (glissando/portamento effect)
      if (currentTarget === 0) {
        currentTarget = exactFreq;
      } else {
        // Fast speed = instant snap. Slow speed = smooth glide to target
        const alpha = 0.05 + (0.95 * speed); 
        currentTarget = (currentTarget * (1 - alpha)) + (exactFreq * alpha);
      }
      
      targets[i] = currentTarget;
    }

    return targets;
  }

  /**
   * Granular Time-Domain Pitch Shifting
   * Overlap-Add algorithm slicing audio into grains and resampling them.
   */
  granularPitchShift(buffer, pitchData, targetPitches, settings, onProgress) {
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const channels = buffer.numberOfChannels;
    
    const outBuffer = this.ctx.createBuffer(channels, length, sampleRate);
    
    // Grain size in samples (e.g., 40ms)
    // Needs to be large enough to capture low frequencies, small enough to track pitch changes
    const grainSize = Math.floor(sampleRate * 0.040); 
    const hopSize = Math.floor(grainSize / 4); // 75% overlap for smoothness
    
    // Hanning window function
    const window = new Float32Array(grainSize);
    for (let i = 0; i < grainSize; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (grainSize - 1)));
    }

    const inDataL = buffer.getChannelData(0);
    const inDataR = channels > 1 ? buffer.getChannelData(1) : inDataL;
    
    const outDataL = outBuffer.getChannelData(0);
    const outDataR = channels > 1 ? outBuffer.getChannelData(1) : outDataL;

    let progressUpdateCtr = 0;

    // We step through the output buffer at constant `hopSize`
    // We read from the input buffer at a rate determined by the pitch shift ratio
    for (let pos = 0; pos < length - grainSize; pos += hopSize) {
      // Find the pitch ratio for this moment in time
      // pitchData was generated with a specific hopSize, we need to map time -> frame
      const timeSecs = pos / sampleRate;
      
      // Approximate frame index
      const frameIdx = Math.min(pitchData.length - 1, Math.floor((timeSecs / buffer.duration) * pitchData.length));
      const sourceFreq = pitchData[frameIdx]?.frequency || 0;
      const targetFreq = targetPitches[frameIdx] || 0;
      
      let pitchRatio = 1.0;
      if (sourceFreq > 20 && targetFreq > 20) {
        pitchRatio = targetFreq / sourceFreq;
        
        // Safety bounds
        if (pitchRatio > 2.0) pitchRatio = 2.0;
        if (pitchRatio < 0.5) pitchRatio = 0.5;
        
        // If speed is 0 (Off), ratio is 1
        if (settings.retuneSpeed === 0) {
            pitchRatio = 1.0;
        }
      }

      // Read a grain. If pitchRatio > 1 (pitch up), we read FASTER (step > 1).
      // We still map it across `grainSize` output samples.
      const readStep = pitchRatio; 
      
      let readPos = pos; // Center the grain around the current time
      
      for (let i = 0; i < grainSize; i++) {
        const intReadPos = Math.floor(readPos);
        const frac = readPos - intReadPos;
        
        if (intReadPos + 1 < length) {
          // Linear interpolation
          const sL = inDataL[intReadPos] * (1 - frac) + inDataL[intReadPos + 1] * frac;
          const sR = inDataR[intReadPos] * (1 - frac) + inDataR[intReadPos + 1] * frac;
          
          const w = window[i];
          const outIndex = pos + i;
          
          if (outIndex < length) {
            outDataL[outIndex] += sL * w;
            if (channels > 1) {
              outDataR[outIndex] += sR * w;
            }
          }
        }
        
        readPos += readStep;
      }
      
      progressUpdateCtr++;
      if (progressUpdateCtr % 100 === 0) {
        onProgress(pos / length);
      }
    }
    
    // Overall compensation for overlapping windows spreading volume 
    // 4x overlap adds up to ~2.0 amplitude, divide to normalize
    const normFactor = 1.5; 
    for(let i=0; i<length; i++) {
        outDataL[i] /= normFactor;
        if (channels > 1) outDataR[i] /= normFactor;
    }

    return outBuffer;
  }
}
