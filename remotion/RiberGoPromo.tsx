'use client';

import React from 'react';
import { RiberGoVerticalPromoComposition } from './RiberGoVerticalPromo';

export const RiberGoPromoComposition: React.FC<{ enableAudio?: boolean }> = (props) => {
  return <RiberGoVerticalPromoComposition {...props} />;
};
