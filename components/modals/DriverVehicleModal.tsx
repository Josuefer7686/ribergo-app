'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { VehicleType } from '@/services/mockData';
import { apiService } from '@/services/apiService';
import { IosModal } from '@/components/shared/IosModal';
import { Check, ShieldCheck } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

interface DriverVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverVehicleModal = ({ isOpen, onClose }: DriverVehicleModalProps) => {
  const { user, updateUserProfile, driverState, currentLocation } = useAppStore();

  const [selectedType, setSelectedType] = useState<VehicleType>(() => user?.vehicleType || 'MOTOTAXI');
  const [model, setModel] = useState<string>(() => user?.motorcycle || 'Honda Wave 110');
  const [plate, setPlate] = useState<string>(() => user?.plate || '482-RBT');
  const [isSaving, setIsSaving] = useState(false);

  const vehicleOptions: {
    type: VehicleType;
    title: string;
    description: string;
    icon: string;
    badge: string;
  }[] = [
    {
      type: 'MOTOTAXI',
      title: 'Mototaxi Normal',
      description: 'Motocicleta tradicional para pasajeros',
      icon: '/icons/mototaxi_gold.png',
      badge: 'Base 10 BOB',
    },
    {
      type: 'MOTOCAR',
      title: 'Motocar de Carga',
      description: 'Trimóvil con carrocería para traslados y cosas pesadas',
      icon: '/icons/motocar_gold.png',
      badge: 'Base 15 BOB',
    },
    {
      type: 'TAXI_AUTO',
      title: 'Taxi en Automóvil',
      description: 'Auto cómodo de 4 ruedas para pasajeros',
      icon: '/icons/taxi_auto_gold.png',
      badge: 'Base 15 BOB',
    },
  ];

  const handleSave = async () => {
    haptics.heavy();
    audio.driverTripAccepted();
    setIsSaving(true);

    const updatedData = {
      vehicleType: selectedType,
      motorcycle: model.trim() || (selectedType === 'TAXI_AUTO' ? 'Toyota Corolla' : selectedType === 'MOTOCAR' ? 'Kingwong 200cc' : 'Honda Wave 110'),
      plate: plate.trim().toUpperCase() || 'RBT-000',
    };

    updateUserProfile(updatedData);

    if (user?.id) {
      await apiService.updateDriverVehicle(user.id, selectedType, updatedData.motorcycle, updatedData.plate);

      // Si el conductor está actualmente conectado, actualizar su estado en vivo inmediatamente
      if (driverState !== 'OFFLINE') {
        const loc = currentLocation || { lat: -11.0061, lng: -66.0747 };
        await apiService.setDriverOnlineStatus(
          user.id,
          user.name || 'Conductor',
          user.phone || '',
          updatedData.motorcycle,
          updatedData.plate,
          user.rating ?? null,
          loc,
          true,
          0,
          0,
          user.trips || 0,
          user.avatar || '',
          selectedType
        );
      }
    }

    setIsSaving(false);
    onClose();
  };

  return (
    <IosModal isOpen={isOpen} onClose={onClose} title="Mi Vehículo de Trabajo">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-white block mb-1.5">
            Selecciona tu tipo de vehículo
          </label>
          <p className="text-[11px] text-text-secondary mb-3">
            Recibirás en tu pantalla únicamente las solicitudes correspondientes a tu vehículo y aparecerás en el mapa en esa categoría.
          </p>

          <div className="space-y-2">
            {vehicleOptions.map((opt) => {
              const isSelected = selectedType === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setSelectedType(opt.type);
                    if (opt.type === 'MOTOCAR' && (!model || model.includes('Wave') || model.includes('Honda'))) {
                      setModel('Kingwong 200cc Carga');
                    } else if (opt.type === 'TAXI_AUTO' && (!model || model.includes('Wave') || model.includes('Kingwong'))) {
                      setModel('Toyota Caldina');
                    } else if (opt.type === 'MOTOTAXI' && (!model || model.includes('Caldina') || model.includes('Kingwong'))) {
                      setModel('Honda Wave 110');
                    }
                  }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-gold-primary/15 border-gold-primary shadow-lg shadow-gold-primary/10'
                      : 'bg-surface-2/60 border-border-custom hover:border-gold-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#05080B] border border-gold-primary/40 flex items-center justify-center p-2 shrink-0 shadow-md">
                      <img src={opt.icon} alt={opt.title} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{opt.title}</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-gold-primary/20 text-[9px] font-bold text-gold-primary">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5">{opt.description}</p>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-gold-primary bg-gold-primary text-background' : 'border-border-custom'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modelo del vehículo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white block">
            Marca / Modelo del Vehículo
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Ej. Honda Wave 110, Kingwong 200cc, Toyota Caldina"
            className="w-full p-3 rounded-xl bg-surface-2 border border-border-custom text-white text-xs focus:outline-none focus:border-gold-primary"
          />
        </div>

        {/* Placa del vehículo */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white block">
            Número de Placa
          </label>
          <input
            type="text"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="Ej. 482-RBT"
            className="w-full p-3 rounded-xl bg-surface-2 border border-border-custom text-white text-xs font-mono uppercase focus:outline-none focus:border-gold-primary"
          />
        </div>

        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="text-[11px]">Tu información de vehículo se sincroniza automáticamente con el mapa de Riberalta.</span>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl bg-gold-primary hover:bg-gold-light text-background font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-lg shadow-gold-primary/25 disabled:opacity-50"
        >
          {isSaving ? 'Guardando...' : 'Guardar y Aplicar'}
        </button>
      </div>
    </IosModal>
  );
};
