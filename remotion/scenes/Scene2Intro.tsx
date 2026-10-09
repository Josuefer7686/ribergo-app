'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Smartphone, Sparkles, CheckCircle2 } from 'lucide-react';
import { PhoneMockup } from '../components/PhoneMockup';
import { promoAudioEngine } from '../AudioEngine';

export const Scene2Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const logoScale = spring({ frame: frame - 150, fps, config: { damping: 11 } });
  const phoneY = interpolate(frame, [160, 190], [350, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const phoneRotate = interpolate(frame, [160, 190], [-12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Voiceover & SFX
  useEffect(() => {
    if (frame === 150) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.playPop();
      promoAudioEngine.speakVoiceover('Con RiberGO, pedir tu transporte es más fácil, rápido y sencillo.', 0.95);
    }
  }, [frame]);

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
        justifyContent: 'space-between',
        padding: '100px 40px 60px 40px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Header Logo Presentation */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 10 }}>
        
        {/* RiberGO 3D Logo Badge */}
        <div 
          style={{
            transform: `scale(${logoScale})`,
            width: '160px',
            height: '160px',
            borderRadius: '40px',
            background: 'linear-gradient(135deg, #FFD966 0%, #F4C542 50%, #D97706 100%)',
            padding: '4px',
            boxShadow: '0 0 80px rgba(244,197,66,0.6)',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', height: '100%', backgroundColor: '#0B1116', borderRadius: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone style={{ width: '80px', height: '80px', color: '#F4C542', filter: 'drop-shadow(0 0 15px rgba(244,197,66,0.8))' }} />
          </div>
          <div style={{ position: 'absolute', bottom: '-12px', right: '-12px', backgroundColor: '#F4C542', color: '#000000', padding: '12px', borderRadius: '50%', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <Sparkles style={{ width: '32px', height: '32px', fill: '#000000' }} />
          </div>
        </div>

        {/* Brand Name */}
        <h2 style={{ fontSize: '72px', fontWeight: 900, letterSpacing: '-1px', margin: 0 }}>
          <span style={{ color: '#FFFFFF' }}>Riber</span>
          <span style={{ color: '#F4C542' }}>GO</span>
        </h2>
        <p style={{ fontSize: '24px', color: '#F4C542', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '6px', marginTop: '10px' }}>
          Mototaxis a un toque
        </p>

      </div>

      {/* Center Phone Mockup Intro */}
      <div style={{ zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '40px' }}>
        <PhoneMockup translateY={phoneY} rotationY={phoneRotate} scale={1}>
          {/* Splash Screen Inside Phone */}
          <div style={{ width: '100%', height: '100%', backgroundColor: '#05080B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', boxSizing: 'border-box' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '32px', backgroundColor: 'rgba(244,197,66,0.2)', border: '2px solid rgba(244,197,66,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px' }}>
              <Smartphone style={{ width: '64px', height: '64px', color: '#F4C542' }} />
            </div>
            <h3 style={{ fontSize: '42px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>RiberGO App</h3>
            <p style={{ fontSize: '22px', color: '#8F9AA3', marginTop: '12px', fontWeight: 600 }}>Riberalta, Beni - Bolivia</p>

            {/* Quick Loading Simulation */}
            <div style={{ marginTop: '60px', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 32px', borderRadius: '100px', backgroundColor: 'rgba(244,197,66,0.15)', border: '1px solid rgba(244,197,66,0.3)', color: '#F4C542', fontSize: '20px', fontWeight: 800 }}>
              <CheckCircle2 style={{ width: '28px', height: '28px' }} />
              <span>Conexión Instantánea</span>
            </div>
          </div>
        </PhoneMockup>
      </div>

    </div>
  );
};
