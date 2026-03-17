/**
 * MusicXML Exporter - Generates MusicXML from transcription data
 */

import { midiToNoteName } from '../utils/musicTheory';
import { NOTE_NAMES } from '../utils/constants';

export class MusicXMLExporter {
    /**
     * Export notes as MusicXML
     */
    static exportMusicXML(notes, measures, instrument, tempo, timeSignature, keySignature, fileName) {
        const xml = this.buildMusicXML(notes, measures, instrument, tempo, timeSignature, keySignature);
        const blob = new Blob([xml], { type: 'application/vnd.recordare.musicxml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName || 'autoscore-export'}.musicxml`;
        a.click();
        URL.revokeObjectURL(url);
    }

    static buildMusicXML(notes, measures, instrument, tempo, timeSignature, keySignature) {
        const divisions = 4; // divisions per quarter note

        // Group notes by measure
        const notesByMeasure = new Map();
        for (const note of notes) {
            const measureNum = measures.findIndex(
                m => note.startTime >= m.startTime && note.startTime < m.endTime
            );
            const mNum = measureNum >= 0 ? measureNum : 0;
            if (!notesByMeasure.has(mNum)) notesByMeasure.set(mNum, []);
            notesByMeasure.get(mNum).push(note);
        }

        // Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${this.escapeXML(fileName || 'Untitled')}</work-title>
  </work>
  <identification>
    <creator type="composer">AutoScore Transcription</creator>
    <encoding>
      <software>AutoScore</software>
      <encoding-date>${new Date().toISOString().split('T')[0]}</encoding-date>
    </encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>${instrument.name}</part-name>
    </score-part>
  </part-list>
  <part id="P1">`;

        const numMeasures = Math.max(measures.length, 1);
        for (let m = 0; m < numMeasures; m++) {
            xml += `\n    <measure number="${m + 1}">`;

            if (m === 0) {
                xml += `
      <attributes>
        <divisions>${divisions}</divisions>
        <key>
          <fifths>${this.keyToFifths(keySignature)}</fifths>
        </key>
        <time>
          <beats>${timeSignature.num}</beats>
          <beat-type>${timeSignature.den}</beat-type>
        </time>
        <clef>
          <sign>${instrument.clef === 'bass' ? 'F' : 'G'}</sign>
          <line>${instrument.clef === 'bass' ? 4 : 2}</line>
        </clef>
      </attributes>
      <direction placement="above">
        <direction-type>
          <metronome>
            <beat-unit>quarter</beat-unit>
            <per-minute>${tempo}</per-minute>
          </metronome>
        </direction-type>
      </direction>`;
            }

            const measureNotes = notesByMeasure.get(m) || [];
            if (measureNotes.length === 0) {
                // Rest for whole measure
                xml += `
      <note>
        <rest/>
        <duration>${divisions * timeSignature.num}</duration>
        <type>whole</type>
      </note>`;
            } else {
                for (const note of measureNotes) {
                    const { step, octave, alter } = this.midiToMusicXMLPitch(note.midi);
                    const durationBeats = Math.max(1, Math.round(note.duration * tempo / 60 * divisions));
                    const type = this.durationToType(note.duration * tempo / 60);

                    xml += `
      <note>
        <pitch>
          <step>${step}</step>${alter !== 0 ? `\n          <alter>${alter}</alter>` : ''}
          <octave>${octave}</octave>
        </pitch>
        <duration>${durationBeats}</duration>
        <type>${type}</type>
      </note>`;
                }
            }

            xml += `\n    </measure>`;
        }

        xml += `\n  </part>\n</score-partwise>`;
        return xml;
    }

    static midiToMusicXMLPitch(midi) {
        const noteNames = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
        const alters = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
        const noteIndex = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        return {
            step: noteNames[noteIndex],
            octave,
            alter: alters[noteIndex],
        };
    }

    static durationToType(beats) {
        if (beats >= 3.5) return 'whole';
        if (beats >= 1.5) return 'half';
        if (beats >= 0.75) return 'quarter';
        if (beats >= 0.375) return 'eighth';
        return '16th';
    }

    static keyToFifths(key) {
        const fifthsMap = { 'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4 };
        return fifthsMap[key] || 0;
    }

    static escapeXML(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
}
