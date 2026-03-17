/**
 * MIDI Exporter - Generates Standard MIDI File (SMF) from transcription data
 */

export class MIDIExporter {
    /**
     * Export notes as MIDI file
     */
    static exportMIDI(notes, tempo, timeSignature, instrument, fileName) {
        const midiData = this.buildMIDI(notes, tempo, timeSignature, instrument);
        const blob = new Blob([midiData], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName || 'autoscore-export'}.mid`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Build a standard MIDI file (format 0)
     */
    static buildMIDI(notes, tempo, timeSignature, instrument) {
        const ticksPerBeat = 480;
        const events = [];

        // Tempo event
        const microsecondsPerBeat = Math.round(60000000 / tempo);
        events.push({
            delta: 0,
            data: [0xFF, 0x51, 0x03,
                (microsecondsPerBeat >> 16) & 0xFF,
                (microsecondsPerBeat >> 8) & 0xFF,
                microsecondsPerBeat & 0xFF],
        });

        // Time signature event
        events.push({
            delta: 0,
            data: [0xFF, 0x58, 0x04,
                timeSignature.num,
                Math.round(Math.log2(timeSignature.den)),
                24, 8],
        });

        // Track name
        const trackName = instrument?.name || 'AutoScore Track';
        const nameBytes = Array.from(new TextEncoder().encode(trackName));
        events.push({
            delta: 0,
            data: [0xFF, 0x03, nameBytes.length, ...nameBytes],
        });

        // Sort notes by start time
        const sortedNotes = [...notes].sort((a, b) => a.startTime - b.startTime);

        // Convert notes to MIDI events (note on/off pairs)
        const midiEvents = [];
        for (const note of sortedNotes) {
            const startTick = Math.round(note.startTime * tempo / 60 * ticksPerBeat);
            const endTick = Math.round(note.endTime * tempo / 60 * ticksPerBeat);
            const velocity = Math.min(127, Math.max(1, note.velocity || 80));

            midiEvents.push({
                tick: startTick,
                data: [0x90, note.midi, velocity], // Note On
            });
            midiEvents.push({
                tick: endTick,
                data: [0x80, note.midi, 0], // Note Off
            });
        }

        // Sort by tick, convert to delta times
        midiEvents.sort((a, b) => a.tick - b.tick);
        let lastTick = 0;
        for (const evt of midiEvents) {
            events.push({
                delta: evt.tick - lastTick,
                data: evt.data,
            });
            lastTick = evt.tick;
        }

        // End of track
        events.push({
            delta: 0,
            data: [0xFF, 0x2F, 0x00],
        });

        // Build track data
        const trackData = [];
        for (const event of events) {
            trackData.push(...this.encodeVLQ(event.delta));
            trackData.push(...event.data);
        }

        // Build full MIDI file
        const header = [
            0x4D, 0x54, 0x68, 0x64, // "MThd"
            0x00, 0x00, 0x00, 0x06, // Header length
            0x00, 0x00,             // Format 0
            0x00, 0x01,             // 1 track
            (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF, // Ticks per beat
        ];

        const trackHeader = [
            0x4D, 0x54, 0x72, 0x6B, // "MTrk"
            (trackData.length >> 24) & 0xFF,
            (trackData.length >> 16) & 0xFF,
            (trackData.length >> 8) & 0xFF,
            trackData.length & 0xFF,
        ];

        const fullData = new Uint8Array([...header, ...trackHeader, ...trackData]);
        return fullData.buffer;
    }

    /**
     * Encode variable-length quantity
     */
    static encodeVLQ(value) {
        if (value < 0) value = 0;
        if (value < 128) return [value];

        const bytes = [];
        bytes.push(value & 0x7F);
        value >>= 7;

        while (value > 0) {
            bytes.push((value & 0x7F) | 0x80);
            value >>= 7;
        }

        return bytes.reverse();
    }
}
