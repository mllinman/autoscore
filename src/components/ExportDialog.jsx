import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EXPORT_FORMATS } from '../utils/constants';
import { PDFExporter } from '../export/PDFExporter';
import { MusicXMLExporter } from '../export/MusicXMLExporter';
import { MIDIExporter } from '../export/MIDIExporter';
import { X, FileText, FileCode, Music, Download, Check, BarChart3, Table } from 'lucide-react';
import { saveAs } from 'file-saver';

const allFormats = [
  { id: 'pdf', name: 'PDF', description: 'Sheet music document', extension: '.pdf', icon: FileText },
  { id: 'musicxml', name: 'MusicXML', description: 'Notation interchange', extension: '.musicxml', icon: FileCode },
  { id: 'midi', name: 'MIDI', description: 'Standard MIDI file', extension: '.mid', icon: Music },
  { id: 'csv_notes', name: 'Note Timing', description: 'CSV note & beat data', extension: '.csv', icon: Table },
  { id: 'csv_spectrogram', name: 'Spectrogram', description: 'Amplitude data', extension: '.txt', icon: BarChart3 },
];

export default function ExportDialog() {
  const { state, dispatch } = useApp();
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [midiOptions, setMidiOptions] = useState({
    transpose: 0,
    constantVelocity: false,
    velocityValue: 80,
    timingMode: 'auto', // 'auto' | 'annotated' | 'constant'
    useMusicalTiming: true,
  });

  if (!state.showExportDialog) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportDone(false);

    const fileName = state.fileName?.replace(/\.[^.]+$/, '') || 'autoscore-export';

    try {
      switch (selectedFormat) {
        case 'pdf':
          await PDFExporter.exportPDF(
            state.notes, state.measures, state.instrument,
            state.tempo, state.timeSignature, state.keySignature, fileName
          );
          break;
        case 'musicxml':
          MusicXMLExporter.exportMusicXML(
            state.notes, state.measures, state.instrument,
            state.tempo, state.timeSignature, state.keySignature, fileName
          );
          break;
        case 'midi':
          MIDIExporter.exportMIDI(
            state.notes, state.tempo, state.timeSignature, state.instrument, fileName
          );
          break;
        case 'csv_notes': {
          let csv = 'type,time,end_time,midi,note_name,duration,confidence,group\n';
          for (const n of state.notes) {
            csv += `note,${n.startTime.toFixed(4)},${n.endTime.toFixed(4)},${n.midi},${n.noteName},${n.duration.toFixed(4)},${(n.confidence || 0).toFixed(3)},${n.group || 0}\n`;
          }
          if (state.beats) {
            csv += '\ntype,time,is_downbeat,measure_number\n';
            for (const b of state.beats) {
              csv += `beat,${b.time.toFixed(4)},${b.isDownbeat ? 1 : 0},${b.measureNumber || ''}\n`;
            }
          }
          const csvBlob = new Blob([csv], { type: 'text/csv' });
          saveAs(csvBlob, `${fileName}_timing.csv`);
          break;
        }
        case 'csv_spectrogram': {
          if (!state.spectrogramData) {
            alert('Spectrogram data not available. View the spectrogram first.');
            setIsExporting(false);
            return;
          }
          const { data, frequencies, times } = state.spectrogramData;
          let text = frequencies.map(f => f.toFixed(2)).join('\t') + '\n';
          text += Array.from(times).map(t => t.toFixed(4)).join('\t') + '\n';
          for (const frame of data) {
            text += Array.from(frame).map(a => a.toFixed(4)).join('\t') + '\n';
          }
          const specBlob = new Blob([text], { type: 'text/plain' });
          saveAs(specBlob, `${fileName}_spectrogram.txt`);
          break;
        }
      }

      setExportDone(true);
      setTimeout(() => { setExportDone(false); setIsExporting(false); }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting file. Please try again.');
      setIsExporting(false);
    }
  };

  const close = () => dispatch({ type: 'TOGGLE_EXPORT_DIALOG' });
  const selectedFormatObj = allFormats.find(f => f.id === selectedFormat);

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Download size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Export Score
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            Choose a format to export your transcription.
          </p>

          {/* Format cards */}
          <div className="export-format-grid">
            {allFormats.map(format => {
              const Icon = format.icon;
              return (
                <div
                  key={format.id}
                  className={`export-format-card ${selectedFormat === format.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <Icon size={22} />
                  <strong>{format.name}</strong>
                  <span>{format.description}</span>
                </div>
              );
            })}
          </div>

          {/* MIDI Options */}
          {selectedFormat === 'midi' && (
            <div style={{
              marginTop: 'var(--space-lg)',
              padding: 'var(--space-md)',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div className="panel-section-title" style={{ marginBottom: 'var(--space-md)' }}>MIDI Options</div>
              <div className="measure-editor-grid">
                <div className="measure-field">
                  <label>Transpose</label>
                  <input
                    type="number"
                    className="input"
                    style={{ width: '100%' }}
                    min="-24"
                    max="24"
                    value={midiOptions.transpose}
                    onChange={e => setMidiOptions(o => ({ ...o, transpose: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="measure-field">
                  <label>Timing</label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={midiOptions.timingMode}
                    onChange={e => setMidiOptions(o => ({ ...o, timingMode: e.target.value }))}
                  >
                    <option value="auto">Auto-detected</option>
                    <option value="annotated">User tempos</option>
                    <option value="constant">Constant 120 BPM</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={midiOptions.constantVelocity}
                  onChange={e => setMidiOptions(o => ({ ...o, constantVelocity: e.target.checked }))}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Constant velocity
                {midiOptions.constantVelocity && (
                  <input
                    type="number"
                    className="input"
                    style={{ width: 48, marginLeft: 4 }}
                    min="1"
                    max="127"
                    value={midiOptions.velocityValue}
                    onChange={e => setMidiOptions(o => ({ ...o, velocityValue: parseInt(e.target.value) || 80 }))}
                  />
                )}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'var(--space-xs)', fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={midiOptions.useMusicalTiming}
                  onChange={e => setMidiOptions(o => ({ ...o, useMusicalTiming: e.target.checked }))}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Use musical (rounded) timing
              </label>
            </div>
          )}

          {/* Export info */}
          <div style={{
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div className="property-row">
              <span className="property-label">File name</span>
              <span className="property-value">
                {(state.fileName?.replace(/\.[^.]+$/, '') || 'autoscore-export')}{selectedFormatObj?.extension}
              </span>
            </div>
            <div className="property-row">
              <span className="property-label">Notes</span>
              <span className="property-value">{state.notes.length}</span>
            </div>
            <div className="property-row">
              <span className="property-label">Instrument</span>
              <span className="property-value">{state.instrument.name}</span>
            </div>
            <div className="property-row" style={{ marginBottom: 0 }}>
              <span className="property-label">Tempo</span>
              <span className="property-value">{state.tempo} BPM</span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={close}>Cancel</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={isExporting}>
            {exportDone ? <><Check size={16} /> Exported!</> : isExporting ? 'Exporting...' : <><Download size={16} /> Export</>}
          </button>
        </div>
      </div>
    </div>
  );
}
