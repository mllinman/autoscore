import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { midiToTabPosition, midiToNoteName } from '../utils/musicTheory';
import { Guitar } from 'lucide-react';

/**
 * TablatureViewer - Guitar/bass tablature display
 * Shows fret numbers on string lines, synchronized with the score
 */
export default function TablatureViewer() {
  const { state } = useApp();
  const { notes, instrument, measures, tempo, currentTime } = state;

  // Calculate tab positions for each note
  const tabNotes = useMemo(() => {
    if (!instrument.tuning || !instrument.useTab || notes.length === 0) return [];

    return notes.map(note => {
      const pos = midiToTabPosition(note.midi, instrument.tuning);
      return {
        ...note,
        tabString: pos ? pos.string : 0,
        tabFret: pos ? pos.fret : '?',
        hasPosition: pos !== null,
      };
    }).filter(n => n.hasPosition);
  }, [notes, instrument]);

  // Group notes into measures for display
  const measuredNotes = useMemo(() => {
    if (measures.length === 0 || tabNotes.length === 0) return [tabNotes];

    const groups = [];
    for (const measure of measures) {
      const measureNotes = tabNotes.filter(
        n => n.startTime >= measure.startTime && n.startTime < measure.endTime
      );
      if (measureNotes.length > 0) {
        groups.push({ measure, notes: measureNotes });
      }
    }

    return groups.length > 0 ? groups : [{ measure: null, notes: tabNotes }];
  }, [tabNotes, measures]);

  if (!instrument.useTab) {
    return (
      <div className="notation-empty">
        <Guitar size={48} />
        <p>Tablature is available for guitar, bass, and ukulele.<br />
           Select a string instrument to see tabs.</p>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="notation-empty">
        <Guitar size={48} />
        <p>Upload an audio file to see tablature</p>
      </div>
    );
  }

  const strings = instrument.strings || 6;
  const stringLabels = instrument.id === 'bass'
    ? ['G', 'D', 'A', 'E']
    : instrument.id === 'ukulele'
    ? ['A', 'E', 'C', 'G']
    : ['e', 'B', 'G', 'D', 'A', 'E'];

  return (
    <div className="tablature-container">
      {measuredNotes.map((group, gi) => {
        const groupNotes = group.notes || group;
        const measure = group.measure;

        return (
          <div className="tab-system" key={gi} style={{ marginBottom: 'var(--space-lg)' }}>
            {/* Measure number */}
            {measure && (
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--accent-tertiary)',
                marginBottom: 'var(--space-sm)',
                opacity: 0.6,
              }}>
                Measure {measure.number}
              </div>
            )}

            {/* Tab staff */}
            <div className="tab-staff">
              {Array.from({ length: strings }, (_, s) => {
                // Get notes on this string
                const stringNotes = groupNotes.filter(n => n.tabString === s);

                return (
                  <div className="tab-string" key={s}>
                    <span className="tab-string-label">{stringLabels[s] || s}</span>
                    {/* Horizontal line */}
                    <div style={{
                      flex: 1,
                      borderBottom: '1px solid var(--text-tertiary)',
                      position: 'relative',
                      opacity: 0.4,
                      height: '100%',
                    }}>
                      {stringNotes.map((note, ni) => {
                        // Position along the measure
                        const startPos = measure
                          ? (note.startTime - measure.startTime) / (measure.endTime - measure.startTime)
                          : ni / (groupNotes.length || 1);

                        const isPlaying = note.startTime <= currentTime && note.endTime > currentTime;
                        const isSelected = state.selectedNotes.some(n => n.id === note.id);

                        return (
                          <span
                            key={note.id}
                            className="tab-fret"
                            style={{
                              left: `${Math.max(5, startPos * 90 + 5)}%`,
                              color: isPlaying
                                ? 'var(--color-success)'
                                : isSelected
                                ? 'var(--color-warning)'
                                : 'var(--text-primary)',
                              fontWeight: isPlaying ? 700 : 600,
                              textShadow: isPlaying ? '0 0 8px var(--color-success)' : 'none',
                              top: '50%',
                              transform: 'translateY(-50%)',
                            }}
                            title={`${note.noteName} (fret ${note.tabFret})`}
                          >
                            {note.tabFret}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
