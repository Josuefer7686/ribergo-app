'use client';

import React from 'react';
// @ts-ignore
import { Composition } from 'remotion';
import { RiberGoVerticalPromoComposition } from './RiberGoVerticalPromo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="RiberGoVerticalPromo"
        component={RiberGoVerticalPromoComposition}
        durationInFrames={1800} // 60 seconds @ 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          enableAudio: true,
        }}
      />
    </>
  );
};
