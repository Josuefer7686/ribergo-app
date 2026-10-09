'use client';

import React from 'react';

interface TapEffectProps {
  x: number;
  y: number;
  scale?: number;
  opacity?: number;
}

export const TapEffect: React.FC<TapEffectProps> = ({ x, y, scale = 1, opacity = 1 }) => {
  return (
    <div
      style={{
        left: `${x}px`,
        top: `${y}px`,
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
      className="absolute z-50 pointer-events-none flex items-center justify-center"
    >
      {/* Outer Ripple */}
      <div className="w-16 h-16 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-ping" />
      {/* Touch Point */}
      <div className="absolute w-8 h-8 rounded-full bg-amber-400 shadow-[0_0_20px_rgba(244,197,66,0.9)] border border-white" />
    </div>
  );
};
