import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { INSTRUMENTS } from '../../utils/constants';
import {
  Volume2, VolumeX, Mic, Music, Headphones,
} from 'lucide-react';

const DEFAULT_CHANNELS = [
  { id: 'master', name: 'Master', color: '#7c5cfc', icon: Headphones, volume: 1.0, pan: 0, mute: false, solo: false, armed: false },
  { id: 'track1', name: 'Track 1', color: '#34d399', icon: Music, volume: 0.8, pan: 0, mute: false, solo: false, armed: false },
];

function VUMeter({ level = 0 }) {
  const segments = 20;
  const activeSegments = Math.round(level * segments);

  return (
    <div className="vu-meter">
      {Array.from({ length: segments }, (_, i) => {
        const segIndex = segments - 1 - i;
        const isActive = segIndex < activeSegments;
        let colorClass = 'green';
        if (segIndex >= segments * 0.85) colorClass = 'red';
        else if (segIndex >= segments * 0.65) colorClass = 'yellow';

        return (
          <div
            key={i}
            className={`vu-segment ${colorClass} ${isActive ? 'active' : ''}`}
          />
        );
      })}
    </div>
  );
}

function ChannelFader({ value, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = (e) => {
    setDragging(true);
    updateValue(e);
  };

  const updateValue = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    onChange(Math.round(y * 100) / 100);
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e) => updateValue(e);
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging]);

  const percent = value * 100;

  return (
    <div className="channel-fader" ref={trackRef} onMouseDown={handleMouseDown}>
      <div className="fader-track">
        <div className="fader-fill" style={{ height: `${percent}%` }} />
        <div className="fader-thumb" style={{ bottom: `calc(${percent}% - 8px)` }} />
      </div>
      <div className="fader-marks">
        <span>+6</span>
        <span>0</span>
        <span>-6</span>
        <span>-∞</span>
      </div>
    </div>
  );
}

function PanKnob({ value = 0, onChange }) {
  const rotation = value * 135; // -135 to +135 degrees

  return (
    <div
      className="pan-knob"
      title={`Pan: ${value === 0 ? 'C' : value > 0 ? `R${Math.round(value * 100)}` : `L${Math.round(Math.abs(value) * 100)}`}`}
    >
      <div className="knob-body">
        <div className="knob-indicator" style={{ transform: `rotate(${rotation}deg)` }} />
      </div>
      <span className="knob-label">
        {value === 0 ? 'C' : value > 0 ? `R${Math.round(value * 100)}` : `L${Math.round(Math.abs(value) * 100)}`}
      </span>
    </div>
  );
}

export default function ChannelStrip() {
  const { state, dispatch } = useApp();
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const [vuLevels, setVuLevels] = useState({});

  // Simulate VU meter animation
  useEffect(() => {
    if (!state.isPlaying) {
      setVuLevels({});
      return;
    }
    const interval = setInterval(() => {
      const levels = {};
      channels.forEach(ch => {
        if (!ch.mute) {
          levels[ch.id] = Math.random() * 0.7 + (ch.id === 'master' ? 0.2 : 0.1);
        } else {
          levels[ch.id] = 0;
        }
      });
      setVuLevels(levels);
    }, 80);
    return () => clearInterval(interval);
  }, [state.isPlaying, channels]);

  const updateChannel = (id, field, value) => {
    setChannels(prev => prev.map(ch =>
      ch.id === id ? { ...ch, [field]: value } : ch
    ));
  };

  const anySolo = channels.some(ch => ch.solo);

  return (
    <div className="channel-strip-container">
      {channels.map(ch => {
        const Icon = ch.icon;
        const isEffectiveMute = ch.mute || (anySolo && !ch.solo);

        return (
          <div key={ch.id} className={`channel-strip ${isEffectiveMute ? 'muted' : ''}`}>
            {/* Channel header */}
            <div className="channel-header" style={{ borderTop: `2px solid ${ch.color}` }}>
              <Icon size={12} />
              <span className="channel-name">{ch.name}</span>
            </div>

            {/* VU Meter + Fader */}
            <div className="channel-body">
              <VUMeter level={isEffectiveMute ? 0 : (vuLevels[ch.id] || 0)} />
              <ChannelFader
                value={ch.volume}
                onChange={(v) => updateChannel(ch.id, 'volume', v)}
              />
            </div>

            {/* Pan Knob */}
            <PanKnob
              value={ch.pan}
              onChange={(v) => updateChannel(ch.id, 'pan', v)}
            />

            {/* M / S / R buttons */}
            <div className="channel-buttons">
              <button
                className={`ch-btn mute-btn ${ch.mute ? 'active' : ''}`}
                onClick={() => updateChannel(ch.id, 'mute', !ch.mute)}
                title="Mute"
              >
                M
              </button>
              <button
                className={`ch-btn solo-btn ${ch.solo ? 'active' : ''}`}
                onClick={() => updateChannel(ch.id, 'solo', !ch.solo)}
                title="Solo"
              >
                S
              </button>
              <button
                className={`ch-btn arm-btn ${ch.armed ? 'active' : ''}`}
                onClick={() => updateChannel(ch.id, 'armed', !ch.armed)}
                title="Record Arm"
              >
                R
              </button>
            </div>

            {/* Volume readout */}
            <div className="channel-value">
              {ch.mute ? '-∞' : `${Math.round(ch.volume * 100)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
