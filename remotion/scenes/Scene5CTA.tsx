'use client';

import React from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Smartphone, Download, Sparkles, Globe, ArrowRight } from 'lucide-react';

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 10 } });
  const buttonSpring = spring({ frame: frame - 25, fps, config: { damping: 12 } });

  const pulse = Math.sin(frame / 10) * 0.05 + 1;

  return (
    <div className="w-full h-full bg-[#05080B] text-white flex flex-col items-center justify-center p-12 relative overflow-hidden font-sans">
      {/* Intense Golden Glow */}
      <div 
        className="absolute w-[700px] h-[700px] bg-amber-500/20 rounded-full blur-[180px] pointer-events-none"
        style={{ transform: `scale(${pulse})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#f4c542_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
        
        {/* Big Glowing Badge */}
        <div 
          style={{ transform: `scale(${logoScale})` }}
          className="relative w-36 h-36 rounded-[40px] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 p-[3px] shadow-[0_0_80px_rgba(244,197,66,0.5)] mb-8"
        >
          <div className="w-full h-full bg-[#090d14] rounded-[37px] flex items-center justify-center backdrop-blur-xl">
            <Smartphone className="w-18 h-18 text-amber-400 drop-shadow-[0_0_20px_rgba(244,197,66,0.9)]" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-4">
          ¡Únete hoy mismo a <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            RiberGO!
          </span>
        </h2>

        <p className="text-xl text-white/80 font-medium mb-8 max-w-lg">
          Disponible para Android, iOS y cualquier navegador web. Instala la app oficial gratis en segundos.
        </p>

        {/* Action Button CTA */}
        {buttonSpring > 0.01 && (
          <div 
            style={{ transform: `scale(${buttonSpring})` }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <div className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-lg uppercase tracking-wider shadow-[0_0_40px_rgba(244,197,66,0.4)] flex items-center gap-3">
              <Download className="w-6 h-6 stroke-[3]" />
              <span>Instalar Web App Gratis</span>
            </div>

            <div className="px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-base flex items-center gap-2 backdrop-blur-md">
              <Globe className="w-5 h-5 text-amber-400" />
              <span>ribergo.app</span>
            </div>
          </div>
        )}

        <p className="text-xs text-white/50 font-bold uppercase tracking-widest mt-10">
          Riberalta • Beni • Bolivia
        </p>

      </div>
    </div>
  );
};
