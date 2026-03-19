/**
 * Transposes a list of notes by a number of semitones.
 */
export const transposeNotes = (notes, semitones) => {
  return notes.map(note => ({
    ...note,
    pitch: note.pitch + semitones
  }));
};

/**
 * Automatically fills gaps in measures with rests.
 * This is a simplified version for visualization.
 */
export const calculateAutoRests = (notes, measures) => {
  const rests = [];
  measures.forEach(m => {
    let lastEndTime = m.startTime;
    const measureNotes = notes
      .filter(n => n.startTime >= m.startTime && n.startTime < m.endTime)
      .sort((a, b) => a.startTime - b.startTime);

    measureNotes.forEach(n => {
      if (n.startTime > lastEndTime + 0.01) {
        rests.push({
          startTime: lastEndTime,
          endTime: n.startTime,
          type: 'rest',
          duration: n.startTime - lastEndTime
        });
      }
      lastEndTime = Math.max(lastEndTime, n.endTime);
    });

    if (lastEndTime < m.endTime - 0.01) {
      rests.push({
        startTime: lastEndTime,
        endTime: m.endTime,
        type: 'rest',
        duration: m.endTime - lastEndTime
      });
    }
  });
  return rests;
};
