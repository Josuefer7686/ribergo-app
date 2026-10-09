'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Smartphone, Download, Sparkles, Globe } from 'lucide-react';
import { promoAudioEngine } from '../AudioEngine';

export const Scene7CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = frame - 1650;

  const logoScale = spring({ frame: relFrame, fps, config: { damping: 10 } });
  const buttonSpring = spring({ frame: relFrame - 20, fps, config: { damping: 12 } });

  const pulse = Math.sin(relFrame / 8) * 0.08 + 1;

  useEffect(() => {
    if (relFrame === 1) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.speakVoiceover('Descarga RiberGO hoy mismo y vive la nueva era de la movilidad.', 0.95);
    }
    if (relFrame === 25) {
      promoAudioEngine.playCashRegister();
      promoAudioEngine.playConfirmation();
    }
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
      {/* Intense Golden Glow */}
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '1100px',
          height: '1100px',
          background: 'radial-gradient(circle, rgba(244,197,66,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          transform: `translate(-50%, -50%) scale(${pulse})`,
        }}
      />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '900px' }}>
        
        {/* RiberGO 3D Logo Badge */}
        <div 
          style={{
            transform: `scale(${logoScale})`,
            width: '240px',
            height: '240px',
            borderRadius: '56px',
            background: 'linear-gradient(135deg, #FFD966 0%, #F4C542 50%, #D97706 100%)',
            padding: '4px',
            boxShadow: '0 0 100px rgba(244,197,66,0.7)',
            marginBottom: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', height: '100%', backgroundColor: '#090d14', borderRadius: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone style={{ width: '130px', height: '130px', color: '#F4C542', filter: 'drop-shadow(0 0 20px rgba(244,197,66,0.9))' }} />
          </div>
          <div style={{ position: 'absolute', bottom: '-16px', right: '-16px', backgroundColor: '#F4C542', color: '#000000', padding: '16px', borderRadius: '50%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <Sparkles style={{ width: '40px', height: '40px', fill: '#000000' }} />
          </div>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '76px', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.15, margin: 0 }}>
          ¡Únete hoy a <br />
          <span style={{ background: 'linear-gradient(90deg, #F4C542 0%, #FFD966 50%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            RiberGO!
          </span>
        </h2>

        {/* Slogan */}
        <p style={{ fontSize: '32px', color: '#FFFFFF', fontWeight: 800, margin: '24px 0 60px 0' }}>
          Tu ciudad. Tu viaje. Tu RiberGO.
        </p>

        {/* CTA Buttons */}
        {buttonSpring > 0.01 && (
          <div 
            style={{ transform: `scale(${buttonSpring})`, display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}
          >
            <div style={{ width: '100%', padding: '32px 0', background: 'linear-gradient(90deg, #F4C542 0%, #F59E0B 100%)', color: '#000000', fontWeight: 900, textAlign: 'center', borderRadius: '32px', fontSize: '28px', textTransform: 'uppercase', letterSpacing: '3px', boxShadow: '0 0 60px rgba(244,197,66,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <Download style={{ width: '36px', height: '36px', strokeWidth: 3 }} />
              <span>Instalar Web App Gratis</span>
            </div>

            <div style={{ width: '100%', padding: '28px 0', backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 800, textAlign: 'center', borderRadius: '32px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', backdropFilter: 'blur(10px)' }}>
              <Globe style={{ width: '32px', height: '32px', color: '#F4C542' }} />
              <span>ribergo.app</span>
            </div>
          </div>
        )}

        <p style={{ fontSize: '20px', color: '#8F9AA3', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '6px', marginTop: '60px' }}>
          Riberalta • Beni • Bolivia
        </p>

      </div>
    </div>
  );
};
