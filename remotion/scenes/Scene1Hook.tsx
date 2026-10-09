'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { MapPin, Compass, Navigation } from 'lucide-react';
import { promoAudioEngine } from '../AudioEngine';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animations
  const textScale = spring({ frame, fps, config: { damping: 12 } });
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textY = interpolate(frame, [0, 20], [60, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Floating compass animation
  const compassRotate = frame * 1.5;
  const pinBounce = Math.sin(frame / 8) * 16;

  // Voiceover & SFX trigger
  useEffect(() => {
    if (frame === 1) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.speakVoiceover('Moverte por Riberalta está cambiando.', 0.95);
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
        justifyContent: 'center',
        padding: '80px 60px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* City Map Background Graphic */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.2, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ stroke: '#F4C542', strokeWidth: 2, fill: 'none' }}>
          <circle cx="540" cy="960" r="300" strokeDasharray="10 10" />
          <circle cx="540" cy="960" r="500" strokeDasharray="8 8" />
          <line x1="140" y1="960" x2="940" y2="960" />
          <line x1="540" y1="360" x2="540" y2="1560" />
        </svg>
      </div>

      {/* Main Content Container */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '900px' }}>
        
        {/* Animated Map Compass Icon */}
        <div 
          style={{
            transform: `translateY(${pinBounce}px)`,
            width: '240px',
            height: '240px',
            borderRadius: '56px',
            background: 'linear-gradient(135deg, #F4C542 0%, #D97706 100%)',
            padding: '4px',
            boxShadow: '0 0 100px rgba(244,197,66,0.5)',
            marginBottom: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', height: '100%', backgroundColor: '#0B1116', borderRadius: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Compass 
              style={{ transform: `rotate(${compassRotate}deg)`, width: '130px', height: '130px', color: '#F4C542', filter: 'drop-shadow(0 0 20px rgba(244,197,66,0.8))' }} 
            />
          </div>
          <div style={{ position: 'absolute', top: '-16px', right: '-16px', backgroundColor: '#F4C542', color: '#000000', padding: '16px', borderRadius: '50%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <MapPin style={{ width: '48px', height: '48px', fill: '#000000', color: '#F4C542' }} />
          </div>
        </div>

        {/* Location Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 36px', borderRadius: '100px', backgroundColor: 'rgba(244,197,66,0.15)', border: '2px solid rgba(244,197,66,0.4)', color: '#F4C542', fontSize: '28px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '6px', marginBottom: '50px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
          <Navigation style={{ width: '32px', height: '32px', fill: '#F4C542' }} />
          <span>Riberalta, Beni</span>
        </div>

        {/* Impact Hook Title */}
        <div style={{ opacity: textOpacity, transform: `translateY(${textY}px) scale(${textScale})` }}>
          <h1 style={{ fontSize: '84px', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.15, color: '#FFFFFF', margin: 0, textShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            Moverte por <br />
            <span style={{ background: 'linear-gradient(90deg, #F4C542 0%, #FFD966 50%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Riberalta
            </span> <br />
            está cambiando.
          </h1>
        </div>

        {/* Subtitle */}
        <p style={{ fontSize: '32px', color: '#8F9AA3', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginTop: '60px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '20px 40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
          La nueva era de la movilidad urbana
        </p>

      </div>
    </div>
  );
};
