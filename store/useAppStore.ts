import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DriverData, ChatMessage, TripHistoryItem, INITIAL_TRIPS, MOCK_DRIVERS, RIBERALTA_CENTER } from '@/services/mockData';

export type UserRole = 'PASSENGER' | 'DRIVER';
export type AppView = 'SPLASH' | 'LOGIN' | 'REGISTER' | 'ROLE_SELECTION' | 'MAIN_APP';
export type PassengerRideState = 
  | 'IDLE' 
  | 'LOCATION_LOADING' 
  | 'LOCATION_READY' 
  | 'SELECTING_DESTINATION' 
  | 'CONFIRMING'
  | 'SEARCHING_DRIVER' 
  | 'NEGOTIATING'
  | 'DRIVER_FOUND' 
  | 'TRIP_STARTED' 
  | 'TRIP_COMPLETED';

export type DriverRideState = 
  | 'OFFLINE' 
  | 'ONLINE' 
  | 'RIDE_REQUEST' 
  | 'NEGOTIATING'
  | 'GOING_TO_PASSENGER' 
  | 'TRIP_STARTED' 
  | 'TRIP_COMPLETED';

export type LocationPoint = {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
};

export type UserProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  rating: number;
  trips: number;
  role: UserRole;
  // Driver specific
  motorcycle?: string;
  plate?: string;
  verified?: boolean;
  walletBalance?: number; // Balance in BOB (e.g. 10.00, 20.00, 50.00 BOB)
  accountNumber?: string; // Digital Card Account No (e.g. RBT-4820-9182)
  hasCompletedDriverTutorial?: boolean;
  freeTripsRemaining?: number; // 5 viajes de regalo sin comisión en su primera bienvenida
};

export type ServiceType = 'MOTOTAXI' | 'REMOLCADA';
export type PaymentMethodType = 'CASH' | 'QR';
export type PaymentStatusType = 'PENDING' | 'WAITING_DRIVER_CONFIRM' | 'CONFIRMED';

export interface ActiveTripInfo {
  id: string;
  pickup: LocationPoint;
  destination: LocationPoint;
  price: number;
  proposedPrice?: number;
  priceOfferedBy?: 'PASSENGER' | 'DRIVER';
  fareAgreed?: boolean;
  distanceKm: number;
  durationMin: number;
  driver?: DriverData;
  passengerId?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerRating?: number;
  serviceType?: ServiceType;
  paymentMethod?: PaymentMethodType;
  paymentStatus?: PaymentStatusType;
  status?: string;
}

export interface TerminalDeparture {
  id: string;
  route: string;
  time: string;
  date: string;
  vehicleType: 'TOYOTA_NOAH' | 'TOYOTA_IPSUM';
  vehicleModel: string;
  plate: string;
  driverName: string;
  driverPhone: string;
  driverRating: number;
  pricePerSeat: number;
  totalSeats: number;
  occupiedSeats: number[];
}

export interface TerminalBooking {
  id: string;
  departureId: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: number;
  route: string;
  time: string;
  date: string;
  vehicleModel: string;
  plate: string;
  driverName: string;
  driverPhone: string;
  price: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface TerminalExpreso {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  departureDate: string;
  departureTime: string;
  vehicleType: 'TOYOTA_NOAH' | 'TOYOTA_IPSUM';
  price: number;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED';
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
}

export interface TerminalEncomienda {
  id: string;
  trackingCode: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  packageDescription: string;
  origin: string;
  destination: string;
  deliveryAddress: string;
  price: number;
  status: 'EN_TERMINAL' | 'EN_TRANSITO' | 'ENTREGADO';
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
}

export interface UserPreferences {
  paymentMethod: 'CASH' | 'QR' | 'CARD';
  notifications: {
    rideUpdates: boolean;
    promotions: boolean;
    securityAlerts: boolean;
    sounds: boolean;
  };
  settings: {
    units: 'km' | 'mi';
    hapticFeedback: boolean;
    darkMode: boolean;
  };
}

interface AppState {
  // Navigation & View
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  activeTab: 'HOME' | 'TRIPS' | 'MESSAGES' | 'PROFILE' | 'INCOME';
  setActiveTab: (tab: 'HOME' | 'TRIPS' | 'MESSAGES' | 'PROFILE' | 'INCOME') => void;

  // Auth & Role
  user: UserProfile | null;
  role: UserRole | null;
  pendingRegisterPhone: string;
  setPendingRegisterPhone: (phone: string) => void;
  loginUser: (user: UserProfile, targetView?: AppView) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;

  // User Preferences & Functional Settings
  preferences: UserPreferences;
  setPaymentMethod: (method: 'CASH' | 'QR' | 'CARD') => void;
  toggleNotification: (key: keyof UserPreferences['notifications']) => void;
  toggleSetting: (key: keyof UserPreferences['settings']) => void;

  // Location
  currentLocation: LocationPoint | null;
  setCurrentLocation: (loc: LocationPoint | null) => void;
  destination: LocationPoint | null;
  setDestination: (loc: LocationPoint | null) => void;
  gpsPermission: 'prompt' | 'granted' | 'denied';
  setGpsPermission: (status: 'prompt' | 'granted' | 'denied') => void;

  // Passenger Ride Flow
  passengerState: PassengerRideState;
  setPassengerState: (state: PassengerRideState) => void;
  assignedDriver: DriverData | null;
  setAssignedDriver: (driver: DriverData | null) => void;

  // Driver Ride Flow
  driverState: DriverRideState;
  setDriverState: (state: DriverRideState) => void;
  pendingRequest: ActiveTripInfo | null;
  setPendingRequest: (req: ActiveTripInfo | null) => void;

  // Shared Active Trip Details
  activeTrip: ActiveTripInfo | null;
  setActiveTrip: (trip: ActiveTripInfo | null) => void;

  // Real-time Online Drivers on Map
  onlineDrivers: DriverData[];
  setOnlineDrivers: (drivers: DriverData[]) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
  clearChat: () => void;

  // Trips History
  tripsHistory: TripHistoryItem[];
  addTripToHistory: (trip: TripHistoryItem) => void;

  // PWA Prompt
  showPwaModal: boolean;
  setShowPwaModal: (show: boolean) => void;
  deferredPwaPrompt: any;
  setDeferredPwaPrompt: (prompt: any) => void;

  // Active Transport Mode & Service Selection
  activeTransportMode: 'URBAN_MOTOTAXI' | 'TERMINAL_INTERPROVINCIAL';
  setActiveTransportMode: (mode: 'URBAN_MOTOTAXI' | 'TERMINAL_INTERPROVINCIAL') => void;
  urbanServiceType: ServiceType;
  setUrbanServiceType: (type: ServiceType) => void;

  // Wallet Management
  topUpWallet: (amount: number) => void;
  setHasCompletedDriverTutorial: (completed: boolean) => void;
  deductWalletCommission: (amount: number) => void;
  decrementFreeTrips: () => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;

  // Reset current ride
  resetRide: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentView: 'SPLASH',
      setCurrentView: (view) => set({ currentView: view }),
      activeTab: 'HOME',
      setActiveTab: (tab) => set({ activeTab: tab }),

      user: null,
      role: 'PASSENGER',
      pendingRegisterPhone: '',
      setPendingRegisterPhone: (phone) => set({ pendingRegisterPhone: phone }),
      loginUser: (user, targetView = 'MAIN_APP') => {
        // Driver wallet starts strictly with real balance (0 BOB if new). 5 free gift rides only if new driver.
        const updatedUser: UserProfile = {
          ...user,
          walletBalance: typeof user.walletBalance === 'number' ? user.walletBalance : 0.00,
          accountNumber: user.accountNumber || `RBT-4820-${Math.floor(1000 + Math.random() * 9000)}`,
          freeTripsRemaining: typeof user.freeTripsRemaining === 'number' ? user.freeTripsRemaining : (user.role === 'DRIVER' ? 5 : 0),
        };
        set({ user: updatedUser, role: updatedUser.role || 'PASSENGER', currentView: targetView, activeTab: 'HOME' });
      },
      updateUserProfile: (data) => set((state) => ({
        user: state.user ? { ...state.user, ...data } : null,
      })),
      setRole: (role) => set({ role, activeTab: 'HOME' }),
      logout: () => set({ 
        user: null, 
        role: null, 
        currentView: 'LOGIN', 
        passengerState: 'IDLE', 
        driverState: 'OFFLINE',
        activeTrip: null,
        assignedDriver: null,
      }),

      preferences: {
        paymentMethod: 'CASH',
        notifications: {
          rideUpdates: true,
          promotions: true,
          securityAlerts: true,
          sounds: true,
        },
        settings: {
          units: 'km',
          hapticFeedback: true,
          darkMode: true,
        },
      },

      setPaymentMethod: (method) => set((state) => ({
        preferences: { ...state.preferences, paymentMethod: method }
      })),

      toggleNotification: (key) => set((state) => ({
        preferences: {
          ...state.preferences,
          notifications: {
            ...state.preferences.notifications,
            [key]: !state.preferences.notifications[key]
          }
        }
      })),

      toggleSetting: (key) => set((state) => ({
        preferences: {
          ...state.preferences,
          settings: {
            ...state.preferences.settings,
            [key]: !state.preferences.settings[key]
          }
        }
      })),

      currentLocation: {
        lat: RIBERALTA_CENTER.lat,
        lng: RIBERALTA_CENTER.lng,
        name: 'Plaza Principal (Riberalta)',
        address: 'Centro, Riberalta, Bolivia',
      },
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      destination: null,
      setDestination: (loc) => set({ destination: loc }),
      gpsPermission: 'prompt',
      setGpsPermission: (status) => set({ gpsPermission: status }),

      passengerState: 'IDLE',
      setPassengerState: (pState) => set({ passengerState: pState }),
      assignedDriver: null,
      setAssignedDriver: (driver) => set({ assignedDriver: driver }),

      driverState: 'OFFLINE',
      setDriverState: (dState) => set({ driverState: dState }),
      pendingRequest: null,
      setPendingRequest: (req) => set({ pendingRequest: req }),

      activeTrip: null,
      setActiveTrip: (trip) => set({ activeTrip: trip }),

      onlineDrivers: [],
      setOnlineDrivers: (drivers) => set({ onlineDrivers: drivers }),

      chatMessages: [],
      addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      setChatMessages: (msgs) => set({ chatMessages: msgs }),
      clearChat: () => set({ chatMessages: [] }),

      tripsHistory: [],
      addTripToHistory: (trip) => set((state) => ({
        tripsHistory: [trip, ...state.tripsHistory.filter((t) => t.id !== trip.id)]
      })),

      showPwaModal: false,
      setShowPwaModal: (show) => set({ showPwaModal: show }),

      deferredPwaPrompt: null,
      setDeferredPwaPrompt: (prompt) => set({ deferredPwaPrompt: prompt }),

      activeTransportMode: 'URBAN_MOTOTAXI',
      setActiveTransportMode: (mode) => set({ activeTransportMode: mode }),
      urbanServiceType: 'MOTOTAXI',
      setUrbanServiceType: (type) => set({ urbanServiceType: type }),

      topUpWallet: (amount) => set((state) => {
        if (!state.user) return {};
        const newBal = (state.user.walletBalance || 0) + amount;
        return { user: { ...state.user, walletBalance: newBal } };
      }),
      setHasCompletedDriverTutorial: (completed) => set((state) => {
        if (!state.user) return {};
        return { user: { ...state.user, hasCompletedDriverTutorial: completed } };
      }),
      deductWalletCommission: (amount) => set((state) => {
        if (!state.user) return {};
        const newBal = Math.max(0, (state.user.walletBalance || 0) - amount);
        return { user: { ...state.user, walletBalance: newBal } };
      }),
      decrementFreeTrips: () => set((state) => {
        if (!state.user) return {};
        const remaining = Math.max(0, (state.user.freeTripsRemaining || 0) - 1);
        return { user: { ...state.user, freeTripsRemaining: remaining } };
      }),

      resetRide: () => set({
        passengerState: 'IDLE',
        driverState: get().driverState === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
        destination: null,
        assignedDriver: null,
        activeTrip: null,
        pendingRequest: null,
        chatMessages: [],
      }),
    }),
    {
      name: 'ribergo-session-v1',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : ({} as any))),
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        currentView: state.user ? (state.currentView === 'SPLASH' ? 'MAIN_APP' : state.currentView) : state.currentView,
        preferences: state.preferences,
      }),
    }
  )
);
