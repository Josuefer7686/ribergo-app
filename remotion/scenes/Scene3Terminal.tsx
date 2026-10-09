'use client';

import React from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Bus, Package, Shield, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Scene3Terminal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const card1Spring = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const card2Spring = spring({ frame: frame - 30, fps, config: { damping: 12 } });

  const badgeOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div className="w-full h-full bg-[#05080B] text-white flex flex-col items-center justify-center p-12 relative overflow-hidden font-sans">
      {/* Ambient Radial Background */}
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <div style={{ opacity: badgeOpacity }} className="text-center max-w-2xl mb-10">
        <span className="text-amber-400 font-black text-xs uppercase tracking-[0.25em] bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
          Servicios Especiales
        </span>
        <h2 className="text-4xl md:text-5xl font-black text-white mt-4 leading-tight">
          ¡Mucho más que mototaxis! <br />
          <span className="text-amber-400">Viajes Interprovinciales y Encomiendas</span>
        </h2>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        
        {/* Card 1: Terminal Interprovincial */}
        {card1Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${card1Spring})` }}
            className="p-8 rounded-3xl bg-[#0e1624] border border-amber-400/20 shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-6">
                <Bus className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2">Terminal Interprovincial</h3>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                Reserva tu asiento en vehículos Toyota Noah o Ipsum para tus viajes fuera de la ciudad. Sin filas ni esperas.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-white/10 text-xs font-bold text-amber-400">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Selección de asientos en tiempo real</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Salidas programadas y confirmadas</span>
            </div>
          </div>
        )}

        {/* Card 2: Encomiendas y Envíos */}
        {card2Spring > 0.01 && (
          <div 
            style={{ transform: `scale(${card2Spring})` }}
            className="p-8 rounded-3xl bg-[#0e1624] border border-amber-400/20 shadow-2xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-6">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-white mb-2">Envío de Encomiendas</h3>
              <p className="text-sm text-white/70 leading-relaxed mb-6">
                Envía paquetes o documentos dentro de la ciudad o a provincias vecinas con código de rastreo en vivo.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-white/10 text-xs font-bold text-amber-400">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Código de seguimiento único</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Entrega rápida y garantizada</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
