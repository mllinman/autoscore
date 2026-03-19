import MidiWriter from 'midi-writer-js';

export const exportToMidi = (notes, fileName = 'autoscore_project.mid') => {
  if (!notes || notes.length === 0) {
    console.warn('No notes to export.');
    return;
  }

  const track = new MidiWriter.Track();
  
  // Set default tempo (can be expanded to use state.tempo)
  track.setTempo(120);
  track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: 1 })); // Piano

  // Group notes into events
  // midi-writer-js uses ticks or durations like '4' (quarter)
  // We'll calculate ticks based on startTime (simplified mapping)
  
  notes.sort((a, b) => a.startTime - b.startTime).forEach(note => {
    // Basic mapping: 1 second = 512 ticks (approx)
    const startTick = Math.round(note.startTime * 512);
    const durationTicks = Math.round((note.endTime - note.startTime) * 512);

    track.addEvent(new MidiWriter.NoteEvent({
      pitch: [note.midi || note.pitch],
      duration: 't' + durationTicks,
      startTick: startTick,
      velocity: Math.floor((note.velocity || 0.8) * 100)
    }));
  });

  const write = new MidiWriter.Writer(track);
  const dataUri = write.dataUri();
  
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = fileName;
  link.click();
};
