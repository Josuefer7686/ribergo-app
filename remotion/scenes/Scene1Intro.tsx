'use client';

import React from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Smartphone, Sparkles, MapPin, Compass } from 'lucide-react';

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animations
  const badgeScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [15, 35], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subtitleY = interpolate(frame, [40, 60], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Floating ambient map pin effect
  const floatY = Math.sin(frame / 12) * 8;

  return (
    <div className="w-full h-full bg-[#05080B] text-white flex flex-col items-center justify-center p-12 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Glows */}
      <div 
        className="absolute w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none"
        style={{ transform: `scale(${1 + Math.sin(frame / 20) * 0.1})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#f4c542_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        
        {/* Animated RiberGO Logo Badge */}
        <div 
          style={{ transform: `scale(${badgeScale}) translateY(${floatY}px)` }}
          className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-[2px] shadow-[0_0_50px_rgba(244,197,66,0.35)] mb-8"
        >
          <div className="w-full h-full bg-[#0b0f17] rounded-3xl flex items-center justify-center backdrop-blur-md">
            <Smartphone className="w-14 h-14 text-amber-400 drop-shadow-[0_0_12px_rgba(244,197,66,0.8)]" />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-amber-400 text-black rounded-full p-2 shadow-lg">
            <Sparkles className="w-5 h-5 fill-black" />
          </div>
        </div>

        {/* Tagline */}
        <div 
          style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-black uppercase tracking-[0.25em] mb-4 shadow-inner"
        >
          <Compass className="w-4 h-4 animate-spin" />
          <span>Riberalta, Beni - Bolivia</span>
        </div>

        {/* Main Title */}
        <h1 
          style={{ opacity: titleOpacity, transform: `translateY(${titleY}px)` }}
          className="text-5xl md:text-6xl font-black tracking-tight leading-tight text-white mb-4 drop-shadow-md"
        >
          ¿Necesitas moverte o <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            enviar un paquete?
          </span>
        </h1>

        {/* Subtitle */}
        <p 
          style={{ opacity: subtitleOpacity, transform: `translateY(${subtitleY}px)` }}
          className="text-xl md:text-2xl text-white/80 font-medium leading-relaxed max-w-lg"
        >
          ¡Llegó <span className="text-amber-400 font-bold">RiberGO</span>! La primera app oficial de transporte y mototaxis a un toque.
        </p>

        {/* Decorative Map Pins */}
        <div 
          style={{ opacity: subtitleOpacity }}
          className="flex items-center gap-6 mt-8 text-xs font-bold text-white/50 tracking-wider uppercase"
        >
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber-400" /> Mototaxis</span>
          <span>•</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber-400" /> Remolcadas</span>
          <span>•</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-amber-400" /> Encomiendas</span>
        </div>

      </div>
    </div>
  );
};
