import React, { useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function GuitarFretboard({ notes = [] }) {
  const { state } = useApp();
  const { instrument, currentTime, isPlaying } = state;
  const canvasRef = useRef(null);

  const strings = instrument.strings || 6;
  const maxFrets = 24;

  // Active notes are those crossing the current playback time
  const activeNotes = useMemo(() => {
    return notes.filter(n => n.hasPosition && n.startTime <= currentTime && n.endTime > currentTime);
  }, [notes, currentTime]);

  const drawFretboard = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Support high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    // --- Draw Wood Neck ---
    // A nice gradient mimicking rosewood
    const neckGrad = ctx.createLinearGradient(0, 0, 0, H);
    neckGrad.addColorStop(0, '#2d1b11');
    neckGrad.addColorStop(0.5, '#422518');
    neckGrad.addColorStop(1, '#1f110a');
    ctx.fillStyle = neckGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle wood grain lines
    ctx.strokeStyle = '#180e08';
    ctx.globalAlpha = 0.3;
    for(let i=0; i<10; i++) {
        ctx.beginPath();
        ctx.moveTo(0, H * Math.random());
        ctx.bezierCurveTo(W/3, H * Math.random(), W*0.66, H * Math.random(), W, H * Math.random());
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // --- Calculate Geometries ---
    const topMargin = H * 0.1;
    const bottomMargin = H * 0.1;
    const paddingLeft = 30; // Nut
    const spacingRight = 20;

    const availableH = H - topMargin - bottomMargin;
    const availableW = W - paddingLeft - spacingRight;

    // Frets are spaced logarithmically on a real guitar, but linearly is often clearer for UI.
    // We'll use a slight logarithmic curve to make it look realistic.
    const fretPositions = [0];
    let currentX = paddingLeft;
    let remainder = availableW;
    const magicRatio = 17.817; // Typical rule of 18 for fret spacing
    
    for (let f = 1; f <= maxFrets; f++) {
        const step = remainder / magicRatio;
        currentX += step;
        remainder -= step;
        // In case the ratio compresses it too much on small screens, enforce a minimum width
        fretPositions.push(Math.max(paddingLeft + (f * (availableW/maxFrets)), currentX)); 
    }
    
    // Because of forcing minimums, recalculate exact linear-ish spacing for exact bounds
    const fretX = (fNum) => {
        if (fNum === 0) return paddingLeft;
        return paddingLeft + (fNum * (availableW / maxFrets));
    };

    const stringY = (sNum) => {
        if (strings <= 1) return H/2;
        // String 0 is the highest pitched (thinnest), drawn at the top.
        // Therefore stringY(0) is small, stringY(strings-1) is large.
        const step = availableH / (strings - 1);
        return topMargin + (sNum * step);
    };

    // --- Draw Inlays (Fret Markers) ---
    const inlays = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
    ctx.fillStyle = '#e5e7eb'; // Pearl white
    ctx.globalAlpha = 0.7;
    
    inlays.forEach(fret => {
        const cx = fretX(fret - 0.5); // Center between frets
        const cy = H / 2;
        const radius = Math.min(6, (availableW / maxFrets) * 0.2);

        if (fret === 12 || fret === 24) {
             // Double dots
             ctx.beginPath(); ctx.arc(cx, cy - (availableH * 0.25), radius, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(cx, cy + (availableH * 0.25), radius, 0, Math.PI*2); ctx.fill();
        } else {
             // Single dot
             ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill();
        }
    });
    ctx.globalAlpha = 1.0;

    // --- Draw Frets (Metal Wire) ---
    for (let f = 0; f <= maxFrets; f++) {
        const x = fretX(f);
        
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        
        if (f === 0) {
            // Nut
            ctx.strokeStyle = '#fef08a'; // Bone nut color
            ctx.lineWidth = 6;
        } else {
            // Fret wire
            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 2;
        }
        ctx.stroke();

        // Fret number label (Bottom edge)
        if (f > 0 && f % 2 !== 0 || f === 12 || f === 24) {
             ctx.fillStyle = '#9ca3af';
             ctx.font = '10px Inter';
             ctx.textAlign = 'center';
             ctx.fillText(f.toString(), fretX(f - 0.5), H - 2);
        }
    }

    // --- Draw Strings ---
    for (let s = 0; s < strings; s++) {
        const y = stringY(s);
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        
        // Thicker strings for lower pitches (higher string index usually)
        ctx.lineWidth = 1 + (s * 0.5); 
        
        // Silver for wound strings (bottom 3 or 4), silver/plain for top
        if (s >= 3) {
            ctx.strokeStyle = '#d1d5db'; // wound
        } else {
            ctx.strokeStyle = '#e5e7eb'; // plain
        }
        
        // Shadow for depth
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Open string letter
        ctx.fillStyle = '#fff';
        ctx.font = '12px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const labels = instrument.id === 'bass' ? ['G','D','A','E'] : ['e','B','G','D','A','E'];
        ctx.fillText(labels[s] || s, 5, y);
    }

    // --- Draw Active Notes ---
    activeNotes.forEach(note => {
        let x = 0;
        let y = stringY(note.tabString);

        if (note.tabFret === 0) {
             x = paddingLeft / 2;
        } else {
             x = fretX(note.tabFret - 0.5); // Between frets
        }

        const radius = Math.min(12, (availableH / strings) * 0.4);

        // Halo
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124, 92, 252, 0.4)';
        ctx.fill();

        // Note Circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'var(--accent-primary)';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Finger Number
        if (note.finger !== '?' && note.finger !== 0) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${radius * 1.2}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(note.finger.toString(), x, y);
        }
    });
  };

  // Animation Loop for smooth updates
  useEffect(() => {
    let animationId;
    if (isPlaying) {
        const loop = () => {
             drawFretboard();
             animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
    } else {
        drawFretboard();
    }
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, currentTime, notes]); // Dependencies ensure redraw on seek or note edits

  return (
    <div style={{ width: '100%', height: '140px', background: '#000', position: 'relative', borderBottom: '2px solid var(--border-default)' }}>
       <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
