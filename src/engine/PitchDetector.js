/**
 * Pitch Detector - YIN algorithm implementation for monophonic pitch detection
 * Detects fundamental frequency (F0) from audio samples
 */

export class PitchDetector {
    constructor(sampleRate = 44100) {
        this.sampleRate = sampleRate;
        this.threshold = 0.15;
        this.probabilityThreshold = 0.7;
    }

    /**
     * Detect pitch using YIN algorithm
     * Returns { frequency, confidence } or null if no pitch detected
     */
    detect(audioFrame) {
        const bufferSize = audioFrame.length;
        const halfSize = Math.floor(bufferSize / 2);

        // Step 1: Difference function
        const diff = new Float32Array(halfSize);
        for (let tau = 0; tau < halfSize; tau++) {
            let sum = 0;
            for (let i = 0; i < halfSize; i++) {
                const delta = audioFrame[i] - audioFrame[i + tau];
                sum += delta * delta;
            }
            diff[tau] = sum;
        }

        // Step 2: Cumulative mean normalized difference
        const cmndf = new Float32Array(halfSize);
        cmndf[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau < halfSize; tau++) {
            runningSum += diff[tau];
            cmndf[tau] = diff[tau] * tau / runningSum;
        }

        // Step 3: Absolute threshold
        let tau = -1;
        for (let i = 2; i < halfSize; i++) {
            if (cmndf[i] < this.threshold) {
                while (i + 1 < halfSize && cmndf[i + 1] < cmndf[i]) {
                    i++;
                }
                tau = i;
                break;
            }
        }

        if (tau === -1) return null;

        // Step 4: Parabolic interpolation for better accuracy
        let betterTau = tau;
        if (tau > 0 && tau < halfSize - 1) {
            const s0 = cmndf[tau - 1];
            const s1 = cmndf[tau];
            const s2 = cmndf[tau + 1];
            betterTau = tau + (s0 - s2) / (2 * (s0 - 2 * s1 + s2));
        }

        const frequency = this.sampleRate / betterTau;
        const confidence = 1 - cmndf[tau];

        if (frequency < 20 || frequency > 4400 || confidence < this.probabilityThreshold) {
            return null;
        }

        return { frequency, confidence };
    }

    /**
     * Process an entire audio buffer and return pitch data over time
     */
    processBuffer(audioBuffer, hopSize = 512, frameSize = 2048) {
        const data = audioBuffer.getChannelData(0);
        const pitches = [];
        const totalFrames = Math.floor((data.length - frameSize) / hopSize);

        for (let i = 0; i <= data.length - frameSize; i += hopSize) {
            const frame = data.slice(i, i + frameSize);
            const result = this.detect(frame);
            const time = i / this.sampleRate;

            pitches.push({
                time,
                frequency: result ? result.frequency : 0,
                confidence: result ? result.confidence : 0,
                hasPitch: result !== null,
                frameIndex: Math.floor(i / hopSize),
            });
        }

        return pitches;
    }
}
