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
}
