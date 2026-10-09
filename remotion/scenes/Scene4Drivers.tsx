'use client';

import React from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Wallet, Sparkles, TrendingUp, Clock, ShieldCheck, DollarSign } from 'lucide-react';

export const Scene4Drivers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({ frame, fps, config: { damping: 13 } });
  
  // Earnings count animation (e.g., 250 BOB daily)
  const earnings = Math.min(285, Math.floor(interpolate(frame, [15, 80], [0, 285])));

  const feat1Spring = spring({ frame: frame - 20, fps, config: { damping: 12 } });
  const feat2Spring = spring({ frame: frame - 40, fps, config: { damping: 12 } });

  return (
    <div className="w-full h-full bg-[#05080B] text-white flex items-center justify-between p-12 relative overflow-hidden font-sans">
      {/* Background Gold Ambient */}
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/15 blur-[160px] rounded-full pointer-events-none" />

      {/* Left Column: Driver Earnings UI Simulation */}
      <div 
        style={{ transform: `scale(${cardSpring})` }}
        className="w-[380px] p-6 rounded-3xl bg-gradient-to-b from-[#161f2e] to-[#0d1420] border border-amber-400/30 shadow-[0_20px_50px_rgba(244,197,66,0.15)] relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Billetera de Conductor</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full uppercase">
            Activo
          </span>
        </div>

        {/* Dynamic Balance Counter */}
        <div className="p-5 rounded-2xl bg-black/40 border border-white/10 mb-5 text-center relative">
          <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">Ganancias de Hoy</span>
          <div className="text-4xl font-black text-white mt-1">
            {earnings}.00 <span className="text-amber-400 text-2xl font-extrabold">BOB</span>
          </div>
          <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-bold mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+100% de tus carreras directo a ti</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-white/60 uppercase font-bold">Viajes Realizados</span>
            <div className="text-lg font-black text-white mt-0.5">18 carreras</div>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[10px] text-white/60 uppercase font-bold">Calificación</span>
            <div className="text-lg font-black text-amber-400 mt-0.5">⭐ 4.98</div>
          </div>
        </div>
      </div>

      {/* Right Column: Driver Benefits */}
      <div className="flex-1 ml-12 flex flex-col justify-center gap-6">
        <div>
          <span className="text-amber-400 font-extrabold text-xs uppercase tracking-[0.2em] bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
            Para Conductores y Socios
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 leading-tight">
            ¿Tienes moto o vehículo? <br />
            <span className="text-amber-400">¡Sé tu propio jefe con RiberGO!</span>
          </h2>
        </div>

        {/* Feature 1 */}
        {feat1Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${feat1Spring})` }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Comisiones mínimas y Justas</h3>
              <p className="text-sm text-white/70">Sin comisiones abusivas. Todo el dinero que generas trabajando es tuyo diariamente.</p>
            </div>
          </div>
        )}

        {/* Feature 2 */}
        {feat2Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${feat2Spring})` }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Horarios 100% Flexibles</h3>
              <p className="text-sm text-white/70">Conéctate cuando quieras y trabaja las horas que tú decidas con total libertad.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
