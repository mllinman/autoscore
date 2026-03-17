import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mic2, Loader2, Play, Square, Settings2 } from 'lucide-react';
import { AutoTuneProcessor } from '../engine/AutoTuneProcessor';

export default function VocalTuner() {
  const { state, dispatch, getAudioContext } = useApp();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sourceNode, setSourceNode] = useState(null);

  const tuning = state.vocalTuning;

  const handleProcess = async () => {
    // If we have a vocal stem, process that. Otherwise process the main audio buffer.
    const sourceBuffer = state.stems?.vocals || state.audioBuffer;
    
    if (!sourceBuffer) return;

    setIsProcessing(true);
    setProgress(0);
    
    // Give UI time to render
    await new Promise(r => setTimeout(r, 50));
    
    try {
      const audioCtx = getAudioContext();
      const processor = new AutoTuneProcessor(audioCtx);
      
      const newBuffer = await processor.process(sourceBuffer, tuning, (p) => {
        setProgress(p);
      });
      
      // Update global state: replace either the vocal stem or the main buffer
      if (state.stems?.vocals) {
        dispatch({
          type: 'SET_STEMS',
          payload: { ...state.stems, vocals: newBuffer }
        });
      } else {
        dispatch({
          type: 'SET_AUDIO',
          payload: { ...state, buffer: newBuffer, file: state.audioFile, name: state.fileName, duration: newBuffer.duration }
        });
      }
      
    } catch (e) {
      console.error(e);
      alert("Error applying AutoTune: " + e.message);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      if (sourceNode) {
        sourceNode.stop();
        sourceNode.disconnect();
        setSourceNode(null);
      }
      setIsPlaying(false);
    } else {
      const audioCtx = getAudioContext();
      const src = audioCtx.createBufferSource();
      src.buffer = state.stems?.vocals || state.audioBuffer;
      src.connect(audioCtx.destination);
      src.onended = () => setIsPlaying(false);
      src.start(0, state.currentTime);
      setSourceNode(src);
      setIsPlaying(true);
    }
  };

  const updateSetting = (key, value) => {
    dispatch({
      type: 'UPDATE_VOCAL_TUNING',
      payload: { [key]: value }
    });
  };

  if (!state.audioBuffer) {
    return <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>No audio loaded.</div>;
  }

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic2 size={18} /> Vocal AutoTune
        </h2>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={togglePlayback} disabled={isProcessing}>
            {isPlaying ? <Square size={16} /> : <Play size={16} />}
            {isPlaying ? 'Stop' : 'Preview'}
          </button>
          
          <button className="btn btn-primary" onClick={handleProcess} disabled={isProcessing}>
            {isProcessing ? <Loader2 size={16} className="spin" /> : <Settings2 size={16} />}
            {isProcessing ? 'Processing...' : 'Apply Pitch Correction'}
          </button>
        </div>
      </div>

      <div className="panel-content" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {isProcessing && (
          <div style={{ width: '100%', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Analyzing pitch and applying granular shifting...</span>
              <span style={{ color: 'var(--accent-primary)' }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          
          {/* Retune Speed */}
          <div className="control-group" style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span>Retune Speed (ms)</span>
              <span style={{ color: 'var(--accent-primary)' }}>{tuning.retuneSpeed}</span>
            </label>
            <input 
              type="range" className="slider" 
              min="0" max="100" 
              value={tuning.retuneSpeed} 
              onChange={(e) => updateSetting('retuneSpeed', parseInt(e.target.value))}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              <span>0 (Off)</span>
              <span>100 (Robotic)</span>
            </div>
          </div>

          {/* Scale & Key */}
          <div className="control-group" style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Target Scale</label>
              <select 
                className="select" style={{ width: '100%' }}
                value={tuning.scale}
                onChange={(e) => updateSetting('scale', e.target.value)}
              >
                <option value="chromatic">Chromatic (Nearest Note)</option>
                <option value="major">Major Scale</option>
                <option value="minor">Minor Scale</option>
              </select>
            </div>
            
            {(tuning.scale === 'major' || tuning.scale === 'minor') && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px' }}>Key</label>
                <select 
                  className="select" style={{ width: '100%' }}
                  value={tuning.key}
                  onChange={(e) => updateSetting('key', e.target.value)}
                >
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

        </div>
        
        <div style={{ marginTop: 'auto', padding: '16px', background: 'rgba(var(--accent-rgb), 0.1)', border: '1px solid rgba(var(--accent-rgb), 0.2)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
          <strong>Tip:</strong> For best results, run the <strong>Stem Separator</strong> first to isolate the vocals, and then apply AutoTune directly to the Vocal stem here.
          {!state.stems?.vocals && <span style={{ color: '#ef4444', marginLeft: '8px' }}>(Currently operating on full mixed audio)</span>}
          {state.stems?.vocals && <span style={{ color: '#10b981', marginLeft: '8px' }}>(Vocal Stem Detected - Ready)</span>}
        </div>

      </div>
    </div>
  );
}
