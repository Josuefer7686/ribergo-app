'use client';

import React from 'react';

interface ParticleGlowProps {
  frame: number;
}

export const ParticleGlow: React.FC<ParticleGlowProps> = ({ frame }) => {
  const pulseScale = 1 + Math.sin(frame / 18) * 0.08;
  const pulseOpacity = 0.2 + Math.cos(frame / 22) * 0.05;

  return (
    <div style={{ position: 'absolute', width: '1080px', height: '1920px', top: 0, left: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Radial Gold Glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '1200px',
          height: '1200px',
          background: 'radial-gradient(circle, rgba(244,197,66,0.22) 0%, rgba(244,197,66,0.05) 50%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          transform: `translate(-50%, -50%) scale(${pulseScale})`,
          opacity: pulseOpacity,
        }}
      />

      {/* Floating Sparkle Particles */}
      {[...Array(16)].map((_, i) => {
        const yPos = ((frame * (2 + i * 0.3) + i * 160) % 1920);
        const xPos = (Math.sin(i * 37 + frame / 25) * 440) + 540;
        const opacity = Math.sin(frame / 12 + i) * 0.4 + 0.6;
        const size = 6 + (i % 5) * 3;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              backgroundColor: '#F4C542',
              boxShadow: '0 0 16px #F4C542',
              transform: `translate(${xPos}px, ${yPos}px)`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};
