import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EXPORT_FORMATS } from '../utils/constants';
import { PDFExporter } from '../export/PDFExporter';
import { MusicXMLExporter } from '../export/MusicXMLExporter';
import { MIDIExporter } from '../export/MIDIExporter';
import { X, FileText, FileCode, Music, Download, Check } from 'lucide-react';

const formatIcons = {
  pdf: FileText,
  musicxml: FileCode,
  midi: Music,
};

export default function ExportDialog() {
  const { state, dispatch } = useApp();
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);

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
      }

      setExportDone(true);
      setTimeout(() => {
        setExportDone(false);
        setIsExporting(false);
      }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      alert('Error exporting file. Please try again.');
      setIsExporting(false);
    }
  };

  const close = () => dispatch({ type: 'TOGGLE_EXPORT_DIALOG' });

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
          <p style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-xl)',
          }}>
            Choose a format to export your transcription.
          </p>

          {/* Format cards */}
          <div className="export-format-grid">
            {EXPORT_FORMATS.map(format => {
              const Icon = formatIcons[format.id] || FileText;
              return (
                <div
                  key={format.id}
                  className={`export-format-card ${selectedFormat === format.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat(format.id)}
                >
                  <Icon size={28} />
                  <strong>{format.name}</strong>
                  <span>{format.description}</span>
                </div>
              );
            })}
          </div>

          {/* Export info */}
          <div style={{
            padding: 'var(--space-md)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div className="property-row">
              <span className="property-label">File name</span>
              <span className="property-value">
                {(state.fileName?.replace(/\.[^.]+$/, '') || 'autoscore-export')}
                {EXPORT_FORMATS.find(f => f.id === selectedFormat)?.extension}
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
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {exportDone ? (
              <>
                <Check size={16} />
                Exported!
              </>
            ) : isExporting ? (
              'Exporting...'
            ) : (
              <>
                <Download size={16} />
                Export {EXPORT_FORMATS.find(f => f.id === selectedFormat)?.name}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
