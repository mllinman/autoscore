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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>Behavior</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                    <input 
                      type="checkbox" 
                      id="autosave" 
                      checked={prefs.autoSave}
                      onChange={(e) => updatePrefs({ autoSave: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="autosave" style={{ flex: 1, cursor: 'pointer' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Auto-save Project</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>Automatically save your transcription progress to local browser storage.</div>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>System Reset</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Reset Preferences</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>Restore all settings to their factory defaults.</div>
                    </div>
                    <button className="btn btn-ghost" style={{ color: 'var(--color-error)' }}>
                      <RefreshCw size={14} /> Reset
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- APPEARANCE TAB --- */}
            {activeTab === 'appearance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>Theme</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    {['dark', 'light'].map(theme => (
                      <button
                        key={theme}
                        onClick={() => updatePrefs({ theme })}
                        style={{
                          flex: 1, padding: 'var(--space-lg)',
                          background: prefs.theme === theme ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          border: `2px solid ${prefs.theme === theme ? 'var(--accent-primary)' : 'transparent'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)'
                        }}
                      >
                        <div style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', 
                          background: theme === 'dark' ? '#0a0a0f' : '#ffffff',
                          border: '1px solid var(--border-subtle)'
                        }} />
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{theme} Mode</span>
                        {theme === 'light' && <span style={{ fontSize: '10px', color: 'var(--color-warning)' }}>(Coming Soon)</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>Accent Color</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    {['#7c5cfc', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(color => (
                      <button
                        key={color}
                        onClick={() => updatePrefs({ accentColor: color })}
                        style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: color, border: 'none', cursor: 'pointer',
                          boxShadow: prefs.accentColor === color ? `0 0 0 3px var(--bg-primary), 0 0 0 5px ${color}` : 'none',
                          transform: prefs.accentColor === color ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                  <p style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Changes the primary accent color across the entire application interface.
                  </p>
                </div>
              </div>
            )}

            {/* --- AUDIO ENGINE TAB --- */}
            {activeTab === 'dsp' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', borderLeft: '3px solid var(--color-warning)', padding: 'var(--space-sm) var(--space-md)', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    <strong>Warning:</strong> These settings modify deeply embedded logic inside the Transcription Pipeline. Changing them may result in missed notes or hallucinated noise.
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>YIN Pitch Confidence Threshold</label>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>{prefs.advancedDSP.yinThreshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="0.05"
                    max="0.40"
                    step="0.01"
                    value={prefs.advancedDSP.yinThreshold}
                    onChange={(e) => updateDSP({ yinThreshold: parseFloat(e.target.value) })}
                  />
                  <p style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Lower values require the pitch algorithm to be MORE confident. Raise this if the engine is missing notes in noisy audio, lower it if it's picking up unpitched noise like drums as notes. (Default: 0.15)
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>Transient Onset Sensitivity</label>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>{prefs.advancedDSP.onsetSensitivity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={prefs.advancedDSP.onsetSensitivity}
                    onChange={(e) => updateDSP({ onsetSensitivity: parseFloat(e.target.value) })}
                  />
                  <p style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Controls how aggressively the engine splits continuous audio into separate note blocks based on sudden amplitude/frequency changes. (Default: 0.3)
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-xs)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>Pitch Median Filter Window</label>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>{prefs.advancedDSP.medianFilterWindow} frames</span>
                  </div>
                  <input
                    type="range"
                    className="slider"
                    min="1"
                    max="15"
                    step="2"
                    value={prefs.advancedDSP.medianFilterWindow}
                    onChange={(e) => updateDSP({ medianFilterWindow: parseInt(e.target.value) })}
                  />
                  <p style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    The size of the sliding window used to filter out rapid octave jumps. Must be an odd number. Larger sizes smooth out errors better but can smear fast vibrato or rapid trills. (Default: 5)
                  </p>
                </div>
              </div>
            )}

            {/* --- NOTATION TAB --- */}
            {activeTab === 'notation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>Visual Style</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    {['standard', 'jazz'].map(style => (
                      <button
                        key={style}
                        onClick={() => updatePrefs({ notationStyle: style })}
                        style={{
                          flex: 1, padding: 'var(--space-lg)',
                          background: prefs.notationStyle === style ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                          border: `2px solid ${prefs.notationStyle === style ? 'var(--accent-primary)' : 'transparent'}`,
                          borderRadius: 'var(--radius-md)', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-sm)'
                        }}
                      >
                        <span style={{ fontSize: '24px', fontFamily: style === 'jazz' ? 'cursive' : 'serif', color: 'var(--text-primary)' }}>
                          &#119070;
                        </span>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>{style} Check</span>
                        {style === 'jazz' && <span style={{ fontSize: '10px', color: 'var(--color-warning)' }}>(Mockup)</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
