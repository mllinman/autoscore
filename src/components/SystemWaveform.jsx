import React, { useRef, useEffect, useMemo } from 'react';

/**
 * SystemWaveform - Renders a segment of the audio waveform for a specific time range.
 * Used underneath staff systems for audio reference.
 */
export default function SystemWaveform({ buffer, startTime, endTime, width, height, color = 'rgba(0, 0, 0, 0.1)' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!buffer || !canvasRef.current || width <= 0 || height <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const totalSamples = endSample - startSample;
    
    if (totalSamples <= 0) return;

    ctx.clearRect(0, 0, width, height);
    
    // Draw background (subtle Noteflight-style wave area)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    const samplesPerPixel = totalSamples / width;
    const halfHeight = height / 2;

    for (let x = 0; x < width; x++) {
      const sampleIdx = startSample + Math.floor(x * samplesPerPixel);
      if (sampleIdx >= channelData.length) break;

      // Find min/max in this pixel's range for a better "envelope" look
      let min = 0;
      let max = 0;
      for (let i = 0; i < Math.max(1, samplesPerPixel); i++) {
        const s = channelData[sampleIdx + i] || 0;
        if (s < min) min = s;
        if (s > max) max = s;
      }

      ctx.moveTo(x, halfHeight + min * halfHeight);
      ctx.lineTo(x, halfHeight + max * halfHeight);
    }
    
    ctx.stroke();

    // Draw "SoundCheck" style accent line (red/orange/green gradient based on time)
    // This is a stylistic choice from the reference image 2
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0.4)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, halfHeight);
    
    for (let x = 0; x < width; x += 10) {
       const offset = Math.sin(x * 0.05 + startTime) * 10;
       ctx.lineTo(x, halfHeight + offset);
    }
    ctx.stroke();

  }, [buffer, startTime, endTime, width, height, color]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'block',
        pointerEvents: 'none' // Don't block clicks to the staff
      }} 
    />
  );
}
