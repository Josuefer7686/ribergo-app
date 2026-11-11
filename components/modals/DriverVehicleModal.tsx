'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check, Clock, Plus, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { IosModal } from '@/components/shared/IosModal';
import { VehicleIcon } from '@/components/ui/VehicleIcon';
import { AddVehicleOverlay, VEHICLE_OPTIONS } from '@/components/driver/DriverVerificationGate';
import { activateVehicle, fetchVerification, type DriverVehicleInfo } from '@/services/driverVerificationClient';
import { haptics } from '@/utils/haptics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** Mis vehículos: elige con cuál trabajas y registra otros (solo foto y modelo). */
export const DriverVehicleModal = ({ isOpen, onClose }: Props) => {
  const { user, updateUserProfile, driverState, currentLocation } = useAppStore();
  const [vehicles, setVehicles] = useState<DriverVehicleInfo[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    const res = await fetchVerification();
    if (res) setVehicles(res.vehicles);
    else setLoadFailed(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isOpen, load]);

  const use = async (v: DriverVehicleInfo) => {
    if (busyType || v.type === user?.vehicleType) return;
    haptics.heavy();
    setBusyType(v.type);
    setMessage('');
    const res = await activateVehicle(v.type);
    if (res.ok && res.vehicleType) {
      const model = res.motorcycle || v.model;
      updateUserProfile({ vehicleType: res.vehicleType, motorcycle: model });
      if (user?.id) {
        await apiService.updateDriverVehicle(user.id, res.vehicleType, model, user.plate || '');
        // Si está conectado, el mapa lo ve ahora con su nuevo vehículo
        if (driverState !== 'OFFLINE') {
          const loc = currentLocation || { lat: -11.0061, lng: -66.0747 };
          await apiService.setDriverOnlineStatus(
            user.id, user.name || 'Conductor', user.phone || '', model, user.plate || '',
            user.rating ?? null, loc, true, 0, 0, user.trips || 0, user.avatar || '', res.vehicleType,
          );
        }
      }
      haptics.success();
    } else {
      setMessage(res.error || 'No se pudo cambiar el vehículo.');
      haptics.error();
    }
    setBusyType(null);
  };

  const registrable = VEHICLE_OPTIONS.some((o) => !vehicles?.some((v) => v.type === o.type && v.status !== 'REJECTED'));

  return (
    <>
      <IosModal isOpen={isOpen && !adding} onClose={onClose} title="Mis vehículos">
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">
            Trabajas con un vehículo a la vez. Solo recibirás pedidos del que elijas. Para registrar otro basta su foto y modelo: no repites tu carnet.
          </p>

          {loadFailed && (
            <button onClick={() => void load()} className="w-full min-h-12 rounded-2xl bg-surface-2 border border-white/10 text-sm font-bold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />No pudimos cargar. Reintentar
            </button>
          )}
          {!vehicles && !loadFailed && <p className="text-sm text-text-secondary text-center py-6">Cargando…</p>}

          <div className="space-y-2.5">
            {vehicles?.map((v, i) => {
              const active = v.type === user?.vehicleType && v.status === 'APPROVED';
              const opt = VEHICLE_OPTIONS.find((o) => o.type === v.type)!;
              return (
                <motion.button
                  key={v.type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  type="button"
                  disabled={v.status !== 'APPROVED' || !!busyType}
                  onClick={() => use(v)}
                  className={`w-full text-left rounded-2xl border-2 p-3.5 flex items-center gap-3.5 transition-colors ${active ? 'border-gold-primary bg-gold-primary/10' : 'border-white/10 bg-surface-2/60'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-gold-primary text-background' : 'bg-surface text-gold-primary'}`}>
                    <VehicleIcon type={v.type} className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold">{opt.title}</p>
                    <p className="text-xs text-text-secondary break-words">{v.model}</p>
                    {v.status === 'PENDING' && <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gold-primary"><Clock className="w-3 h-3" />En revisión</p>}
                    {v.status === 'REJECTED' && <p className="mt-1 inline-flex items-start gap-1 text-[11px] font-bold text-rose-300"><TriangleAlert className="w-3 h-3 mt-0.5 shrink-0" />Rechazado: {v.rejectReason}</p>}
                    {v.status === 'APPROVED' && !active && <p className="mt-1 text-[11px] font-bold text-emerald-300">Aprobado · toca para usarlo</p>}
                  </div>
                  {active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-primary text-background px-2.5 py-1 text-[11px] font-black"><Check className="w-3 h-3 stroke-[3]" />En uso</span>
                  )}
                  {busyType === v.type && <RefreshCw className="w-4 h-4 animate-spin text-gold-primary" />}
                </motion.button>
              );
            })}
          </div>

          {message && <p role="alert" className="text-sm text-rose-300">{message}</p>}

          {vehicles && registrable && (
            <button onClick={() => { haptics.selection(); setAdding(true); }} className="w-full min-h-12 rounded-2xl bg-gold-primary text-background font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition">
              <Plus className="w-5 h-5 stroke-[3]" />Registrar otro vehículo
            </button>
          )}
        </div>
      </IosModal>

      {adding && vehicles && (
        <AddVehicleOverlay
          vehicles={vehicles}
          onClose={() => setAdding(false)}
          onSent={() => { setAdding(false); void load(); }}
        />
      )}
    </>
  );
};
