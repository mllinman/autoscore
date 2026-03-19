import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Square, Download, Activity, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { StemEngine } from '../engine/StemEngine';

export default function StemMixer() {
  const { state, dispatch, getAudioContext } = useApp();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Track parameters
  const [tracks, setTracks] = useState({
    vocals: { name: 'Vocals', volume: 1.0, mute: false, solo: false, buffer: state.stems?.vocals || null, source: null, gainNode: null },
    bass:   { name: 'Bass', volume: 1.0, mute: false, solo: false, buffer: state.stems?.bass || null, source: null, gainNode: null },
    drums:  { name: 'Drums', volume: 1.0, mute: false, solo: false, buffer: state.stems?.drums || null, source: null, gainNode: null },
    other:  { name: 'Other', volume: 1.0, mute: false, solo: false, buffer: state.stems?.other || null, source: null, gainNode: null }
  });

  const ctxRef = useRef(null);
  const isSetupRef = useRef(false);

  // Setup stem extraction
  const extractStems = async () => {
    if (!state.audioBuffer) return;
    setIsProcessing(true);
    setProgress(0);
    
    // Slight timeout so UI can render the spinner
    await new Promise(r => setTimeout(r, 50));
    
    try {
      const audioCtx = getAudioContext();
      const engine = new StemEngine(audioCtx);
      
      const results = await engine.separate(state.audioBuffer, (p) => {
        setProgress(p);
      });
      
      setTracks(prev => ({
        vocals: { ...prev.vocals, buffer: results.vocals },
        bass: { ...prev.bass, buffer: results.bass },
        drums: { ...prev.drums, buffer: results.drums },
        other: { ...prev.other, buffer: results.other }
      }));
      dispatch({ type: 'SET_STEMS', payload: results });
      
    } catch (e) {
      console.error(e);
      alert("Error separating stems: " + e.message);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  // Playback logic
  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    const audioCtx = getAudioContext();
    ctxRef.current = audioCtx;
    
    // Stop existing just in case
    Object.values(tracks).forEach(t => t.source?.stop());

    const newTracks = { ...tracks };
    
    let anySolo = Object.values(newTracks).some(t => t.solo);

    Object.keys(newTracks).forEach(key => {
      const track = newTracks[key];
      if (!track.buffer) return;

      const source = audioCtx.createBufferSource();
      source.buffer = track.buffer;
      
      const gainNode = audioCtx.createGain();
      
      // Calculate effective volume based on Mute/Solo
      let effectiveVol = track.volume;
      if (track.mute) effectiveVol = 0;
      if (anySolo && !track.solo) effectiveVol = 0;
      
      gainNode.gain.value = effectiveVol;
      
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      source.start(0, state.currentTime);
      
      newTracks[key] = { ...track, source, gainNode };
    });

    setTracks(newTracks);
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    Object.values(tracks).forEach(t => {
      if (t.source) {
        try { t.source.stop(); } catch(e){}
        t.source.disconnect();
      }
      if (t.gainNode) t.gainNode.disconnect();
    });
    
    setTracks(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], source: null, gainNode: null };
      });
      return next;
    });
    setIsPlaying(false);
  };

  // Update live gains when volume, mute, or solo changes
  useEffect(() => {
    if (!isPlaying) return;
    
    let anySolo = Object.values(tracks).some(t => t.solo);
    
    Object.values(tracks).forEach(track => {
      if (!track.gainNode) return;
      
      let effectiveVol = track.volume;
      if (track.mute) effectiveVol = 0;
      if (anySolo && !track.solo) effectiveVol = 0;
      
      // Ramp for smoothness
      track.gainNode.gain.setTargetAtTime(effectiveVol, getAudioContext().currentTime, 0.05);
    });
  }, [tracks.vocals.volume, tracks.vocals.mute, tracks.vocals.solo,
      tracks.bass.volume, tracks.bass.mute, tracks.bass.solo,
      tracks.drums.volume, tracks.drums.mute, tracks.drums.solo,
      tracks.other.volume, tracks.other.mute, tracks.other.solo,
      isPlaying]);


  // Clean up on unmount
  useEffect(() => {
    return () => {
        if(isPlaying) stopPlayback();
    };
  }, [isPlaying]);

  const updateTrack = (key, field, value) => {
    setTracks(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  // Wav encoding logic for Export
  const exportStem = async (key) => {
    const buffer = tracks[key].buffer;
    if (!buffer) return;
    
    // Very bare-bones WAV maker for Float32AudioBuffer
    const wavBlob = audioBufferToWav(buffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.fileName.split('.').slice(0, -1).join('.')}_${key}.wav`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  };

  // Missing AudioBufferToWav implementation
  const audioBufferToWav = (buffer) => {
    let numOfChan = buffer.numberOfChannels;
    let length = buffer.length * numOfChan * 2 + 44;
    let bufferOut = new ArrayBuffer(length);
    let view = new DataView(bufferOut);
    let channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this exporter)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // write interleaved data
    for(i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

    while(pos < length) {
      for(i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // convert to 16 bit pcm
        view.setInt16(pos, sample, true); // write 16-bit sample
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferOut], {type: "audio/wav"});

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
  };


  const hasStems = !!tracks.vocals.buffer;

  if (!state.audioBuffer) {
    return <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>No audio loaded.</div>;
  }

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} /> Stem Separator
        </h2>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {!hasStems ? (
            <button className="btn btn-primary" onClick={extractStems} disabled={isProcessing}>
              {isProcessing ? <Loader2 size={16} className="spin" /> : <Activity size={16} />}
              {isProcessing ? 'Processing...' : 'Separate Stems'}
            </button>
          ) : (
            <button className="btn" onClick={togglePlay}>
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
              {isPlaying ? 'Stop' : 'Play Stems'}
            </button>
          )}
        </div>
      </div>

      <div className="panel-content" style={{ flex: 1, display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        
        {isProcessing && (
          <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <p style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>Extracting isolated stems using advanced spectral masking & HPS...</p>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        {hasStems && Object.entries(tracks).map(([key, track]) => (
          <div key={key} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
            background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px',
            width: '120px', border: '1px solid var(--border-default)',
            boxShadow: track.solo ? '0 0 10px rgba(var(--accent-rgb), 0.3)' : 'none'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: track.mute ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
              {track.name}
            </h3>
            
            {/* Fader */}
            <div style={{ height: '150px', position: 'relative', width: '30px', display: 'flex', justifyContent: 'center' }}>
               <input 
                  type="range" 
                  min="0" max="1.5" step="0.01" 
                  value={track.volume}
                  onChange={(e) => updateTrack(key, 'volume', parseFloat(e.target.value))}
                  style={{
                    appearance: 'slider-vertical',
                    width: '100%', height: '100%',
                    cursor: 'pointer'
                  }}
               />
            </div>
            
            <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
              <button 
                style={{ flex: 1, padding: '4px', fontSize: '12px', background: track.mute ? '#ef4444' : 'var(--bg-secondary)', color: track.mute ? '#fff' : 'inherit', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => updateTrack(key, 'mute', !track.mute)}
              >
                M
              </button>
              <button 
                style={{ flex: 1, padding: '4px', fontSize: '12px', background: track.solo ? '#eab308' : 'var(--bg-secondary)', color: track.solo ? '#fff' : 'inherit', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => updateTrack(key, 'solo', !track.solo)}
              >
                S
              </button>
            </div>

            <button className="btn btn-ghost btn-sm" style={{ width: '100%', fontSize: '12px' }} onClick={() => exportStem(key)}>
              <Download size={12} /> WAV
            </button>

          </div>
        ))}
      </div>
    </div>
  );
}
