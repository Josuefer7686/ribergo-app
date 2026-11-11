'use client';

import { VehicleIcon } from '@/components/ui/VehicleIcon';
import type { ServiceType } from '@/store/useAppStore';
import { haptics } from '@/utils/haptics';

const SERVICES = [
  { id: 'MOTOTAXI', label: 'Mototaxi', hint: 'Rápido y económico' },
  { id: 'MOTOCAR', label: 'Motocar', hint: 'Carga y fletes' },
  { id: 'TAXI_AUTO', label: 'Taxi Auto', hint: 'Más confort' },
] as const;

interface Props {
  value: ServiceType;
  onChange: (service: ServiceType) => void;
  getFare: (service: ServiceType) => number;
}

export function ServicePicker({ value, onChange, getFare }: Props) {
  return (
    <div role="radiogroup" aria-label="Servicios disponibles" className="grid grid-cols-3 gap-2.5">
      {SERVICES.map((s) => {
        const selected = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              haptics.selection();
              onChange(s.id);
            }}
            className={`relative min-h-[104px] px-2 pt-3.5 pb-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
              selected
                ? 'bg-gold-primary/[0.12] border-gold-primary shadow-[0_6px_18px_-8px_rgba(255,198,26,0.5)]'
                : 'bg-surface-2 border-white/10'
            }`}
          >
            <VehicleIcon type={s.id} className="w-8 h-8 stroke-[1.8] text-gold-primary" />
            <span className="text-[15px] font-bold text-white leading-tight">{s.label}</span>
            <span className={`text-xs font-semibold leading-tight ${selected ? 'text-gold-light' : 'text-text-secondary'}`}>
              {selected ? `Bs ${getFare(s.id)}` : s.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}
