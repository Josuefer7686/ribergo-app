'use client';

import React, { useEffect } from 'react';
// @ts-ignore
import { useCurrentFrame } from 'remotion';
import { ParticleGlow } from './components/ParticleGlow';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2Intro } from './scenes/Scene2Intro';
import { Scene3PassengerUI } from './scenes/Scene3PassengerUI';
import { Scene4Benefits } from './scenes/Scene4Benefits';
import { Scene5DriverUI } from './scenes/Scene5DriverUI';
import { Scene6Ecosystem } from './scenes/Scene6Ecosystem';
import { Scene7CTA } from './scenes/Scene7CTA';
import { promoAudioEngine } from './AudioEngine';

export const RiberGoVerticalPromoComposition: React.FC<{ enableAudio?: boolean }> = ({ enableAudio = true }) => {
  const frame = useCurrentFrame();

  // Start background music loop on start
  useEffect(() => {
    if (enableAudio && frame === 1) {
      promoAudioEngine.startBackgroundMusic();
    }
  }, [frame, enableAudio]);

  return (
    <div style={{ width: '1080px', height: '1920px', backgroundColor: '#05080B', position: 'relative', overflow: 'hidden', color: '#FFFFFF', boxSizing: 'border-box' }}>
      
      {/* Background Ambient Particle Glow */}
      <ParticleGlow frame={frame} />

      {/* Scene 1: Hook (0s - 5s | 0 - 150 frames) */}
      {frame >= 0 && frame < 150 && <Scene1Hook />}

      {/* Scene 2: Presentation & Logo (5s - 10s | 150 - 300 frames) */}
      {frame >= 150 && frame < 300 && <Scene2Intro />}

      {/* Scene 3: Passenger Experience & Mototaxi Request (10s - 25s | 300 - 750 frames) */}
      {frame >= 300 && frame < 750 && <Scene3PassengerUI />}

      {/* Scene 4: Key Benefits Popping (25s - 35s | 750 - 1050 frames) */}
      {frame >= 750 && frame < 1050 && <Scene4Benefits />}

      {/* Scene 5: Driver & Worker Opportunity (35s - 48s | 1050 - 1440 frames) */}
      {frame >= 1050 && frame < 1440 && <Scene5DriverUI />}

      {/* Scene 6: Ecosystem Connection (48s - 55s | 1440 - 1650 frames) */}
      {frame >= 1440 && frame < 1650 && <Scene6Ecosystem />}

      {/* Scene 7: CTA & Final Logo (55s - 60s | 1650 - 1800 frames) */}
      {frame >= 1650 && <Scene7CTA />}

    </div>
  );
};
