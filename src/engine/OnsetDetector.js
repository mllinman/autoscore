/**
 * Onset Detector - Spectral flux-based note onset detection
 * Identifies when new notes begin in an audio signal
 */

export class OnsetDetector {
    constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.fftSize = 2048;
        this.hopSize = 512;
    }

    /**
     * Compute spectral flux for onset detection
     */
    detectOnsets(audioBuffer, threshold = 0.3) {
        const data = audioBuffer.getChannelData(0);
        const numFrames = Math.floor((data.length - this.fftSize) / this.hopSize);
        const fluxValues = [];
        let prevMagnitudes = null;

        for (let frame = 0; frame < numFrames; frame++) {
            const start = frame * this.hopSize;
            const segment = data.slice(start, start + this.fftSize);

            // Apply Hann window
            const windowed = this.applyWindow(segment);

            // Compute magnitude spectrum (simplified DFT for key frequency bins)
            const magnitudes = this.computeMagnitudeSpectrum(windowed);

            if (prevMagnitudes) {
                // Compute spectral flux (only positive differences)
                let flux = 0;
                for (let i = 0; i < magnitudes.length; i++) {
                    const diff = magnitudes[i] - prevMagnitudes[i];
                    if (diff > 0) flux += diff;
                }
                fluxValues.push({
                    time: start / this.sampleRate,
                    flux,
                    frameIndex: frame,
                });
            }

            prevMagnitudes = magnitudes;
        }

        // Adaptive thresholding
        const onsets = this.adaptiveOnsetPicking(fluxValues, threshold);
        return onsets;
    }

    /**
     * Simplified magnitude spectrum using autocorrelation-based approach
     */
    computeMagnitudeSpectrum(frame) {
        const N = frame.length;
        const numBins = Math.floor(N / 4); // Use quarter of the bins
        const magnitudes = new Float32Array(numBins);

        for (let k = 0; k < numBins; k++) {
            let real = 0, imag = 0;
            const freq = k * 2 * Math.PI / N;
            for (let n = 0; n < N; n++) {
                real += frame[n] * Math.cos(freq * n);
                imag -= frame[n] * Math.sin(freq * n);
            }
            magnitudes[k] = Math.sqrt(real * real + imag * imag) / N;
        }

        return magnitudes;
    }

    /**
     * Apply Hann window to a frame
     */
    applyWindow(frame) {
        const windowed = new Float32Array(frame.length);
        for (let i = 0; i < frame.length; i++) {
            windowed[i] = frame[i] * 0.5 * (1 - Math.cos(2 * Math.PI * i / (frame.length - 1)));
        }
        return windowed;
    }

    /**
     * Adaptive onset picking with local median threshold
     */
    adaptiveOnsetPicking(fluxValues, sensitivity) {
        if (fluxValues.length === 0) return [];

        const windowSize = 10;
        const onsets = [];

        // Compute adaptive threshold
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
