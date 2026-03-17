/**
 * Beat Detector - Autocorrelation-based tempo estimation and beat tracking
 */

export class BeatDetector {
    constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.minBPM = 40;
        this.maxBPM = 220;
    }

    /**
     * Detect tempo and beat positions from onset data
     */
    detectBeats(audioBuffer, onsets) {
        // Estimate tempo from onset intervals
        const tempo = this.estimateTempo(onsets);

        // Generate beat grid aligned to onsets
        const beats = this.generateBeatGrid(audioBuffer.duration, tempo, onsets);

        // Infer time signature
        const timeSignature = this.inferTimeSignature(onsets, tempo);

        return { tempo, beats, timeSignature };
    }

    /**
     * Estimate tempo from onset intervals using autocorrelation
     */
    estimateTempo(onsets) {
        if (onsets.length < 3) return 120; // Default

        // Compute inter-onset intervals
        const intervals = [];
        for (let i = 1; i < onsets.length; i++) {
            const interval = onsets[i].time - onsets[i - 1].time;
            if (interval > 0.1 && interval < 2.0) {
                intervals.push(interval);
            }
        }

        if (intervals.length === 0) return 120;

        // Create histogram of intervals
        const minInterval = 60 / this.maxBPM;
        const maxInterval = 60 / this.minBPM;
        const resolution = 0.005;
        const bins = Math.floor((maxInterval - minInterval) / resolution);
        const histogram = new Float32Array(bins);

        for (const interval of intervals) {
            // Check fundamental and multiples
            for (let mult = 1; mult <= 4; mult++) {
                const adj = interval / mult;
                if (adj >= minInterval && adj <= maxInterval) {
                    const binIndex = Math.floor((adj - minInterval) / resolution);
                    if (binIndex >= 0 && binIndex < bins) {
                        histogram[binIndex] += 1 / mult; // Weight lower multiples more
                    }
                }
            }
        }

        // Smooth histogram
        const smoothed = this.gaussianSmooth(histogram, 3);

        // Find peak
        let maxVal = 0;
        let maxIdx = 0;
        for (let i = 0; i < smoothed.length; i++) {
            if (smoothed[i] > maxVal) {
                maxVal = smoothed[i];
                maxIdx = i;
            }
        }

        const bestInterval = minInterval + maxIdx * resolution;
        const bpm = Math.round(60 / bestInterval);

        return Math.max(this.minBPM, Math.min(this.maxBPM, bpm));
    }

    /**
     * Generate a beat grid aligned to detected onsets
     */
    generateBeatGrid(duration, tempo, onsets) {
        const beatDuration = 60 / tempo;
        const beats = [];

        // Find the best starting offset by checking onset alignment
        let bestOffset = 0;
        let bestScore = -1;

        for (let offset = 0; offset < beatDuration; offset += 0.01) {
            let score = 0;
            for (const onset of onsets) {
                const distToBeat = Math.abs(((onset.time - offset) % beatDuration));
                const minDist = Math.min(distToBeat, beatDuration - distToBeat);
                if (minDist < 0.05) score += onset.strength;
            }
            if (score > bestScore) {
                bestScore = score;
                bestOffset = offset;
            }
        }

        // Generate beats
        for (let t = bestOffset; t < duration; t += beatDuration) {
            beats.push({
                time: t,
                isDownbeat: beats.length % 4 === 0,
                beatNumber: beats.length % 4 + 1,
                measureNumber: Math.floor(beats.length / 4) + 1,
            });
        }

        return beats;
    }

    /**
     * Infer time signature from onset patterns
     */
    inferTimeSignature(onsets, tempo) {
        // Simple heuristic: check accent patterns
        const beatDuration = 60 / tempo;

        // Check if onsets cluster in groups of 3 or 4
        let score3 = 0;
        let score4 = 0;

        for (const onset of onsets) {
            const beatPos3 = (onset.time % (beatDuration * 3)) / (beatDuration * 3);
            const beatPos4 = (onset.time % (beatDuration * 4)) / (beatDuration * 4);

            if (beatPos3 < 0.1 || beatPos3 > 0.9) score3 += onset.strength;
            if (beatPos4 < 0.1 || beatPos4 > 0.9) score4 += onset.strength;
        }

        if (score3 > score4 * 1.2) {
            return { num: 3, den: 4 };
        }
        return { num: 4, den: 4 };
    }

    /**
     * Gaussian smoothing for histogram
     */
    gaussianSmooth(data, sigma) {
        const kernelSize = sigma * 6 + 1;
        const kernel = new Float32Array(kernelSize);
        const center = Math.floor(kernelSize / 2);

        for (let i = 0; i < kernelSize; i++) {
            const x = i - center;
            kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
        }

        // Normalize kernel
        const sum = kernel.reduce((a, b) => a + b, 0);
        for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

        // Convolve
        const result = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            let val = 0;
            for (let j = 0; j < kernelSize; j++) {
                const idx = i - center + j;
                if (idx >= 0 && idx < data.length) {
                    val += data[idx] * kernel[j];
                }
            }
            result[i] = val;
        }

        return result;
    }
}
