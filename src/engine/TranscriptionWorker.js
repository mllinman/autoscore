import { PitchDetector } from './PitchDetector';
import { OnsetDetector } from './OnsetDetector';
import { BeatDetector } from './BeatDetector';
import { NoteQuantizer } from './NoteQuantizer';
import { MusicAnalyzer } from './MusicAnalyzer';

self.onmessage = async function(e) {
  const { type, payload } = e.data;

  if (type === 'START_TRANSCRIPTION') {
    const { channelData, sampleRate, sensitivity, advancedDSP } = payload;
    
    // Fallbacks in case advancedDSP wasn't provided
    const config = {
      yinThreshold: 0.15,
      onsetSensitivity: 0.3,
      medianFilterWindow: 5,
      ...advancedDSP
    };
    
    const duration = channelData.length / sampleRate;
    const mockAudioBuffer = {
      sampleRate,
      duration,
      getChannelData: () => channelData,
    };

    const pitchDetector = new PitchDetector(sampleRate, config.yinThreshold, config.medianFilterWindow);
    const onsetDetector = new OnsetDetector(sampleRate);
    const beatDetector = new BeatDetector(sampleRate);
    const noteQuantizer = new NoteQuantizer();
    const musicAnalyzer = new MusicAnalyzer();

    const reportProgress = (progress, step) => {
      self.postMessage({ type: 'PROGRESS', payload: { progress, step } });
    };

    try {
      reportProgress(2, 'Analyzing pitch...');
      
      const pitchData = await pitchDetector.processBuffer(
        mockAudioBuffer,
        (fraction) => {
          const progress = 2 + Math.round(fraction * 56);
          reportProgress(progress, `Detecting pitches... ${Math.round(fraction * 100)}%`);
        }
      );

      reportProgress(60, 'Pitch detection complete');
      
      reportProgress(62, 'Detecting note onsets...');
      const onsets = onsetDetector.detectOnsets(mockAudioBuffer, config.onsetSensitivity);
      reportProgress(75, 'Onset detection complete');

      reportProgress(77, 'Analyzing tempo and beats...');
      const { tempo, beats, timeSignature } = beatDetector.detectBeats(mockAudioBuffer, onsets);
      reportProgress(85, 'Beat analysis complete');

      reportProgress(87, 'Quantizing notes...');
      const notes = noteQuantizer.quantize(pitchData, onsets, beats, tempo, sensitivity);
      
      reportProgress(92, 'Analyzing key and chords...');
      const detectedKey = musicAnalyzer.detectKey(notes);
      const chords = musicAnalyzer.identifyChords(notes);
      
      reportProgress(95, 'Building score...');

      // Generate measures
      const beatsPerMeasure = timeSignature.num;
      const beatDuration = 60 / tempo;
      const measureDuration = beatsPerMeasure * beatDuration;
      const numMeasures = Math.ceil(duration / measureDuration);

      const measures = [];
      for (let i = 0; i < numMeasures; i++) {
        measures.push({
          number: i + 1,
          startTime: i * measureDuration,
          endTime: (i + 1) * measureDuration,
          timeSignature: { ...timeSignature },
          tempo,
        });
      }

      reportProgress(100, 'Transcription complete!');

      self.postMessage({
        type: 'COMPLETE',
        payload: {
          notes,
          beats,
          tempo: Math.round(tempo),
          timeSignature,
          measures,
          pitchData,
          onsets,
          detectedKey,
          chords,
        }
      });

    } catch (error) {
      console.error(error);
      self.postMessage({ type: 'ERROR', payload: error.message || error.toString() });
    }
  }
};
