'use client';

import dynamic from 'next/dynamic';
import { IosMapLoader } from '@/components/shared/IosMapLoader';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <IosMapLoader />,
});

export const MapView = () => <MapComponent />;

