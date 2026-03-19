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

    // 2. Magnitude Spectrograms
    onProgress(20);
    const magL = stftL.map(f => f.re.map((r, i) => Math.sqrt(r * r + f.im[i] * f.im[i])));
    const magR = stftR.map(f => f.re.map((r, i) => Math.sqrt(r * r + f.im[i] * f.im[i])));
    
    // Average Magnitude for HPS
    const magAvg = magL.map((f, i) => f.map((m, j) => (m + magR[i][j]) * 0.5));

    // 3. Harmonic/Percussive Separation (HPS)
    onProgress(35);
    // Median filter across time (Horizontal) -> Harmonic
    const harmonicRes = DSPUtils.medianFilter2D(magAvg, numFrames, numBins, 17, true);
    // Median filter across frequency (Vertical) -> Percussive
    const percussiveRes = DSPUtils.medianFilter2D(magAvg, numFrames, numBins, 17, false);

    // 4. Azimuth (Panning) Analysis
    onProgress(50);
    const pannedCenterMask = magAvg.map((f, fr) => f.map((m, b) => {
        if (m === 0) return 0;
        const diff = Math.abs(magL[fr][b] - magR[fr][b]);
        const sum = magL[fr][b] + magR[fr][b];
        // High similarity (low diff relative to sum) means center panned
        return Math.max(0, 1.0 - (diff / (sum + 1e-6)) * 2.0);
    }));

    // 5. Build Stem Masks
    onProgress(65);
    const vocalMask = [];
    const drumMask = [];
    const bassMask = [];
    const otherMask = [];

    const minFreqVocal = 150 * this.FFT_SIZE / sampleRate;
    const maxFreqVocal = 12000 * this.FFT_SIZE / sampleRate;
    const maxFreqBass = 300 * this.FFT_SIZE / sampleRate;

    for (let f = 0; f < numFrames; f++) {
        vocalMask[f] = new Float32Array(numBins);
        drumMask[f] = new Float32Array(numBins);
        bassMask[f] = new Float32Array(numBins);
        otherMask[f] = new Float32Array(numBins);

        for (let b = 0; b < numBins; b++) {
            const h = harmonicRes[f][b];
            const p = percussiveRes[f][b];
            const center = pannedCenterMask[f][b];
            const total = h + p + 1e-10;

            // Ratio-based soft masks (Wiener style)
            const hRatio = h / total;
            const pRatio = p / total;

            // DRUMS are primarily Percussive
            drumMask[f][b] = pRatio;

            // VOCALS are Harmonic, Centered, and in vocal range
            if (b > minFreqVocal && b < maxFreqVocal) {
                vocalMask[f][b] = hRatio * center * 0.9;
            }

            // BASS is Harmonic, Centered, and Low Freq
            if (b < maxFreqBass) {
                bassMask[f][b] = hRatio * center * 0.95;
                // Reduce vocal bleed in bass
                vocalMask[f][b] *= 0.1;
            }

            // OTHER is Harmonic, Wide, or Residual
            otherMask[f][b] = hRatio * (1.0 - center) + (hRatio * center * 0.1);
        }
    }

    // 6. Apply Masks and Reconstruct (ISTFT)
    onProgress(80);
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
