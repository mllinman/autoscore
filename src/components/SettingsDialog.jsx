import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, Settings, Palette, Sliders, Type, 
  Save, RefreshCw, AudioWaveform
} from 'lucide-react';

export default function SettingsDialog() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('general');

  // We maintain a local copy of preferences while editing, 
  // to allow for Cancel or Apply verbs if desired, but for now we'll do live-updates.
  const prefs = state.preferences;

  if (!state.showSettings) return null;

  const updatePrefs = (changes) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: changes });
  };

  const updateDSP = (changes) => {
    dispatch({ 
      type: 'UPDATE_PREFERENCES', 
      payload: { advancedDSP: { ...prefs.advancedDSP, ...changes } } 
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'dsp', label: 'Audio Engine', icon: AudioWaveform },
    { id: 'notation', label: 'Notation', icon: Type },
  ];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: 'var(--space-xl)'
    }}>
      <div className="modal-content glass" style={{
        width: '100%', maxWidth: '800px', height: '600px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Header */}
        <div style={{
          padding: 'var(--space-md) var(--space-xl)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.03)'
        }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} className="text-accent" />
            Preferences
          </h2>
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS' })}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{
            width: '240px',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            display: 'flex', flexDirection: 'column',
            padding: 'var(--space-md)'
          }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  padding: 'var(--space-sm) var(--space-md)',
                  width: '100%', textAlign: 'left',
                  background: activeTab === tab.id ? 'var(--accent-glow)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none', borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  marginBottom: 'var(--space-xs)',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div style={{ flex: 1, padding: 'var(--space-xl)', overflowY: 'auto', background: 'var(--bg-primary)' }}>
            
            {/* --- GENERAL TAB --- */}
            {activeTab === 'general' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Preferences</h3>
                
                <div className="pref-row">
                  <label>Language</label>
                  <select className="select" value={prefs.language} onChange={(e) => updatePrefs({ language: e.target.value })}>
                    <option value="en">English (US)</option>
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                    <option value="es">Español</option>
                  </select>
                </div>

                <div className="pref-row">
                  <label>Auto-scroll Timeline</label>
                  <input type="checkbox" checked={prefs.autoScroll} onChange={(e) => updatePrefs({ autoScroll: e.target.checked })} />
                </div>

                <div className="pref-row">
                  <label>Auto-save Interval</label>
                  <select className="select" value="5min">
                    <option value="1min">Every 1 Minute</option>
                    <option value="5min">Every 5 Minutes</option>
                    <option value="10min">Every 10 Minutes</option>
                  </select>
                </div>

                <div className="divider" style={{ margin: 'var(--space-md) 0' }} />

                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>System Reset</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Reset All State</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>Restore all settings and clear current project.</div>
                  </div>
                  <button className="btn btn-ghost" style={{ color: 'var(--color-error)' }} onClick={() => dispatch({ type: 'RESET_PROJECT' })}>
                    <RefreshCw size={14} /> Factory Reset
                  </button>
                </div>
              </div>
            )}

            {/* --- APPEARANCE TAB --- */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Interface Scale</h3>
                <input type="range" min="80" max="120" step="5" value={prefs.uiScale} onChange={(e) => updatePrefs({ uiScale: parseInt(e.target.value) })} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span>80%</span><span>100%</span><span>120%</span></div>

                <div className="divider" style={{ margin: 'var(--space-md) 0' }} />

                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Effects</h3>
                <div className="pref-row">
                  <label>Vibrant Accents (Glow)</label>
                  <input type="checkbox" checked={prefs.vibrantAccents} onChange={(e) => updatePrefs({ vibrantAccents: e.target.checked })} />
                </div>
                <div className="pref-row">
                  <label>Panel Opacity</label>
                  <input type="range" min="60" max="100" value={prefs.panelOpacity} onChange={(e) => updatePrefs({ panelOpacity: parseInt(e.target.value) })} />
                </div>

                <div className="divider" style={{ margin: 'var(--space-md) 0' }} />

                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Accent Color</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  {['#7c5cfc', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => updatePrefs({ accentColor: color })}
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: color, border: 'none', cursor: 'pointer',
                        boxShadow: prefs.accentColor === color ? `0 0 0 2px var(--bg-primary), 0 0 0 4px ${color}` : 'none',
                        transform: prefs.accentColor === color ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* --- AUDIO ENGINE TAB --- */}
            {activeTab === 'dsp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Transcription Engine</h3>
                
                <div className="pref-row">
                  <label>Pitch Detection Algorithm</label>
                  <select className="select" value={prefs.pitchEngine} onChange={(e) => updatePrefs({ pitchEngine: e.target.value })}>
                    <option value="basic">Basic (Fastest)</option>
                    <option value="high-accuracy">High Accuracy (YIN+)</option>
                    <option value="low-latency">Low Latency (MPM)</option>
                  </select>
                </div>

                <div className="pref-row">
                  <label>MIDI Input Device</label>
                  <select className="select" value={prefs.midiInput} onChange={(e) => updatePrefs({ midiInput: e.target.value })}>
                    <option value="None">None</option>
                    <option value="AKAI MPK Mini">AKAI MPK Mini MK3</option>
                    <option value="Virtual Port">Virtual MIDI Port</option>
                  </select>
                </div>

                <div className="divider" style={{ margin: 'var(--space-md) 0' }} />

                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>DSP Sensitivity</h3>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                    <span>Onset Sensitivity</span>
                    <span>{prefs.advancedDSP.onsetSensitivity.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05" value={prefs.advancedDSP.onsetSensitivity} onChange={(e) => updateDSP({ onsetSensitivity: parseFloat(e.target.value) })} />
                </div>
              </div>
            )}

            {/* --- NOTATION TAB --- */}
            {activeTab === 'notation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Visual & Rule-based</h3>
                
                <div className="pref-row">
                  <label>Automatic Beaming</label>
                  <input type="checkbox" checked={prefs.autoBeam} onChange={(e) => updatePrefs({ autoBeam: e.target.checked })} />
                </div>

                <div className="pref-row">
                  <label>Show Measure Numbers</label>
                  <input type="checkbox" checked={prefs.showMeasureNumbers} onChange={(e) => updatePrefs({ showMeasureNumbers: e.target.checked })} />
                </div>

                <div className="pref-row">
                  <label>Note Coloration</label>
                  <select className="select" value={prefs.noteColoration} onChange={(e) => updatePrefs({ noteColoration: e.target.value })}>
                    <option value="mono">Monochrome (Classic)</option>
                    <option value="pitch">Pitch-based (Rainbow)</option>
                    <option value="velocity">Velocity-based (Intensity)</option>
                  </select>
                </div>

                <div className="divider" style={{ margin: 'var(--space-md) 0' }} />
                
                <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-xs)', color: 'var(--text-primary)' }}>Score Style</h3>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                  {['standard', 'jazz'].map(style => (
                    <button
                      key={style}
                      className={`btn ${prefs.notationStyle === style ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ flex: 1, textTransform: 'capitalize' }}
                      onClick={() => updatePrefs({ notationStyle: style })}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
