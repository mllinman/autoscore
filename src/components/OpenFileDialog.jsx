import React, { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { X, Upload, FileAudio, Music, Settings2, Clock, Zap, BarChart3 } from 'lucide-react';

/**
 * OpenFileDialog - Modal dialog for opening files with processing options
 */
export default function OpenFileDialog({ onFileReady }) {
  const { state, dispatch } = useApp();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [settings, setSettings] = useState({
    processMode: 'full',
    sectionStart: 0,
    sectionEnd: 30,
    processingMode: 'findNotes',
    frequencyResolution: 2048,
    timeStep: 512,
  });
  const fileInputRef = useRef(null);

  if (!state.showOpenDialog) return null;

  const handleFileSelect = (f) => {
    if (!f) return;
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleProcess = () => {
    if (!file) return;
    dispatch({ type: 'SET_FILE_SETTINGS', payload: settings });
    dispatch({ type: 'TOGGLE_OPEN_DIALOG' });
    if (onFileReady) onFileReady(file, settings);
  };

  const close = () => dispatch({ type: 'TOGGLE_OPEN_DIALOG' });

  const supportedFormats = [
    { ext: 'MP3', desc: 'MPEG Audio' },
    { ext: 'WAV', desc: 'Waveform Audio' },
    { ext: 'FLAC', desc: 'Free Lossless' },
    { ext: 'OGG', desc: 'Ogg Vorbis' },
    { ext: 'MIDI', desc: 'MIDI File' },
    { ext: 'XML', desc: 'MusicXML' },
  ];

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FileAudio size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Open File
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={close}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Drop zone */}
          <div
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            style={{ padding: 'var(--space-xl)', maxWidth: '100%' }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', zIndex: 1, position: 'relative' }}>
                <FileAudio size={24} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <strong style={{ display: 'block', color: 'var(--text-primary)' }}>{file.name}</strong>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="drop-zone-icon" style={{ width: 48, height: 48 }}>
                  <Upload size={22} />
                </div>
                <div className="drop-zone-text">
                  <strong>Drop file here or click to browse</strong>
                  <span>Supports audio, MIDI, and MusicXML files</span>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.flac,.ogg,.mid,.midi,.xml,.musicxml"
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </div>

          {/* Supported formats */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', justifyContent: 'center' }}>
            {supportedFormats.map(f => (
              <span key={f.ext} className="format-badge" title={f.desc}>.{f.ext}</span>
            ))}
          </div>

          {/* Time Options */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: 'var(--space-lg)',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-tertiary)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}>
              <Clock size={12} /> Time Options
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="radio"
                  name="processMode"
                  checked={settings.processMode === 'full'}
                  onChange={() => setSettings(s => ({ ...s, processMode: 'full' }))}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Full song
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="radio"
                  name="processMode"
                  checked={settings.processMode === 'section'}
                  onChange={() => setSettings(s => ({ ...s, processMode: 'section' }))}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Section of song
              </label>
            </div>

            {settings.processMode === 'section' && (
              <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                <div className="measure-field">
                  <label>Start (sec)</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={settings.sectionStart}
                    onChange={e => setSettings(s => ({ ...s, sectionStart: parseFloat(e.target.value) || 0 }))}
                    style={{ width: 80 }}
                  />
                </div>
                <span style={{ color: 'var(--text-tertiary)' }}>to</span>
                <div className="measure-field">
                  <label>End (sec)</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={settings.sectionEnd}
                    onChange={e => setSettings(s => ({ ...s, sectionEnd: parseFloat(e.target.value) || 30 }))}
                    style={{ width: 80 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Processing Options */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: 'var(--space-lg)',
          }}>
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-tertiary)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}>
              <Zap size={12} /> Processing
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="radio"
                  name="processingMode"
                  checked={settings.processingMode === 'findNotes'}
                  onChange={() => setSettings(s => ({ ...s, processingMode: 'findNotes' }))}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Find notes (auto-detection)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="radio"
                  name="processingMode"
                  checked={settings.processingMode === 'spectrogramOnly'}
                  onChange={() => setSettings(s => ({ ...s, processingMode: 'spectrogramOnly' }))}
                  style={{ accentColor: 'var(--accent-primary)' }}
                />
                Spectrogram only
              </label>
            </div>

            {/* Display Settings */}
            <div style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-tertiary)',
              marginBottom: 'var(--space-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-xs)',
            }}>
              <BarChart3 size={12} /> Display Settings
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              <div className="measure-field">
                <label>Freq. Resolution</label>
                <select
                  className="select"
                  value={settings.frequencyResolution}
                  onChange={e => setSettings(s => ({ ...s, frequencyResolution: parseInt(e.target.value) }))}
                >
                  <option value={1024}>1024 (Fast)</option>
                  <option value={2048}>2048 (Normal)</option>
                  <option value={4096}>4096 (High)</option>
                  <option value={8192}>8192 (Very High)</option>
                </select>
              </div>
              <div className="measure-field">
                <label>Time Step</label>
                <select
                  className="select"
                  value={settings.timeStep}
                  onChange={e => setSettings(s => ({ ...s, timeStep: parseInt(e.target.value) }))}
                >
                  <option value={256}>256 (Fine)</option>
                  <option value={512}>512 (Normal)</option>
                  <option value={1024}>1024 (Coarse)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={close}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleProcess}
            disabled={!file}
          >
            <Zap size={16} />
            Process
          </button>
        </div>
      </div>
    </div>
  );
}
