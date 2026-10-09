'use client';

import React from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Smartphone, Navigation, ShieldCheck, Banknote, Clock, CheckCircle2 } from 'lucide-react';

export const Scene2Passengers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const phoneScale = spring({ frame, fps, config: { damping: 14 } });
  
  // Card pop-ins
  const card1Spring = spring({ frame: frame - 15, fps, config: { damping: 12 } });
  const card2Spring = spring({ frame: frame - 35, fps, config: { damping: 12 } });
  const card3Spring = spring({ frame: frame - 55, fps, config: { damping: 12 } });

  // Map driver movement simulation
  const driverX = interpolate(frame, [0, 150], [-20, 60], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const driverY = interpolate(frame, [0, 150], [50, -30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div className="w-full h-full bg-[#05080B] text-white flex items-center justify-between p-12 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Left Column: Mobile App Preview Simulation */}
      <div 
        style={{ transform: `scale(${phoneScale})` }}
        className="w-[320px] h-[580px] bg-black rounded-[40px] border-[6px] border-amber-500/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative flex flex-col justify-between overflow-hidden shrink-0"
      >
        {/* Dynamic Notch */}
        <div className="w-32 h-4 bg-white/10 rounded-full mx-auto mb-2" />

        {/* Mock Map View */}
        <div className="w-full h-56 rounded-2xl bg-[#0e1622] relative overflow-hidden p-3 border border-white/10">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10" />
          
          {/* Simulated Route Line */}
          <svg className="absolute inset-0 w-full h-full stroke-amber-400 stroke-[3] stroke-dasharray-4 fill-none">
            <path d="M 50 160 Q 120 100 200 60" />
          </svg>

          {/* Pickup Marker */}
          <div className="absolute left-[40px] bottom-[30px] bg-emerald-500 text-white p-1.5 rounded-full shadow-lg flex items-center justify-center">
            <Navigation className="w-4 h-4 fill-white" />
          </div>

          {/* Moving Mototaxi Marker */}
          <div 
            style={{ transform: `translate(${driverX}px, ${driverY}px)` }}
            className="absolute left-[100px] bottom-[80px] bg-amber-400 text-black p-2 rounded-xl shadow-xl flex items-center justify-center border border-white/40"
          >
            <span className="text-xs font-black">🏍️ 2 min</span>
          </div>
        </div>

        {/* Mock Booking Panel */}
        <div className="bg-[#121926] p-4 rounded-2xl border border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Mototaxi Urbano</span>
              <h4 className="text-sm font-extrabold text-white">Plaza Principal ➔ Barrio Belén</h4>
            </div>
            <span className="text-lg font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/20">7.00 BOB</span>
          </div>

          <div className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-center rounded-xl text-xs uppercase tracking-wider shadow-md">
            Pedir Mototaxi Ahora
          </div>
        </div>

        {/* Home bar */}
        <div className="w-24 h-1 bg-white/20 rounded-full mx-auto mt-2" />
      </div>

      {/* Right Column: Key Benefits for Passengers */}
      <div className="flex-1 ml-12 flex flex-col justify-center gap-6">
        
        <div>
          <span className="text-amber-400 font-extrabold text-xs uppercase tracking-[0.2em] bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
            Para Pasajeros
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 leading-tight">
            Viaja seguro, rápido y a <br />
            <span className="text-amber-400">precio justo</span>
          </h2>
        </div>

        {/* Feature 1 */}
        {card1Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${card1Spring})` }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Mototaxis a un solo toque</h3>
              <p className="text-sm text-white/70">Olvídate de salir a la calle a buscar o esperar en el sol. Pide desde donde estés.</p>
            </div>
          </div>
        )}

        {/* Feature 2 */}
        {card2Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${card2Spring})` }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Tarifas transparentes</h3>
              <p className="text-sm text-white/70">Conoce exactamente cuánto pagarás antes de pedir. Sin regateos ni cobros excesivos.</p>
            </div>
          </div>
        )}

        {/* Feature 3 */}
        {card3Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${card3Spring})` }}
            className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">Conductores verificados</h3>
              <p className="text-sm text-white/70">Sigue en vivo el recorrido de tu mototaxista con total seguridad y tranquilidad.</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
