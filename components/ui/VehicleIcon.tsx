'use client';

import React from 'react';
import { Motorbike, CarTaxiFront, Wrench } from 'lucide-react';
import { VehicleType, ServiceType } from '@/store/useAppStore';

export interface VehicleIconProps extends React.SVGProps<SVGSVGElement> {
  type?: VehicleType | ServiceType | 'MOTOTAXI' | 'MOTOCAR' | 'TAXI_AUTO' | 'REMOLCADA' | string;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
}

/**
 * Icono nativo vectorial para Motocar de Carga (Trimóvil con cajón de carga trasero)
 * Diseñado en grid 24x24 con trazo estándar Lucide (strokeWidth 2px).
 */
export const MotocarIcon: React.FC<React.SVGProps<SVGSVGElement> & { size?: number | string; strokeWidth?: number }> = ({
  size = 24,
  strokeWidth = 2,
  className = '',
  ...props
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide lucide-motocar ${className}`}
      {...props}
    >
      {/* Caja / Carrocería de carga trasera */}
      <path d="M10 8h11v7H10z" />
      <path d="M14 8v7" />
      <path d="M18 8v7" />
      {/* Rueda trasera de carga */}
      <circle cx="17" cy="18" r="3" />
      {/* Chasis y unión central */}
      <path d="M10 15H7" />
      <path d="M9 12c-1.5 0-2 1-2.5 3" />
      {/* Rueda delantera de motocicleta */}
      <circle cx="4" cy="18" r="3" />
      {/* Horquilla y manubrio delantero */}
      <path d="M4 15l2.5-6" />
      <path d="M5 9h3" />
    </svg>
  );
};

/**
 * Componente unificado para iconos nativos de vehículos en RiberGO:
 * - MOTOTAXI: Motorbike (Lucide nativo)
 * - TAXI_AUTO: CarTaxiFront (Lucide nativo con letrero TAXI)
 * - MOTOCAR: MotocarIcon (Vector nativo de motocar de carga)
 * - REMOLCADA: Wrench (Lucide auxilio mecánico)
 */
export const VehicleIcon: React.FC<VehicleIconProps> = ({
  type = 'MOTOTAXI',
  className = 'w-5 h-5',
  size,
  strokeWidth = 2,
  ...props
}) => {
  switch (type) {
    case 'MOTOCAR':
      return <MotocarIcon size={size} strokeWidth={strokeWidth} className={className} {...props} />;
    case 'TAXI_AUTO':
      return <CarTaxiFront size={size} strokeWidth={strokeWidth} className={className} {...props} />;
    case 'REMOLCADA':
      return <Wrench size={size} strokeWidth={strokeWidth} className={className} {...props} />;
    case 'MOTOTAXI':
    default:
      return <Motorbike size={size} strokeWidth={strokeWidth} className={className} {...props} />;
  }
};

/**
 * Helper para generar el código SVG raw en formato string (para Leaflet DivIcon en MapComponent)
 */
export function getVehicleSvgString(
  type: VehicleType | ServiceType | string = 'MOTOTAXI',
  strokeColor: string = '#F4C542',
  size: number = 22
): string {
  if (type === 'MOTOCAR') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 8h11v7H10z"/><path d="M14 8v7"/><path d="M18 8v7"/><circle cx="17" cy="18" r="3"/><path d="M10 15H7"/><path d="M9 12c-1.5 0-2 1-2.5 3"/><circle cx="4" cy="18" r="3"/><path d="M4 15l2.5-6"/><path d="M5 9h3"/></svg>`;
  }

  if (type === 'TAXI_AUTO') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2h4"/><path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.646 5H8.4a2 2 0 0 0-1.903 1.257L5 10 3 8"/><path d="M7 14h.01"/><path d="M17 14h.01"/><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>`;
  }

  if (type === 'REMOLCADA') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;
  }

  // Por defecto MOTOTAXI (Motorbike)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 14-1-3"/><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"/><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/></svg>`;
}
