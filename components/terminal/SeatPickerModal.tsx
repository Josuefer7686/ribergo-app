'use client';

import { useState } from 'react';
import { IosModal } from '@/components/shared/IosModal';
import { TerminalDeparture } from '@/store/useAppStore';
import { motion } from 'framer-motion';
import { CheckCircle2, User, Sparkles, Car } from 'lucide-react';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

interface SeatPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  departure: TerminalDeparture | null;
  onConfirmBooking: (seatNumber: number) => void;
  isProcessing?: boolean;
}

export const SeatPickerModal = ({
  isOpen,
  onClose,
  departure,
  onConfirmBooking,
  isProcessing = false,
}: SeatPickerModalProps) => {
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);

  if (!departure) return null;

  const totalSeats = departure.totalSeats || 7;
  const occupiedSeats = departure.occupiedSeats || [];

  const handleSelectSeat = (seatNum: number) => {
    if (occupiedSeats.includes(seatNum)) {
      haptics.error();
      return;
    }
    haptics.selection();
    setSelectedSeat(seatNum);
  };

  const handleConfirm = () => {
    if (!selectedSeat) return;
    haptics.heavy();
    audio.passengerRideRequested();
    onConfirmBooking(selectedSeat);
  };

  // Seat layout matrix generator for Noah (7 seats) vs Ipsum (6 seats)
  const seatsList = Array.from({ length: totalSeats }, (_, i) => i + 1);

  return (
    <IosModal isOpen={isOpen} onClose={onClose} title="Seleccionar Asiento en el Auto">
      <div className="space-y-4 text-white">
        {/* Vehicle Header */}
        <div className="p-4 rounded-2xl bg-surface-2 border border-gold-primary/30 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-gold-primary text-xs font-bold uppercase tracking-wider">
              <Car className="w-4 h-4" />
              <span>{departure.vehicleModel}</span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Chofer: <span className="text-white font-semibold">{departure.driverName}</span> • {departure.time}
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-black text-gold-primary">{departure.pricePerSeat.toFixed(2)}</span>
            <span className="text-[10px] font-bold text-gold-light uppercase ml-0.5">BOB</span>
          </div>
        </div>

        {/* Vehicle Interior Schema Legend */}
        <div className="flex items-center justify-center gap-4 text-[11px] text-text-secondary py-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-gold-primary/20 border border-gold-primary" />
            <span>Disponible</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-gold-primary shadow-lg shadow-gold-primary/40" />
            <span>Tu Selección</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-surface-2 border border-border-custom opacity-50" />
            <span>Ocupado</span>
          </div>
        </div>

        {/* Visual Seat Map (Toyota Noah / Ipsum Interior) */}
        <div className="p-5 rounded-3xl bg-surface border border-gold-primary/30 relative overflow-hidden space-y-4">
          <div className="text-center text-[10px] font-black uppercase text-gold-primary tracking-widest border-b border-border-custom pb-2">
            ▲ FRENTE DEL VEHÍCULO (MOTOR & PARABRISAS) ▲
          </div>

          {/* Row 1: Driver & Front Passenger Seat #1 */}
          <div className="grid grid-cols-2 gap-4 max-w-[240px] mx-auto">
            {/* Driver Position */}
            <div className="p-3 rounded-2xl bg-surface-2 border border-border-custom text-center flex flex-col items-center justify-center gap-1 text-text-secondary opacity-60">
              <span className="text-[10px] font-black uppercase">CHOFER</span>
              <span className="text-xs">🧑‍✈️</span>
            </div>

            {/* Front Passenger Seat #1 */}
            {(() => {
              const isOccupied = occupiedSeats.includes(1);
              const isSelected = selectedSeat === 1;
              return (
                <button
                  type="button"
                  onClick={() => handleSelectSeat(1)}
                  disabled={isOccupied}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    isOccupied
                      ? 'bg-surface-2 border-border-custom opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gold-primary text-background border-gold-primary font-black shadow-lg shadow-gold-primary/30 scale-105'
                      : 'bg-gold-primary/10 border-gold-primary/40 text-gold-light hover:bg-gold-primary/20'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">ASIENTO #1</span>
                  <span className="text-xs font-black">{isOccupied ? 'OCUPADO' : isSelected ? 'ELEGIDO' : '35 BOB'}</span>
                </button>
              );
            })()}
          </div>

          {/* Row 2: Middle Seats (#2, #3, #4) */}
          <div className="text-center text-[9px] font-bold text-text-secondary uppercase tracking-widest pt-1">
            Fila Media
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
            {[2, 3, 4].map((seatNum) => {
              if (seatNum > totalSeats) return null;
              const isOccupied = occupiedSeats.includes(seatNum);
              const isSelected = selectedSeat === seatNum;
              return (
                <button
                  key={seatNum}
                  type="button"
                  onClick={() => handleSelectSeat(seatNum)}
                  disabled={isOccupied}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    isOccupied
                      ? 'bg-surface-2 border-border-custom opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gold-primary text-background border-gold-primary font-black shadow-lg shadow-gold-primary/30 scale-105'
                      : 'bg-gold-primary/10 border-gold-primary/40 text-gold-light hover:bg-gold-primary/20'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">#{seatNum}</span>
                  <span className="text-[10px] font-black">{isOccupied ? 'OCUPADO' : isSelected ? 'ELEGIDO' : 'LIBRE'}</span>
                </button>
              );
            })}
          </div>

          {/* Row 3: Back Seats (#5, #6, #7) */}
          <div className="text-center text-[9px] font-bold text-text-secondary uppercase tracking-widest pt-1">
            Fila Trasera
          </div>
          <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
            {[5, 6, 7].map((seatNum) => {
              if (seatNum > totalSeats) return null;
              const isOccupied = occupiedSeats.includes(seatNum);
              const isSelected = selectedSeat === seatNum;
              return (
                <button
                  key={seatNum}
                  type="button"
                  onClick={() => handleSelectSeat(seatNum)}
                  disabled={isOccupied}
                  className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
                    isOccupied
                      ? 'bg-surface-2 border-border-custom opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-gold-primary text-background border-gold-primary font-black shadow-lg shadow-gold-primary/30 scale-105'
                      : 'bg-gold-primary/10 border-gold-primary/40 text-gold-light hover:bg-gold-primary/20'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase">#{seatNum}</span>
                  <span className="text-[10px] font-black">{isOccupied ? 'OCUPADO' : isSelected ? 'ELEGIDO' : 'LIBRE'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Confirm Seat Button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedSeat || isProcessing}
          className="w-full py-3.5 bg-gradient-to-r from-gold-primary via-amber-400 to-yellow-500 text-background rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-gold-primary/25 transition active:scale-95 disabled:opacity-40"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>
            {selectedSeat 
              ? `CONFIRMAR ASIENTO #${selectedSeat} (35 BOB)` 
              : 'SELECCIONA UN ASIENTO'}
          </span>
        </button>
      </div>
    </IosModal>
  );
};
