'use client';

import React from 'react';

interface PhoneMockupProps {
  children: React.ReactNode;
  scale?: number;
  rotationY?: number;
  rotationX?: number;
  translateY?: number;
  glowColor?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  children,
  scale = 1,
  rotationY = 0,
  rotationX = 0,
  translateY = 0,
  glowColor = 'rgba(244,197,66,0.35)',
}) => {
  return (
    <div
      style={{
        width: '580px',
        height: '1150px',
        backgroundColor: '#05080B',
        borderRadius: '64px',
        border: '14px solid #1b2533',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transform: `perspective(1400px) scale(${scale}) translateY(${translateY}px) rotateY(${rotationY}deg) rotateX(${rotationX}deg)`,
        boxShadow: `0 35px 100px -10px ${glowColor}, 0 0 50px rgba(0,0,0,0.95)`,
        boxSizing: 'border-box',
      }}
    >
      {/* Side Hardware Buttons */}
      <div style={{ position: 'absolute', left: '-18px', top: '160px', width: '6px', height: '80px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px 0 0 4px' }} />
      <div style={{ position: 'absolute', left: '-18px', top: '260px', width: '6px', height: '80px', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: '4px 0 0 4px' }} />
      <div style={{ position: 'absolute', right: '-18px', top: '200px', width: '6px', height: '110px', backgroundColor: '#F4C542', borderRadius: '0 4px 4px 0', opacity: 0.8 }} />

      {/* Dynamic Notch / Island */}
      <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', width: '180px', height: '28px', backgroundColor: '#000000', borderRadius: '20px', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.8)' }} />
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
      </div>

      {/* Glass Highlight */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%)', pointerEvents: 'none', zIndex: 40 }} />

      {/* Inner Screen */}
      <div style={{ width: '100%', height: '100%', backgroundColor: '#05080B', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', paddingTop: '48px', boxSizing: 'border-box' }}>
        {children}
      </div>

      {/* Bottom Home Bar */}
      <div style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', width: '160px', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px', zIndex: 50 }} />
    </div>
  );
};
