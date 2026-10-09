'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { User, Bike } from 'lucide-react';
import { promoAudioEngine } from '../AudioEngine';

export const Scene6Ecosystem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = frame - 1440;

  const card1X = interpolate(relFrame, [0, 30], [-250, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const card2X = interpolate(relFrame, [15, 45], [250, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  useEffect(() => {
    if (relFrame === 1) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.speakVoiceover('La plataforma que conecta a toda Riberalta.', 0.95);
    }
    if (relFrame === 40) promoAudioEngine.playConfirmation();
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
      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '1000px', height: '1000px', background: 'radial-gradient(circle, rgba(244,197,66,0.25) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', zIndex: 10, marginBottom: '80px', maxWidth: '850px' }}>
        <span style={{ color: '#F4C542', fontWeight: 900, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '6px', backgroundColor: 'rgba(244,197,66,0.15)', padding: '14px 36px', borderRadius: '100px', border: '2px solid rgba(244,197,66,0.4)' }}>
          Un Solo Ecosistema
        </span>
        <h2 style={{ fontSize: '64px', fontWeight: 900, color: '#FFFFFF', marginTop: '28px' }}>
          Riberalta <span style={{ color: '#F4C542' }}>Conectada</span>
        </h2>
      </div>

      {/* Dual Cards Connecting */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', width: '100%', maxWidth: '850px', zIndex: 10 }}>
        
        {/* Passenger Side Card */}
        <div 
          style={{ transform: `translateX(${card1X}px)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 40px', borderRadius: '36px', backgroundColor: '#0e1622', border: '2px solid rgba(244,197,66,0.4)', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '24px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User style={{ width: '48px', height: '48px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Pasajeros</h3>
              <p style={{ fontSize: '22px', color: '#8F9AA3', fontWeight: 600, margin: '6px 0 0 0' }}>Viajan rápido y seguros</p>
            </div>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#F4C542', backgroundColor: 'rgba(244,197,66,0.15)', padding: '12px 28px', borderRadius: '100px' }}>1 Tap</span>
        </div>

        {/* Central Line */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '10px 0' }}>
          <div style={{ height: '80px', width: '6px', background: 'linear-gradient(180deg, #F4C542 0%, #F59E0B 100%)', borderRadius: '4px', boxShadow: '0 0 20px #F4C542' }} />
        </div>

        {/* Driver Side Card */}
        <div 
          style={{ transform: `translateX(${card2X}px)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '36px 40px', borderRadius: '36px', backgroundColor: '#0e1622', border: '2px solid rgba(244,197,66,0.4)', boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '88px', height: '88px', borderRadius: '24px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike style={{ width: '48px', height: '48px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '36px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Conductores</h3>
              <p style={{ fontSize: '22px', color: '#8F9AA3', fontWeight: 600, margin: '6px 0 0 0' }}>Generan ingresos diarios</p>
            </div>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#F4C542', backgroundColor: 'rgba(244,197,66,0.15)', padding: '12px 28px', borderRadius: '100px' }}>Socios</span>
        </div>

      </div>

    </div>
  );
};
