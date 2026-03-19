import { DSPUtils } from './DSPUtils';

/**
 * StemEngine - Advanced Spectral Stem Separator
 * 
 * Uses state-of-the-art DSP techniques:
 * 1. STFT (Short-Time Fourier Transform)
 * 2. Harmonic/Percussive Separation (HPS) via Median Filtering
 * 3. Azimuth (Panning) Analysis for center/side isolation
 * 4. Spectral Masking and Wiener Filtering reconstructs 4 stems.
 */
export class StemEngine {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.FFT_SIZE = 2048;
    this.HOP_SIZE = 512;
  }

  /**
   * Separates audio into 4 stems: Vocals, Drums, Bass, Other
   */
  async separate(buffer, onProgress = () => {}) {
    onProgress(5);
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    let leftChannel = buffer.getChannelData(0);
    let rightChannel = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : new Float32Array(leftChannel);

    // 1. Convert to Frequency Domain (STFT)
    onProgress(10);
    const stftL = DSPUtils.stft(leftChannel, this.FFT_SIZE, this.HOP_SIZE);
    const stftR = DSPUtils.stft(rightChannel, this.FFT_SIZE, this.HOP_SIZE);
    const numFrames = stftL.length;
    const numBins = this.FFT_SIZE;
    const binToFreq = sampleRate / this.FFT_SIZE;

    // 2. Transients Analysis (High energy surges)
    onProgress(20);
    const transientMask = DSPUtils.detectTransients(stftL, this.FFT_SIZE, this.HOP_SIZE);

    // 3. Magnitude & Spatial Analysis
    onProgress(35);
    const magL = stftL.map(f => f.re.map((r, i) => Math.sqrt(r * r + f.im[i] * f.im[i])));
    const magR = stftR.map(f => f.re.map((r, i) => Math.sqrt(r * r + f.im[i] * f.im[i])));
    const magAvg = magL.map((f, i) => f.map((m, j) => (m + magR[i][j]) * 0.5));

    // 4. Harmonic/Percussive Separation (HPS) Refined
    onProgress(50);
    const harmonicRes = DSPUtils.medianFilter2D(magAvg, numFrames, numBins, 17, true);
    const percussiveRes = DSPUtils.medianFilter2D(magAvg, numFrames, numBins, 17, false);

    // Spectral Flatness for frame-based noise detection
    const flatness = magAvg.map(f => DSPUtils.spectralFlatness(f));

    // 5. Build Surgical Masks
    onProgress(70);
    const vocalMask = [];
    const drumMask = [];
    const bassMask = [];
    const otherMask = [];

    for (let f = 0; f < numFrames; f++) {
        vocalMask[f] = new Float32Array(numBins);
        drumMask[f] = new Float32Array(numBins);
        bassMask[f] = new Float32Array(numBins);
        otherMask[f] = new Float32Array(numBins);

        const isTransient = transientMask[f] > 0.5;
        const isNoisy = flatness[f] > 0.15; // Noise threshold

        for (let b = 0; b < numBins; b++) {
            const h = harmonicRes[f][b];
            const p = percussiveRes[f][b];
            const freq = b * binToFreq;
            
            // Azimuth similarity (Center Mask)
            const diff = Math.abs(magL[f][b] - magR[f][b]);
            const sum = magL[f][b] + magR[f][b];
            const center = Math.max(0, 1.0 - (diff / (sum + 1e-6)) * 2.5);

            // DRUMS Base
            let dProb = (p / (h + p + 1e-6)) * 1.5;
            if (isTransient) dProb += 0.5;
            if (isNoisy && freq > 2000) dProb += 0.3;
            drumMask[f][b] = Math.min(1.0, dProb);

            // BASS (< 300Hz, centered, harmonic)
            if (freq < 300) {
                bassMask[f][b] = (h / (h + p + 1e-6)) * center * 1.5;
                drumMask[f][b] *= 0.4; // Prioritize bass in sub regions
            }

            // VOCALS (Centered, harmonic, 200Hz - 10kHz)
            if (freq > 200 && freq < 10000) {
                let vProb = (h / (h + p + 1e-6)) * center;
                // Exclude noisy frames from vocals high-end
                if (isNoisy && freq > 4000) vProb *= 0.2;
                vocalMask[f][b] = Math.min(1.0, vProb);
            }

            // OTHER (Wide panned or residual harmonic)
            otherMask[f][b] = (h / (h + p + 1e-6)) * (1.0 - center * 0.8);
            
            // Refine cross-bleed (Soft-Max style Wiener filtering)
            const denom = vocalMask[f][b] + drumMask[f][b] + bassMask[f][b] + otherMask[f][b] + 1e-6;
            vocalMask[f][b] /= denom;
            drumMask[f][b] /= denom;
            bassMask[f][b] /= denom;
            otherMask[f][b] /= denom;
        }
    }

    // 6. Apply Masks and Reconstruct (ISTFT)
    onProgress(85);
    const applyMaskAndISTFT = (mask, stftArr) => {
        const maskedSTFT = stftArr.map((f, fr) => ({
            re: f.re.map((r, i) => r * mask[fr][i]),
            im: f.im.map((m, i) => m * mask[fr][i])
        }));
        return DSPUtils.istft(maskedSTFT, this.FFT_SIZE, this.HOP_SIZE);
    };

    const vocalsL = applyMaskAndISTFT(vocalMask, stftL);
    const vocalsR = applyMaskAndISTFT(vocalMask, stftR);
    const drumsL = applyMaskAndISTFT(drumMask, stftL);
    const drumsR = applyMaskAndISTFT(drumMask, stftR);
    const bassL = applyMaskAndISTFT(bassMask, stftL);
    const bassR = applyMaskAndISTFT(bassMask, stftR);
    const otherL = applyMaskAndISTFT(otherMask, stftL);
    const otherR = applyMaskAndISTFT(otherMask, stftR);

    onProgress(95);
    const createBuffer = (l, r) => {
        const b = this.ctx.createBuffer(2, l.length, sampleRate);
        b.getChannelData(0).set(l);
        b.getChannelData(1).set(r);
        return b;
    };

    onProgress(100);
    return {
        vocals: createBuffer(vocalsL, vocalsR),
        drums: createBuffer(drumsL, drumsR),
        bass: createBuffer(bassL, bassR),
        other: createBuffer(otherL, otherR)
    };
  }
}
