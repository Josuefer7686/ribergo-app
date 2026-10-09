'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Zap, DollarSign, MapPin, ShieldCheck } from 'lucide-react';
import { promoAudioEngine } from '../AudioEngine';

export const Scene4Benefits: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = frame - 750;

  const b1Scale = spring({ frame: relFrame - 10, fps, config: { damping: 11 } });
  const b2Scale = spring({ frame: relFrame - 40, fps, config: { damping: 11 } });
  const b3Scale = spring({ frame: relFrame - 70, fps, config: { damping: 11 } });
  const b4Scale = spring({ frame: relFrame - 100, fps, config: { damping: 11 } });

  useEffect(() => {
    if (relFrame === 1) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.speakVoiceover('Rápido, transparente, seguro y pensado 100% para nuestra gente de Riberalta.', 0.95);
    }
    if (relFrame === 15) promoAudioEngine.playPop();
    if (relFrame === 45) promoAudioEngine.playPop();
    if (relFrame === 75) promoAudioEngine.playPop();
    if (relFrame === 105) promoAudioEngine.playConfirmation();
  }, [relFrame]);

  return (
    <div
      style={{
        width: '1080px',
        height: '1920px',
        backgroundColor: '#05080B',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 60px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Background radial glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '900px', height: '900px', background: 'radial-gradient(circle, rgba(244,197,66,0.2) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', zIndex: 10, marginBottom: '80px', maxWidth: '850px' }}>
        <span style={{ color: '#F4C542', fontWeight: 900, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '6px', backgroundColor: 'rgba(244,197,66,0.15)', padding: '14px 36px', borderRadius: '100px', border: '2px solid rgba(244,197,66,0.4)' }}>
          ¿Por qué RiberGO?
        </span>
        <h2 style={{ fontSize: '64px', fontWeight: 900, color: '#FFFFFF', marginTop: '28px', lineHeight: 1.2 }}>
          La experiencia que <br />
          <span style={{ color: '#F4C542' }}>Riberalta se merece</span>
        </h2>
      </div>

      {/* 4 Benefits Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', maxWidth: '850px', zIndex: 10 }}>
        
        {/* Benefit 1 */}
        {b1Scale > 0.01 && (
          <div 
            style={{ transform: `scale(${b1Scale})`, display: 'flex', alignItems: 'center', gap: '28px', padding: '32px 36px', borderRadius: '32px', backgroundColor: '#0d141e', border: '2px solid rgba(244,197,66,0.4)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap style={{ width: '48px', height: '48px', fill: '#F4C542' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>⚡ RÁPIDO</h3>
              <p style={{ fontSize: '22px', color: '#8F9AA3', fontWeight: 600, margin: '8px 0 0 0' }}>Pide tu mototaxi en segundos sin esperar en la calle.</p>
            </div>
          </div>
        )}

        {/* Benefit 2 */}
        {b2Scale > 0.01 && (
          <div 
            style={{ transform: `scale(${b2Scale})`, display: 'flex', alignItems: 'center', gap: '28px', padding: '32px 36px', borderRadius: '32px', backgroundColor: '#0d141e', border: '2px solid rgba(244,197,66,0.4)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign style={{ width: '48px', height: '48px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 900, color: '#F4C542', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>💰 TRANSPARENTE</h3>
              <p style={{ fontSize: '22px', color: '#8F9AA3', fontWeight: 600, margin: '8px 0 0 0' }}>Tarifas claras fijas antes de pedir. Cero cobros abusivos.</p>
            </div>
          </div>
        )}

        {/* Benefit 3 */}
        {b3Scale > 0.01 && (
          <div 
            style={{ transform: `scale(${b3Scale})`, display: 'flex', alignItems: 'center', gap: '28px', padding: '32px 36px', borderRadius: '32px', backgroundColor: '#0d141e', border: '2px solid rgba(244,197,66,0.4)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MapPin style={{ width: '48px', height: '48px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 900, color: '#FFFFFF', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>📍 RASTREO GPS EN VIVO</h3>
              <p style={{ fontSize: '22px', color: '#8F9AA3', fontWeight: 600, margin: '8px 0 0 0' }}>Mira a tu conductor desplazarse en el mapa en tiempo real.</p>
            </div>
          </div>
        )}

        {/* Benefit 4 */}
        {b4Scale > 0.01 && (
          <div 
            style={{ transform: `scale(${b4Scale})`, display: 'flex', alignItems: 'center', gap: '28px', padding: '32px 36px', borderRadius: '32px', backgroundColor: '#0d141e', border: '2px solid rgba(16,185,129,0.5)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
          >
            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck style={{ width: '48px', height: '48px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '32px', fontWeight: 900, color: '#10B981', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>🛡️ 100% SEGURO</h3>
              <p style={{ fontSize: '22px', color: '#8F9AA3', fontWeight: 600, margin: '8px 0 0 0' }}>Conductores verificados con placa y teléfono identificados.</p>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
