'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { Power, Wallet, TrendingUp, CheckCircle2, Bike } from 'lucide-react';
import { PhoneMockup } from '../components/PhoneMockup';
import { TapEffect } from '../components/TapEffect';
import { promoAudioEngine } from '../AudioEngine';

export const Scene5DriverUI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = frame - 1050;

  const isOnline = relFrame >= 30;
  const showRideAlert = relFrame >= 120;
  const isAccepted = relFrame >= 240;

  const balanceCount = Math.min(285, Math.floor(interpolate(relFrame, [240, 360], [180, 285])));
  const showTap = relFrame >= 210 && relFrame <= 245;

  useEffect(() => {
    if (relFrame === 1) {
      promoAudioEngine.playWhoosh();
      promoAudioEngine.speakVoiceover('¿Quieres trabajar con RiberGO? Conéctate cuando quieras, recibe carreras y gana dinero todos los días.', 0.9);
    }
    if (relFrame === 30) promoAudioEngine.playPop();
    if (relFrame === 120) promoAudioEngine.playConfirmation();
    if (relFrame === 240) promoAudioEngine.playCashRegister();
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
      {/* Top Banner Tag for Drivers */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 10 }}>
        <span style={{ color: '#F4C542', fontWeight: 900, fontSize: '24px', textTransform: 'uppercase', letterSpacing: '6px', backgroundColor: 'rgba(244,197,66,0.15)', padding: '14px 36px', borderRadius: '100px', border: '2px solid rgba(244,197,66,0.4)', marginBottom: '16px' }}>
          Para Conductores y Socios
        </span>
        <h2 style={{ fontSize: '56px', fontWeight: 900, color: '#FFFFFF', margin: 0 }}>
          ¡Sé tu propio jefe con <span style={{ color: '#F4C542' }}>RiberGO</span>!
        </h2>
      </div>

      {/* Driver UI Phone Mockup */}
      <div style={{ zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
        <PhoneMockup scale={1}>
          
          <div style={{ width: '100%', height: '100%', backgroundColor: '#05080B', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Driver Wallet Header */}
            <div style={{ padding: '24px', borderRadius: '28px', backgroundColor: '#0d141e', border: '2px solid rgba(244,197,66,0.4)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: 'rgba(244,197,66,0.2)', color: '#F4C542' }}>
                    <Wallet style={{ width: '28px', height: '28px' }} />
                  </div>
                  <span style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>Billetera de Conductor</span>
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  padding: '8px 16px',
                  borderRadius: '100px',
                  textTransform: 'uppercase',
                  backgroundColor: isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                  color: isOnline ? '#10B981' : '#8F9AA3',
                  border: isOnline ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  {isOnline ? 'EN LÍNEA' : 'DESCONECTADO'}
                </span>
              </div>

              {/* Dynamic Balance Display */}
              <div style={{ textAlign: 'center', padding: '20px', borderRadius: '20px', backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '16px', color: '#F4C542', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px' }}>Ganancias Acumuladas</span>
                <div style={{ fontSize: '52px', fontWeight: 900, color: '#FFFFFF', marginTop: '4px' }}>
                  {balanceCount}.00 <span style={{ color: '#F4C542', fontSize: '32px' }}>BOB</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '16px', color: '#10B981', fontWeight: 900, marginTop: '8px' }}>
                  <TrendingUp style={{ width: '20px', height: '20px' }} />
                  <span>Comisiones Mínimas Garantizadas</span>
                </div>
              </div>
            </div>

            {/* Online Toggle Switch Button */}
            <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center' }}>
              <div 
                style={{
                  width: '100%',
                  padding: '24px 0',
                  borderRadius: '24px',
                  fontWeight: 900,
                  fontSize: '18px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  backgroundColor: isOnline ? '#10B981' : 'rgba(255,255,255,0.1)',
                  color: isOnline ? '#000000' : '#8F9AA3',
                  boxShadow: isOnline ? '0 10px 30px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                <Power style={{ width: '28px', height: '28px' }} />
                <span>{isOnline ? 'CONECTADO Y RECIBIENDO' : 'TOCAR PARA CONECTARSE'}</span>
              </div>
            </div>

            {/* Ride Request Alert Banner */}
            {showRideAlert && (
              <div style={{ padding: '24px', borderRadius: '28px', backgroundColor: '#0c131c', border: '3px solid #F4C542', boxShadow: '0 20px 50px rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                  <span style={{ fontSize: '16px', textTransform: 'uppercase', fontWeight: 900, color: '#F4C542', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bike style={{ width: '22px', height: '22px' }} />
                    ¡Nueva Carrera Entrada!
                  </span>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#F4C542', backgroundColor: 'rgba(244,197,66,0.2)', padding: '4px 12px', borderRadius: '10px' }}>7.00 BOB</span>
                </div>

                <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                  <p style={{ color: '#8F9AA3', fontSize: '14px', margin: 0 }}>Recogida:</p>
                  <p style={{ margin: '4px 0 0 0' }}>Plaza Principal (Riberalta)</p>
                </div>

                {isAccepted ? (
                  <div style={{ width: '100%', padding: '20px 0', backgroundColor: '#10B981', color: '#000000', fontWeight: 900, textAlign: 'center', borderRadius: '20px', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <CheckCircle2 style={{ width: '24px', height: '24px' }} />
                    <span>Carrera Aceptada • En Camino</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', padding: '20px 0', background: 'linear-gradient(90deg, #F4C542 0%, #F59E0B 100%)', color: '#000000', fontWeight: 900, textAlign: 'center', borderRadius: '20px', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '2px', position: 'relative' }}>
                    Aceptar Carrera Ahora
                    {showTap && <TapEffect x={260} y={30} />}
                  </div>
                )}
              </div>
            )}

            {/* Footer Driver Perks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center', fontSize: '16px', fontWeight: 900, color: '#8F9AA3', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '16px' }}>⚡ Pagos Diarios</span>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '12px', borderRadius: '16px' }}>⏱️ Horarios Libres</span>
            </div>

          </div>

        </PhoneMockup>
      </div>

    </div>
  );
};
