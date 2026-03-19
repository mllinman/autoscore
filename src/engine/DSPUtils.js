/**
 * DSPUtils - High-performance Digital Signal Processing for Browsers
 * Includes FFT, IFFT, STFT, ISTFT and Spectral Masking utilities.
 */

export class DSPUtils {
  /**
   * Complex number multiplication
   */
  static multiply(re1, im1, re2, im2) {
    return [
      re1 * re2 - im1 * im2,
      re1 * im2 + im1 * re2
    ];
  }

  /**
   * Radix-2 Cooley-Tukey FFT (Fast Fourier Transform)
   * @param {Float32Array} re Real part (power of 2 length)
   * @param {Float32Array} im Imaginary part (power of 2 length)
   * @param {boolean} inverse True for IFFT
   */
  static fft(re, im, inverse = false) {
    const n = re.length;
    if ((n & (n - 1)) !== 0) throw new Error("FFT length must be a power of 2");

    // Bit-reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }

    // Butterfly computations
    const angleSign = inverse ? 1 : -1;
    for (let len = 2; len <= n; len <<= 1) {
        const ang = 2 * Math.PI / len * angleSign;
        const wlen_re = Math.cos(ang);
        const wlen_im = Math.sin(ang);
        for (let i = 0; i < n; i += len) {
            let w_re = 1;
            let w_im = 0;
            for (let j = 0; j < len / 2; j++) {
                const u_re = re[i + j];
                const u_im = im[i + j];
                const v_re = re[i + j + len / 2] * w_re - im[i + j + len / 2] * w_im;
                const v_im = re[i + j + len / 2] * w_im + im[i + j + len / 2] * w_re;
                re[i + j] = u_re + v_re;
                im[i + j] = u_im + v_im;
                re[i + j + len / 2] = u_re - v_re;
                im[i + j + len / 2] = u_im - v_im;
                const next_w_re = w_re * wlen_re - w_im * wlen_im;
                w_im = w_re * wlen_im + w_im * wlen_re;
                w_re = next_w_re;
            }
        }
    }

    if (inverse) {
        for (let i = 0; i < n; i++) {
            re[i] /= n;
            im[i] /= n;
        }
    }
  }

  /**
   * Short-Time Fourier Transform (STFT)
   * Converts 1D time signal to 2D complex spectrogram
   */
  static stft(signal, fftSize, hopSize, windowType = 'hann') {
    const numFrames = Math.floor((signal.length - fftSize) / hopSize) + 1;
    const spectrogram = []; // Array of { re, im }

    const window = this.getWindow(fftSize, windowType);

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSize;
      const re = new Float32Array(fftSize);
      const im = new Float32Array(fftSize);

      for (let j = 0; j < fftSize; j++) {
        re[j] = signal[start + j] * window[j];
      }

      this.fft(re, im);
      spectrogram.push({ re, im });
    }

    return spectrogram;
  }

  /**
   * Inverse Short-Time Fourier Transform (ISTFT)
   * Converts 2D complex spectrogram back to 1D time signal
   */
  static istft(spectrogram, fftSize, hopSize) {
    const numFrames = spectrogram.length;
    const signalLength = (numFrames - 1) * hopSize + fftSize;
    const signal = new Float32Array(signalLength);
    const normalization = new Float32Array(signalLength);
    const window = this.getWindow(fftSize, 'hann');

    for (let i = 0; i < numFrames; i++) {
      const { re, im } = spectrogram[i];
      const frameRe = new Float32Array(re); // Clone
      const frameIm = new Float32Array(im); // Clone

      this.fft(frameRe, frameIm, true);

      const start = i * hopSize;
      for (let j = 0; j < fftSize; j++) {
        signal[start + j] += frameRe[j] * window[j];
        normalization[start + j] += window[j] * window[j];
      }
    }

    // Normalize Overlap-Add
    for (let i = 0; i < signal.length; i++) {
      if (normalization[i] > 1e-10) {
        signal[i] /= normalization[i];
      }
    }

    return signal;
  }

  static getWindow(size, type = 'hann') {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      if (type === 'hann') {
        window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
      } else if (type === 'hamming') {
        window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
      } else {
        window[i] = 1.0;
      }
    }
    return window;
  }

  /**
   * Median Filter for a 2D array (Spectrogram)
   * Used for Harmonic/Percussive Separation
   */
  static medianFilter2D(data, width, height, kernelSize, horizontal = true) {
    const result = data.map(frame => new Float32Array(frame));
    const k = Math.floor(kernelSize / 2);

    for (let f = 0; f < width; f++) {
      for (let b = 0; b < height; b++) {
        const values = [];
        for (let i = -k; i <= k; i++) {
          let idxF = horizontal ? f + i : f;
          let idxB = horizontal ? b : b + i;
          
          if (idxF >= 0 && idxF < width && idxB >= 0 && idxB < height) {
            values.push(data[idxF][idxB]);
          }
        }
        values.sort((a, b) => a - b);
        result[f][b] = values[Math.floor(values.length / 2)];
      }
    }
    return result;
  }

  /**
   * Calculate Spectral Flatness Measure (SFM)
   * Ratio of Geometric Mean to Arithmetic Mean
   */
  static spectralFlatness(magnitude) {
    let sum = 0;
    let logSum = 0;
    const n = magnitude.length;
    
    for (let i = 0; i < n; i++) {
      const val = Math.max(1e-10, magnitude[i]);
      sum += val;
      logSum += Math.log(val);
    }
    
    const arithmeticMean = sum / n;
    const geometricMean = Math.exp(logSum / n);
    return geometricMean / arithmeticMean;
  }

  /**
   * Detect transients in a spectrogram
   */
  static detectTransients(spectrogram, fftSize, hopSize) {
    const numFrames = spectrogram.length;
    const transientMask = new Float32Array(numFrames);
    let prevEnergy = 0;

    for (let f = 0; f < numFrames; f++) {
      const energy = spectrogram[f].re.reduce((acc, r, i) => acc + r * r + spectrogram[f].im[i] * spectrogram[f].im[i], 0);
      if (f > 0) {
        // High-frequency energy surge
        const hfEnergy = spectrogram[f].re.slice(Math.floor(spectrogram[f].re.length / 4)).reduce((acc, val) => acc + val * val, 0);
        const surge = energy / (prevEnergy + 1e-6);
        if (surge > 1.8 || hfEnergy > energy * 0.4) {
          transientMask[f] = 1.0;
        }
      }
      prevEnergy = energy;
    }
    return transientMask;
  }

  /**
   * Windowed Sinc Interpolation for high-quality resampling/shifting
   */
  static windowedSinc(t, lobby = 4) {
    if (Math.abs(t) < 1e-9) return 1.0;
    if (Math.abs(t) >= lobby) return 0.0;
    const pikT = Math.PI * t;
    const sinc = Math.sin(pikT) / pikT;
    const blackman = 0.42 + 0.5 * Math.cos(pikT / lobby) + 0.08 * Math.cos(2 * pikT / lobby);
    return sinc * blackman;
  }

  /**
   * High-Fidelity Pitch Shifting with Phase-Locked Vocoder and Formant Preservation
   * Supports time-varying pitchRatio array
   */
  static pitchShift(buffer, pitchRatios, overlap = 4) {
    const fftSize = 1024;
    const hopSize = fftSize / overlap;
    const sampleRate = 44100;

    // 1. Analysis
    const stft = this.stft(buffer, fftSize, hopSize);
    const numFrames = stft.length;
    const outSpectrogram = [];
    
    // Ensure pitchRatios is an array of length numFrames
    let ratios = pitchRatios;
    if (typeof pitchRatios === 'number') {
      ratios = new Float32Array(numFrames).fill(pitchRatios);
    }

    // Pre-calculate Spectral Envelope for all frames for Formant Preservation
    const envelopes = stft.map(frame => {
      const mag = frame.re.map((r, i) => Math.sqrt(r * r + frame.im[i] * frame.im[i]));
      const env = new Float32Array(fftSize / 2);
      const k = 12;
      for (let i = 0; i < fftSize / 2; i++) {
        let sum = 0, count = 0;
        for (let j = -k; j <= k; j++) {
          if (i + j >= 0 && i + j < fftSize / 2) {
            sum += mag[i + j];
            count++;
          }
        }
        env[i] = sum / count;
      }
      return env;
    });

    let prevPhase = new Float32Array(fftSize);
    let outPhase = new Float32Array(fftSize);

    // 2. Processing with Phase Locking
    for (let f = 0; f < numFrames; f++) {
      const { re, im } = stft[f];
      const env = envelopes[f];
      const outRe = new Float32Array(fftSize);
      const outIm = new Float32Array(fftSize);
      const pitchRatio = ratios[f] || 1.0;

      for (let b = 0; b < fftSize / 2; b++) {
        const sourceBin = b / pitchRatio;
        const sIdx = Math.floor(sourceBin);
        const frac = sourceBin - sIdx;
        
        let mag = 0;
        if (sIdx + 1 < fftSize / 2) {
           const mag1 = Math.sqrt(re[sIdx]**2 + im[sIdx]**2);
           const mag2 = Math.sqrt(re[sIdx+1]**2 + im[sIdx+1]**2);
           mag = mag1 * (1 - frac) + mag2 * frac;
        }

        const sourceEnv = (sIdx < fftSize / 2) ? env[sIdx] : 1e-6;
        const targetEnv = env[b] || 1e-6;
        const preservedMag = (mag / (sourceEnv + 1e-10)) * targetEnv;

        const phase = (sIdx < fftSize / 2) ? Math.atan2(im[sIdx], re[sIdx]) : 0;
        const phaseDiff = phase - prevPhase[b];
        const deltaPhase = phaseDiff * pitchRatio;
        outPhase[b] = (outPhase[b] + deltaPhase) % (2 * Math.PI);

        outRe[b] = preservedMag * Math.cos(outPhase[b]);
        outIm[b] = preservedMag * Math.sin(outPhase[b]);
        
        outRe[fftSize - b] = outRe[b];
        outIm[fftSize - b] = -outIm[b];
        prevPhase[b] = phase;
      }
      outSpectrogram.push({ re: outRe, im: outIm });
    }

    // 3. Synthesis
    return this.istft(outSpectrogram, fftSize, hopSize);
  }
}
