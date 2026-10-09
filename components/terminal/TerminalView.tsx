'use client';

import { useState, useEffect } from 'react';
import { useAppStore, TerminalDeparture, TerminalBooking, TerminalExpreso, TerminalEncomienda } from '@/store/useAppStore';
import { apiService } from '@/services/apiService';
import { SeatPickerModal } from '@/components/terminal/SeatPickerModal';
import { 
  Bus, Car, Package, Clock, Calendar, MapPin, User, Phone, CheckCircle2, 
  Sparkles, ChevronRight, AlertCircle, MessageSquare, ShieldCheck, QrCode 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/utils/haptics';
import { audio } from '@/utils/audio';

export const TerminalView = () => {
  const { user, setActiveTab } = useAppStore();

  const [activeSubTab, setActiveSubTab] = useState<'BOLETOS' | 'EXPRESO' | 'ENCOMIENDAS'>('BOLETOS');
  
  // Real Firestore States
  const [departures, setDepartures] = useState<TerminalDeparture[]>([]);
  const [userBookings, setUserBookings] = useState<TerminalBooking[]>([]);
  const [userEncomiendas, setUserEncomiendas] = useState<TerminalEncomienda[]>([]);
  const [selectedDeparture, setSelectedDeparture] = useState<TerminalDeparture | null>(null);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Expreso Form State
  const [pickupAddress, setPickupAddress] = useState('');
  const [expresoDestination, setExpresoDestination] = useState('Guayaramerín Centro');
  const [activeExpreso, setActiveExpreso] = useState<TerminalExpreso | null>(null);

  // Encomienda Form State
  const [packageDesc, setPackageDesc] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('Terminal de Guayaramerín');

  // Load real departures from Firestore
  useEffect(() => {
    let isMounted = true;
    apiService.getOrSeedTerminalDepartures().then((deps) => {
      if (isMounted) setDepartures(deps);
    });
    return () => { isMounted = false; };
  }, []);

  // Subscribe to real user bookings & encomiendas from Firestore
  useEffect(() => {
    if (!user?.id) return;
    const unsubBookings = apiService.subscribeToUserBookings(user.id, (bks) => {
      setUserBookings(bks);
    });
    const unsubEncomiendas = apiService.subscribeToEncomiendas(user.id, (encs) => {
      setUserEncomiendas(encs);
    });
    return () => {
      unsubBookings();
      unsubEncomiendas();
    };
  }, [user]);

  // Open Seat Picker Modal for chosen departure
  const handleOpenSeatPicker = (dep: TerminalDeparture) => {
    haptics.impact();
    setSelectedDeparture(dep);
    setIsSeatModalOpen(true);
  };

  // Confirm Seat Booking
  const handleConfirmSeatBooking = async (seatNumber: number) => {
    if (!selectedDeparture || !user) return;
    setIsProcessing(true);
    try {
      const booking = await apiService.bookTerminalSeat(selectedDeparture, seatNumber, user);
      setUserBookings((prev) => [booking, ...prev]);
      
      // Update local departures state
      setDepartures((prev) =>
        prev.map((d) =>
          d.id === selectedDeparture.id
            ? { ...d, occupiedSeats: [...d.occupiedSeats, seatNumber] }
            : d
        )
      );

      setIsProcessing(false);
      setIsSeatModalOpen(false);
      haptics.success();
      audio.passengerTripFinished();
    } catch (err) {
      console.error('Error al reservar boleto:', err);
      setIsProcessing(false);
    }
  };

  // Submit Expreso Request
  const handleCreateExpreso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    haptics.heavy();
    setIsProcessing(true);
    try {
      const expreso = await apiService.requestExpresoRide(
        user,
        pickupAddress,
        expresoDestination,
        'Hoy',
        'Inmediato'
      );
      setActiveExpreso(expreso);
      setIsProcessing(false);
      haptics.success();
      audio.passengerTripFinished();
    } catch (err) {
      console.error('Error al solicitar expreso:', err);
      setIsProcessing(false);
    }
  };

  // Submit Encomienda Request
  const handleCreateEncomienda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !packageDesc) return;
    haptics.heavy();
    setIsProcessing(true);
    try {
      const enc = await apiService.sendEncomienda(
        user,
        recipientName,
        recipientPhone,
        packageDesc,
        'Riberalta',
        'Guayaramerín',
        deliveryAddress
      );
      setUserEncomiendas((prev) => [enc, ...prev]);
      setPackageDesc('');
      setRecipientName('');
      setRecipientPhone('');
      setIsProcessing(false);
      haptics.success();
      audio.passengerTripFinished();
    } catch (err) {
      console.error('Error al enviar encomienda:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full h-full bg-background p-4 sm:p-6 text-white overflow-y-auto no-scrollbar pb-24">
      <div className="pt-safe max-w-sm mx-auto space-y-5">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-gold-primary tracking-widest flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Interprovincial
            </span>
            <h2 className="text-xl font-extrabold tracking-tight">Riberalta ➔ Guayaramerín</h2>
            <p className="text-xs text-text-secondary">Autos Noah, Ipsum, Expresos & Encomiendas</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-surface-2 border border-gold-primary/30 flex items-center justify-center text-gold-primary shadow-lg">
            <Bus className="w-6 h-6" />
          </div>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-surface-2 border border-border-custom text-xs font-bold">
          <button
            onClick={() => {
              haptics.selection();
              setActiveSubTab('BOLETOS');
            }}
            className={`py-2.5 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeSubTab === 'BOLETOS'
                ? 'bg-gold-primary text-background shadow-md shadow-gold-primary/20'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span className="text-[10px] uppercase">Boletos</span>
          </button>

          <button
            onClick={() => {
              haptics.selection();
              setActiveSubTab('EXPRESO');
            }}
            className={`py-2.5 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeSubTab === 'EXPRESO'
                ? 'bg-gold-primary text-background shadow-md shadow-gold-primary/20'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            <span className="text-[10px] uppercase">Expreso</span>
          </button>

          <button
            onClick={() => {
              haptics.selection();
              setActiveSubTab('ENCOMIENDAS');
            }}
            className={`py-2.5 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeSubTab === 'ENCOMIENDAS'
                ? 'bg-gold-primary text-background shadow-md shadow-gold-primary/20'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span className="text-[10px] uppercase">Encomiendas</span>
          </button>
        </div>

        {/* SUB-TAB 1: BOLETOS & HORARIOS NOAH / IPSUM */}
        {activeSubTab === 'BOLETOS' && (
          <div className="space-y-4">
            {/* User Confirmed Ticket Banner if exists */}
            {userBookings.length > 0 && (
              <div className="p-4 rounded-3xl bg-surface border-2 border-gold-primary/60 shadow-xl space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs border-b border-border-custom pb-2">
                  <span className="font-black text-gold-primary uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Boleto Reservado
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-gold-primary/20 text-[10px] font-bold text-gold-primary">
                    Asiento #{userBookings[0].seatNumber}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="font-bold text-white text-sm">{userBookings[0].route}</p>
                  <p className="text-text-secondary">Horario: <span className="text-white font-semibold">{userBookings[0].time}</span> ({userBookings[0].date})</p>
                  <p className="text-text-secondary">Auto: <span className="text-gold-light font-semibold">{userBookings[0].vehicleModel}</span> • Plate: {userBookings[0].plate}</p>
                  <p className="text-text-secondary">Chofer: <span className="text-white font-semibold">{userBookings[0].driverName}</span> ({userBookings[0].driverPhone})</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-custom">
                  <a
                    href={`tel:${userBookings[0].driverPhone}`}
                    className="py-2 px-3 rounded-xl bg-surface-2 border border-gold-primary/40 text-gold-primary text-xs font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Llamar Chofer</span>
                  </a>
                  <span className="text-xs font-black text-white">{userBookings[0].price.toFixed(2)} BOB</span>
                </div>
              </div>
            )}

            {/* Departures List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                Salidas Disponibles Hoy hacia Guayaramerín
              </h3>

              {departures.map((dep) => {
                const availableSeatsCount = dep.totalSeats - dep.occupiedSeats.length;
                return (
                  <div
                    key={dep.id}
                    className="p-4 rounded-3xl bg-surface border border-border-custom hover:border-gold-primary/40 transition shadow-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{dep.time}</h4>
                          <p className="text-[11px] text-text-secondary">{dep.vehicleModel}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-gold-primary">{dep.pricePerSeat.toFixed(2)}</span>
                        <span className="text-[9px] font-bold text-gold-light uppercase ml-0.5">BOB</span>
                        <p className="text-[10px] text-text-secondary">por asiento</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border-custom text-text-secondary">
                      <div>
                        <p className="text-white font-semibold">{dep.driverName}</p>
                        <p className="text-[10px]">Placa: {dep.plate} • ★ {dep.driverRating}</p>
                      </div>

                      <button
                        onClick={() => handleOpenSeatPicker(dep)}
                        disabled={availableSeatsCount <= 0}
                        className="py-2 px-3.5 bg-gold-primary hover:bg-gold-light text-background font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1 shadow-md shadow-gold-primary/20 transition active:scale-95 disabled:opacity-40"
                      >
                        <span>{availableSeatsCount > 0 ? `Elegir Asiento (${availableSeatsCount})` : 'Agotado'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-TAB 2: VIAJE EXPRESO PUERTA A PUERTA */}
        {activeSubTab === 'EXPRESO' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-surface border border-gold-primary/40 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Auto Expreso Privado A/C</h3>
                  <p className="text-xs text-text-secondary">Recojo directo de tu puerta en Riberalta a Guayaramerín</p>
                </div>
              </div>

              <form onSubmit={handleCreateExpreso} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-text-secondary uppercase text-[10px]">Tu Dirección de Recojo en Riberalta</label>
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-2 border border-border-custom">
                    <MapPin className="w-4 h-4 text-gold-primary shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Barrio San José, Calle Beni #420"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      className="bg-transparent w-full outline-none text-white placeholder-text-secondary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-text-secondary uppercase text-[10px]">Dirección de Destino en Guayaramerín</label>
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-surface-2 border border-border-custom">
                    <MapPin className="w-4 h-4 text-gold-primary shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="Ej. Av. 6 de Agosto / Plaza Guayaramerín"
                      value={expresoDestination}
                      onChange={(e) => setExpresoDestination(e.target.value)}
                      className="bg-transparent w-full outline-none text-white placeholder-text-secondary"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-gold-primary/30 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-text-secondary uppercase">Tarifa Auto Privado Completo</p>
                    <p className="text-xs text-gold-light">Toyota Noah / Ipsum con Aire Acondicionado</p>
                  </div>
                  <span className="text-xl font-black text-gold-primary">250.00 BOB</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-gold-primary/20 transition active:scale-95 disabled:opacity-50"
                >
                  SOLICITAR EXPRESO A DOMICILIO (250 BOB)
                </button>
              </form>
            </div>

            {/* Active Expreso Card */}
            {activeExpreso && (
              <div className="p-4 rounded-3xl bg-surface border-2 border-gold-primary shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-gold-primary uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Expreso Confirmado
                  </span>
                  <span className="text-xs font-bold text-white">250 BOB</span>
                </div>
                <div className="space-y-1 text-xs text-text-secondary">
                  <p>Recojo: <span className="text-white font-semibold">{activeExpreso.pickupAddress}</span></p>
                  <p>Destino: <span className="text-white font-semibold">{activeExpreso.destinationAddress}</span></p>
                  <p>Chofer asignado: <span className="text-gold-light font-bold">{activeExpreso.driverName}</span></p>
                </div>
                <a
                  href={`tel:${activeExpreso.driverPhone}`}
                  className="w-full py-2.5 bg-surface-2 border border-gold-primary/40 text-gold-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Llamar Chofer de Expreso ({activeExpreso.driverPhone})</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* SUB-TAB 3: ENVÍO DE ENCOMIENDAS */}
        {activeSubTab === 'ENCOMIENDAS' && (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-surface border border-gold-primary/40 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Envío de Encomiendas</h3>
                  <p className="text-xs text-text-secondary">Riberalta ➔ Guayaramerín (Entrega directa)</p>
                </div>
              </div>

              <form onSubmit={handleCreateEncomienda} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-text-secondary uppercase text-[10px]">Descripción del Paquete / Contenido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Sobre con documentos / Caja repuestos moto"
                    value={packageDesc}
                    onChange={(e) => setPackageDesc(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-surface-2 border border-border-custom outline-none text-white placeholder-text-secondary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="font-bold text-text-secondary uppercase text-[10px]">Nombre Destinatario</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-surface-2 border border-border-custom outline-none text-white placeholder-text-secondary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-text-secondary uppercase text-[10px]">Teléfono Destinatario</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +591 76812345"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="w-full p-3 rounded-2xl bg-surface-2 border border-border-custom outline-none text-white placeholder-text-secondary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-text-secondary uppercase text-[10px]">Lugar de Entrega en Guayaramerín</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Terminal de Autos Guayaramerín / Domicilio"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-surface-2 border border-border-custom outline-none text-white placeholder-text-secondary"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-2 border border-gold-primary/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-secondary uppercase">Costo Estándar Encomienda</span>
                  <span className="text-lg font-black text-gold-primary">20.00 BOB</span>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-gold-primary hover:bg-gold-light text-background rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-gold-primary/20 transition active:scale-95 disabled:opacity-50"
                >
                  REGISTRAR Y ENVIAR ENCOMIENDA (20 BOB)
                </button>
              </form>
            </div>

            {/* User Encomiendas Tracking List */}
            {userEncomiendas.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                  Mis Encomiendas Registradas
                </h3>

                {userEncomiendas.map((enc) => (
                  <div key={enc.id} className="p-4 rounded-3xl bg-surface border border-border-custom space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-border-custom pb-2">
                      <span className="font-black text-gold-primary uppercase tracking-wider flex items-center gap-1">
                        <Package className="w-4 h-4 text-gold-primary" />
                        {enc.trackingCode}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-gold-primary/20 text-[10px] font-bold text-gold-primary uppercase">
                        {enc.status}
                      </span>
                    </div>

                    <p className="text-white font-bold">{enc.packageDescription}</p>
                    <p className="text-text-secondary">Para: <span className="text-white font-semibold">{enc.recipientName}</span> ({enc.recipientPhone})</p>
                    <p className="text-text-secondary">Entrega: <span className="text-gold-light">{enc.deliveryAddress}</span></p>

                    <div className="pt-2 border-t border-border-custom flex items-center justify-between">
                      <span className="text-text-secondary">Chofer: <span className="text-white font-semibold">{enc.driverName}</span></span>
                      <button
                        onClick={() => setActiveTab('MESSAGES')}
                        className="px-3 py-1.5 rounded-xl bg-surface-2 border border-gold-primary/40 text-gold-primary font-bold text-xs flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat Chofer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SEAT PICKER MODAL */}
      <SeatPickerModal
        isOpen={isSeatModalOpen}
        onClose={() => setIsSeatModalOpen(false)}
        departure={selectedDeparture}
        onConfirmBooking={handleConfirmSeatBooking}
        isProcessing={isProcessing}
      />
    </div>
  );
};
