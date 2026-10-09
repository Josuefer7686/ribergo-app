'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Navigation, Bike, MapPin, Star, ShieldCheck } from 'lucide-react';
import { PhoneMockup } from '../components/PhoneMockup';
import { TapEffect } from '../components/TapEffect';
import { promoAudioEngine } from '../AudioEngine';

export const Scene3PassengerUI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = frame - 300;

  const showDestinationCard = relFrame >= 40;
  const showFareCard = relFrame >= 120;
  const showDriverCard = relFrame >= 240;

  const tapScale = spring({ frame: relFrame - 20, fps, config: { damping: 10 } });
  const showTap = relFrame >= 15 && relFrame <= 45;

  const driverX = interpolate(relFrame, [240, 420], [-40, 110], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const driverY = interpolate(relFrame, [240, 420], [80, -30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  useEffect(() => {
    if (relFrame === 1) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.speakVoiceover('Indica tu destino, consulta tu tarifa transparente y mira a tu conductor llegar en tiempo real en el mapa.', 0.9);
    }
    if (relFrame === 25) promoAudioEngine.playTap();
    if (relFrame === 125) promoAudioEngine.playPop();
    if (relFrame === 245) promoAudioEngine.playConfirmation();
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
        justifyContent: 'space-between',
        padding: '80px 40px 40px 40px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Banner Tag */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 10 }}>
        <span style={{ color: '#F4C542', fontWeight: 900, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '6px', backgroundColor: 'rgba(244,197,66,0.15)', padding: '14px 36px', borderRadius: '100px', border: '2px solid rgba(244,197,66,0.4)', marginBottom: '16px' }}>
          Para Pasajeros
        </span>
        <h2 style={{ fontSize: '56px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
          Pide tu viaje en <span style={{ color: '#F4C542' }}>segundos</span>
        </h2>
      </div>

      {/* Main Phone Mockup */}
      <div style={{ zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
        <PhoneMockup scale={1}>
          
          {/* Mock Map Background */}
          <div style={{ width: '100%', height: '440px', backgroundColor: '#0e1622', position: 'relative', overflow: 'hidden', padding: '16px', borderBottom: '2px solid rgba(255,255,255,0.1)', boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Simulated Route Line */}
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, stroke: '#F4C542', strokeWidth: 5, strokeDasharray: '8 8', fill: 'none' }}>
              <path d="M 80 340 Q 240 220 420 120" />
            </svg>

            {/* Pickup Location Marker */}
            <div style={{ position: 'absolute', left: '70px', bottom: '60px', backgroundColor: '#10B981', color: '#FFFFFF', padding: '12px', borderRadius: '50%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Navigation style={{ width: '28px', height: '28px', fill: '#FFFFFF' }} />
            </div>

            {/* Destination Marker */}
            <div style={{ position: 'absolute', right: '80px', top: '80px', backgroundColor: '#F4C542', color: '#000000', padding: '12px', borderRadius: '50%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin style={{ width: '28px', height: '28px', fill: '#000000' }} />
            </div>

            {/* Moving Driver Marker */}
            {showDriverCard && (
              <div 
                style={{
                  transform: `translate(${driverX}px, ${driverY}px)`,
                  position: 'absolute',
                  left: '140px',
                  bottom: '160px',
                  backgroundColor: '#F4C542',
                  color: '#000000',
                  padding: '12px 20px',
                  borderRadius: '24px',
                  boxShadow: '0 15px 40px rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: '2px solid rgba(255,255,255,0.6)',
                  fontWeight: 900,
                  fontSize: '20px',
                  zIndex: 30,
                }}
              >
                <span>🏍️ Carlos</span>
                <span style={{ fontSize: '16px', backgroundColor: '#000000', color: '#F4C542', padding: '4px 10px', borderRadius: '12px' }}>2 min</span>
              </div>
            )}
          </div>

          {/* Interactive Booking Panel */}
          <div style={{ flex: 1, padding: '24px', backgroundColor: '#080d14', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            
            {/* Step 1: Select Service */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '20px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bike style={{ width: '36px', height: '36px' }} />
                </div>
                <div>
                  <h4 style={{ fontSize: '24px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>Mototaxi Urbano</h4>
                  <p style={{ fontSize: '16px', color: '#8F9AA3', margin: '4px 0 0 0', fontWeight: 600 }}>Transporte rápido en Riberalta</p>
                </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#F4C542', backgroundColor: 'rgba(244,197,66,0.15)', padding: '6px 16px', borderRadius: '14px' }}>Fijo</span>
            </div>

            {/* Step 2: Destination Card */}
            {showDestinationCard && (
              <div style={{ padding: '20px', borderRadius: '24px', backgroundColor: '#0f1722', border: '2px solid rgba(244,197,66,0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 900, color: '#F4C542', letterSpacing: '2px' }}>Ruta Confirmada</span>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span>Plaza Principal ➔ Barrio Belén</span>
                </div>
              </div>
            )}

            {/* Step 3: Transparent Fixed Price */}
            {showFareCard && (
              <div style={{ padding: '20px', borderRadius: '24px', background: 'linear-gradient(90deg, rgba(244,197,66,0.2) 0%, rgba(244,197,66,0.1) 100%)', border: '2px solid rgba(244,197,66,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>Tarifa Fija Transparente</span>
                  <div style={{ fontSize: '36px', fontWeight: 900, color: '#F4C542', marginTop: '2px' }}>7.00 BOB</div>
                </div>
                <div style={{ fontSize: '16px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#10B981', fontWeight: 900, padding: '8px 16px', borderRadius: '100px', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck style={{ width: '22px', height: '22px' }} />
                  <span>Sin Sorpresas</span>
                </div>
              </div>
            )}

            {/* Step 4: Driver Found Banner */}
            {showDriverCard ? (
              <div style={{ padding: '20px', borderRadius: '24px', backgroundColor: '#F4C542', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 15px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#000000', color: '#F4C542', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    CM
                  </div>
                  <div>
                    <h5 style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>Carlos Mendoza</h5>
                    <p style={{ fontSize: '16px', margin: '4px 0 0 0', fontWeight: 700, opacity: 0.85 }}>Honda Wave 110 • RBT-482</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(0,0,0,0.12)', padding: '8px 14px', borderRadius: '14px', fontSize: '20px', fontWeight: 900 }}>
                  <Star style={{ width: '22px', height: '22px', fill: '#000000' }} />
                  <span>5.0</span>
                </div>
              </div>
            ) : (
              <div style={{ width: '100%', padding: '22px 0', background: 'linear-gradient(90deg, #F4C542 0%, #F59E0B 100%)', color: '#000000', fontWeight: 900, textAlign: 'center', borderRadius: '24px', fontSize: '22px', textTransform: 'uppercase', letterSpacing: '2px', position: 'relative' }}>
                Confirmar Mototaxi
                {showTap && <TapEffect x={280} y={35} scale={tapScale} />}
              </div>
            )}

          </div>

        </PhoneMockup>
      </div>

    </div>
  );
};
