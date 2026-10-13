import { 
  ActiveTripInfo, LocationPoint, UserProfile, UserRole, 
  TerminalDeparture, TerminalBooking, TerminalExpreso, TerminalEncomienda 
} from '@/store/useAppStore';
import { MOCK_DRIVERS, DriverData } from './mockData';
import { db, auth, isFirebaseConfigured } from '@/lib/firebase';
import { 
  collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, UserCredential,
  RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult
} from 'firebase/auth';

/**
 * RIBERGO REAL FIREBASE & LOCAL DATA SERVICE LAYER
 * Supports Phone SMS Auth (RecaptchaVerifier + signInWithPhoneNumber), Google Sign-In, and Cloud Firestore.
 */

// Helper to format phone number to E.164 (+591XXXXXXXX for Bolivia if no country code provided)
export const formatPhoneNumber = (phone: string): string => {
  let clean = phone.trim();
  if (clean.startsWith('+')) return clean;
  const digits = clean.replace(/[^0-9]/g, '');
  return `+591${digits}`;
};

// Helper to convert phone numbers to valid Firebase Auth identifier for legacy email/pass
const formatAuthIdentifier = (identifier: string): string => {
  const clean = identifier.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  const numericPhone = clean.replace(/[^0-9]/g, '');
  return `${numericPhone}@ribergo.bo`;
};

// ============================================================================
// REALTIME MULTI-TAB & FIRESTORE HYBRID SYNC BUS
// Garantiza 0ms de latencia en pruebas locales entre pestañas (BroadcastChannel + LocalStorage Event)
// y sincronización simultánea con Cloud Firestore.
// ============================================================================

interface SyncEvent {
  type: 'RIDE_REQUESTED' | 'RIDE_UPDATED' | 'RIDE_CANCELLED' | 'CHAT_MESSAGE';
  payload: any;
  timestamp: number;
}

const RIDES_STORAGE_KEY = 'ribergo_active_rides_cache_v3';
const CHAT_STORAGE_KEY_PREFIX = 'ribergo_chat_cache_v3_';
const CHANNEL_NAME = 'ribergo_realtime_sync_channel';

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private pendingRidesListeners: Set<(rides: any[]) => void> = new Set();
  private rideListeners: Map<string, Set<(ride: any) => void>> = new Map();
  private messageListeners: Map<string, Set<(messages: any[]) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            this.handleIncomingEvent(event.data);
          };
        }
      } catch (e) {
        console.warn('BroadcastChannel not initialized:', e);
      }

      // Storage event listener fallback (multi-tab / multi-window)
      window.addEventListener('storage', (e) => {
        if (e.key === RIDES_STORAGE_KEY && e.newValue) {
          try {
            this.notifyPendingRides();
            const rides = JSON.parse(e.newValue);
            for (const r of rides) {
              this.notifyRide(r.id, r);
            }
          } catch (err) {}
        }
        if (e.key && e.key.startsWith(CHAT_STORAGE_KEY_PREFIX)) {
          const rId = e.key.replace(CHAT_STORAGE_KEY_PREFIX, '');
          this.notifyMessages(rId);
        }
      });
    }
  }

  private handleIncomingEvent(event: SyncEvent) {
    if (!event || !event.type) return;

    if (event.type === 'RIDE_REQUESTED' || event.type === 'RIDE_UPDATED' || event.type === 'RIDE_CANCELLED') {
      this.notifyPendingRides();
      if (event.payload?.id) {
        this.notifyRide(event.payload.id, event.payload);
      }
    } else if (event.type === 'CHAT_MESSAGE') {
      if (event.payload?.rideId) {
        this.notifyMessages(event.payload.rideId);
      }
    }
  }

  private broadcast(event: SyncEvent) {
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (e) {}
    }
  }

  public getActiveRides(): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(RIDES_STORAGE_KEY);
      if (!raw) return [];
      const rides = JSON.parse(raw) as any[];
      const now = Date.now();
      // Filtrar viajes menores a 5 minutos y no completados/cancelados
      const valid = rides.filter(r => {
        const age = now - (r.createdAtMs || 0);
        return age < 5 * 60 * 1000 && r.status !== 'COMPLETED' && r.status !== 'CANCELLED';
      });
      if (valid.length !== rides.length) {
        localStorage.setItem(RIDES_STORAGE_KEY, JSON.stringify(valid));
      }
      return valid;
    } catch (e) {
      return [];
    }
  }

  public saveRide(ride: any) {
    if (typeof window === 'undefined') return;
    try {
      const rides = this.getActiveRides();
      const idx = rides.findIndex(r => r.id === ride.id);
      const updatedItem = {
        ...(idx >= 0 ? rides[idx] : {}),
        ...ride,
        updatedAtMs: Date.now()
      };
      if (idx >= 0) {
        rides[idx] = updatedItem;
      } else {
        rides.unshift(updatedItem);
      }
      localStorage.setItem(RIDES_STORAGE_KEY, JSON.stringify(rides));
      this.broadcast({ type: 'RIDE_UPDATED', payload: updatedItem, timestamp: Date.now() });
      this.notifyPendingRides();
      this.notifyRide(updatedItem.id, updatedItem);
    } catch (e) {
      console.warn('Error saving ride to sync bus:', e);
    }
  }

  public getRide(rideId: string): any | null {
    const rides = this.getActiveRides();
    return rides.find(r => r.id === rideId) || null;
  }

  public removeRide(rideId: string) {
    if (typeof window === 'undefined') return;
    try {
      const rides = this.getActiveRides().filter(r => r.id !== rideId);
      localStorage.setItem(RIDES_STORAGE_KEY, JSON.stringify(rides));
      this.broadcast({ type: 'RIDE_CANCELLED', payload: { id: rideId, status: 'CANCELLED' }, timestamp: Date.now() });
      this.notifyPendingRides();
      this.notifyRide(rideId, { id: rideId, status: 'CANCELLED' });
    } catch (e) {}
  }

  public getPendingRides(): any[] {
    const rides = this.getActiveRides();
    return rides.filter(r => r.status === 'SEARCHING_DRIVER' && !r.driverId);
  }

  public subscribePendingRides(callback: (rides: any[]) => void): () => void {
    this.pendingRidesListeners.add(callback);
    callback(this.getPendingRides());

    return () => {
      this.pendingRidesListeners.delete(callback);
    };
  }

  public notifyPendingRides() {
    const pending = this.getPendingRides();
    this.pendingRidesListeners.forEach(cb => {
      try { cb(pending); } catch (e) {}
    });
  }

  public subscribeRide(rideId: string, callback: (ride: any) => void): () => void {
    if (!this.rideListeners.has(rideId)) {
      this.rideListeners.set(rideId, new Set());
    }
    this.rideListeners.get(rideId)!.add(callback);

    const existing = this.getRide(rideId);
    if (existing) {
      callback(existing);
    }

    return () => {
      this.rideListeners.get(rideId)?.delete(callback);
    };
  }

  public notifyRide(rideId: string, rideData: any) {
    const listeners = this.rideListeners.get(rideId);
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(rideData); } catch (e) {}
      });
    }
  }

  public getMessages(rideId: string): any[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY_PREFIX + rideId);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  public saveMessage(rideId: string, message: any) {
    if (typeof window === 'undefined') return;
    try {
      const msgs = this.getMessages(rideId);
      msgs.push(message);
      localStorage.setItem(CHAT_STORAGE_KEY_PREFIX + rideId, JSON.stringify(msgs));
      this.broadcast({ type: 'CHAT_MESSAGE', payload: { rideId, message }, timestamp: Date.now() });
      this.notifyMessages(rideId);
    } catch (e) {}
  }

  public subscribeMessages(rideId: string, callback: (messages: any[]) => void): () => void {
    if (!this.messageListeners.has(rideId)) {
      this.messageListeners.set(rideId, new Set());
    }
    this.messageListeners.get(rideId)!.add(callback);
    callback(this.getMessages(rideId));

    return () => {
      this.messageListeners.get(rideId)?.delete(callback);
    };
  }

  public notifyMessages(rideId: string) {
    const msgs = this.getMessages(rideId);
    const listeners = this.messageListeners.get(rideId);
    if (listeners) {
      listeners.forEach(cb => {
        try { cb(msgs); } catch (e) {}
      });
    }
  }
}

export const realtimeSyncBus = new RealtimeSyncBus();

export const apiService = {
  /**
   * Check if a user with given phone exists in Cloud Firestore 'users'
   */
  async checkUserExistsByPhone(phone: string): Promise<{ exists: boolean; profile?: UserProfile }> {
    const formattedPhone = formatPhoneNumber(phone);
    const cleanDigits = phone.replace(/[^0-9]/g, '');

    if (isFirebaseConfigured()) {
      try {
        const usersRef = collection(db, 'users');
        // Search by formatted phone (e.g. +59176868110)
        let q = query(usersRef, where('phone', '==', formattedPhone));
        let querySnap = await getDocs(q);

        if (querySnap.empty && cleanDigits.length >= 7) {
          // Try searching by digits if stored differently
          q = query(usersRef, where('phone', '==', cleanDigits));
          querySnap = await getDocs(q);
        }

        if (!querySnap.empty) {
          const docData = querySnap.docs[0].data() as UserProfile;
          return { exists: true, profile: docData };
        }
        return { exists: false };
      } catch (err: any) {
        console.warn('Notice: Firestore user check fallback:', err?.message || err);
        // Fallback: Assume user exists so SMS verification proceeds smoothly
        return { exists: true };
      }
    }

    // Local demo check
    return { exists: true };
  },

  /**
   * Initialize invisible reCAPTCHA verifier for Phone Auth
   */
  setupRecaptcha(containerId: string = 'recaptcha-container'): RecaptchaVerifier | null {
    if (typeof window === 'undefined' || !isFirebaseConfigured()) return null;
    try {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA verificado exitosamente');
        },
        'expired-callback': () => {
          console.warn('reCAPTCHA ha expirado');
        }
      });
      (window as any).recaptchaVerifier = recaptchaVerifier;
      return recaptchaVerifier;
    } catch (err) {
      console.error('Error inicializando RecaptchaVerifier:', err);
      return null;
    }
  },

  /**
   * Send SMS Verification Code to user's phone via Firebase Phone Auth
   */
  async sendSmsVerification(phoneNumber: string, appVerifier: any): Promise<ConfirmationResult | null> {
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (isFirebaseConfigured()) {
      try {
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        return confirmationResult;
      } catch (err: any) {
        console.error('Error enviando SMS con Firebase:', err);
        throw err;
      }
    }

    // Local / Demo Fallback ConfirmationResult mock
    return {
      confirm: async (code: string) => {
        return {
          user: {
            uid: 'usr-sms-demo-' + Date.now(),
            phoneNumber: formattedPhone,
          }
        } as any;
      }
    } as ConfirmationResult;
  },

  /**
   * Confirm SMS verification code & log in or create user profile in Firestore
   */
  async confirmSmsCode(
    confirmationResult: ConfirmationResult, 
    code: string, 
    userMetadata?: { name?: string; role?: UserRole }
  ): Promise<UserProfile> {
    if (isFirebaseConfigured()) {
      try {
        const userCred = await confirmationResult.confirm(code);
        const user = userCred.user;
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          return userDoc.data() as UserProfile;
        }

        // New profile creation on first login with SMS
        const newProfile: UserProfile = {
          id: user.uid,
          name: userMetadata?.name || 'Usuario ' + (user.phoneNumber || ''),
          phone: user.phoneNumber || '',
          email: `${user.phoneNumber?.replace(/[^0-9]/g, '') || 'user'}@ribergo.bo`,
          rating: 5.0,
          trips: 0,
          role: userMetadata?.role || 'PASSENGER',
        };

        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
        });

        return newProfile;
      } catch (err: any) {
        console.error('Error al verificar código SMS:', err);
        throw err;
      }
    }

    // Demo fallback
    return {
      id: 'usr-sms-' + Date.now(),
      name: userMetadata?.name || 'Usuario RiberGO SMS',
      phone: '+591 71234567',
      email: 'demo@ribergo.bo',
      rating: 5.0,
      trips: 0,
      role: userMetadata?.role || 'PASSENGER',
    };
  },

  /**
   * Register user with Phone/Email + Password in Firebase Auth & Cloud Firestore
   */
  async registerUser(name: string, phone: string, emailOrPhone: string, pass: string, role: UserRole): Promise<UserProfile> {
    const authIdentifier = formatAuthIdentifier(emailOrPhone || phone);

    if (isFirebaseConfigured()) {
      try {
        const userCred: UserCredential = await createUserWithEmailAndPassword(auth, authIdentifier, pass);
        const uid = userCred.user.uid;

        const profileData: UserProfile = {
          id: uid,
          name: name || 'Usuario RiberGO',
          phone: phone || '+591 70000000',
          email: authIdentifier,
          rating: 5.0,
          trips: 0,
          role: role,
          motorcycle: role === 'DRIVER' ? 'Honda Wave 110' : undefined,
          plate: role === 'DRIVER' ? 'RBT-' + Math.floor(100 + Math.random() * 900) : undefined,
          verified: role === 'DRIVER' ? true : undefined,
        };

        // Save User Profile to Cloud Firestore collection 'users'
        await setDoc(doc(db, 'users', uid), {
          ...profileData,
          createdAt: serverTimestamp(),
        });

        return profileData;
      } catch (err: any) {
        console.error('Firebase Auth Register Error:', err);
        throw err;
      }
    }

    // Local Fallback
    return {
      id: 'usr-' + Date.now(),
      name,
      phone: phone || '+591 70000000',
      email: authIdentifier,
      rating: 5.0,
      trips: 0,
      role,
      motorcycle: role === 'DRIVER' ? 'Honda Wave 110' : undefined,
      plate: role === 'DRIVER' ? 'RBT-482' : undefined,
      verified: true,
    };
  },

  /**
   * Login user with Phone/Email + Password
   */
  async loginUser(emailOrPhone: string, pass: string): Promise<UserProfile> {
    const authIdentifier = formatAuthIdentifier(emailOrPhone);

    if (isFirebaseConfigured()) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, authIdentifier, pass);
        const uid = userCred.user.uid;

        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          return userDoc.data() as UserProfile;
        }
      } catch (err: any) {
        console.error('Firebase Auth Login Error:', err);
        throw err;
      }
    }

    // Local Fallback
    return {
      id: 'usr-demo',
      name: emailOrPhone.split('@')[0] || 'Fernando',
      email: authIdentifier,
      phone: '+591 76543210',
      rating: 4.9,
      trips: 24,
      role: 'PASSENGER',
    };
  },

  /**
   * Google Sign-In (Fastest 1-Tap Login)
   */
  async loginWithGoogle(): Promise<UserProfile> {
    if (isFirebaseConfigured()) {
      try {
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        const user = userCred.user;

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          return userDoc.data() as UserProfile;
        }

        const newProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Usuario Google',
          email: user.email || '',
          phone: user.phoneNumber || '+591 70000000',
          avatar: user.photoURL || undefined,
          rating: 5.0,
          trips: 0,
          role: 'PASSENGER',
        };

        await setDoc(userDocRef, {
          ...newProfile,
          createdAt: serverTimestamp(),
        });

        return newProfile;
      } catch (err: any) {
        console.error('Google Sign-In Error:', err);
        throw err;
      }
    }

    // Demo Fallback
    return {
      id: 'usr-google-demo',
      name: 'Usuario Google RiberGO',
      email: 'usuario@gmail.com',
      phone: '+591 71234567',
      rating: 5.0,
      trips: 0,
      role: 'PASSENGER',
    };
  },

  /**
   * Set driver online / offline status in Cloud Firestore 'online_drivers' collection
   */
  async setDriverOnlineStatus(
    driverId: string, 
    driverName: string, 
    phone: string, 
    motorcycle: string, 
    plate: string, 
    rating: number, 
    location: LocationPoint, 
    isOnline: boolean
  ) {
    if (isFirebaseConfigured()) {
      try {
        const driverDocRef = doc(db, 'online_drivers', driverId);
        if (isOnline) {
          await setDoc(driverDocRef, {
            id: driverId,
            name: driverName,
            phone,
            motorcycle: motorcycle || 'Honda Wave 110',
            plate: plate || 'RBT-100',
            rating: rating || 5.0,
            currentLocation: location,
            lastActive: serverTimestamp(),
          });
        } else {
          const { deleteDoc } = await import('firebase/firestore');
          await deleteDoc(driverDocRef);
        }
      } catch (err) {
        console.error('Firestore Driver Online Status Error:', err);
      }
    }
  },

  /**
   * Listen to real-time online drivers on the Riberalta map
   */
  subscribeToOnlineDrivers(callback: (drivers: DriverData[]) => void) {
    if (isFirebaseConfigured()) {
      return onSnapshot(
        collection(db, 'online_drivers'),
        (snapshot) => {
          const drivers = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name || 'Mototaxi Riberalta',
              phone: data.phone || '+591 70000000',
              rating: data.rating || 5.0,
              trips: data.trips || 12,
              avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
              motorcycle: data.motorcycle || 'Honda Wave 110',
              plate: data.plate || 'RBT-100',
              currentLocation: data.currentLocation || { lat: -11.0061, lng: -66.0747 },
            } as DriverData;
          });
          callback(drivers);
        },
        (err) => {
          console.warn('Firestore online_drivers listener permission error:', err?.message || err);
          callback([]);
        }
      );
    }
    callback([]);
    return () => {};
  },



  /**
   * Create a new mototaxi ride request in Cloud Firestore & RealtimeSyncBus
   */
  async requestRide(
    pickup: LocationPoint, 
    destination: LocationPoint, 
    price: number, 
    passengerId: string, 
    passengerName: string,
    paymentMethod: 'CASH' | 'QR' = 'CASH'
  ): Promise<ActiveTripInfo> {
    const rideId = 'ride-' + Date.now();
    const nowMs = Date.now();

    const tripData: ActiveTripInfo = {
      id: rideId,
      pickup,
      destination,
      price,
      distanceKm: 2.4,
      durationMin: 6,
      passengerId,
      passengerName,
      paymentMethod,
      paymentStatus: 'PENDING',
    };

    // 1. Guardar y emitir inmediatamente en RealtimeSyncBus (0ms de latencia)
    realtimeSyncBus.saveRide({
      ...tripData,
      status: 'SEARCHING_DRIVER',
      createdAtMs: nowMs,
    });

    // 2. Persistir en Firestore de fondo si está configurado
    if (isFirebaseConfigured()) {
      try {
        setDoc(doc(db, 'rides', rideId), {
          ...tripData,
          status: 'SEARCHING_DRIVER',
          createdAtMs: nowMs,
          createdAt: serverTimestamp(),
        }).catch((err) => {
          console.warn('Firestore setDoc background error:', err?.message || err);
        });
      } catch (err) {
        console.warn('Firestore Request Ride Error:', err);
      }
    }

    return tripData;
  },

  /**
   * Listen to real-time updates for a specific ride (híbrido RealtimeSyncBus + Firestore)
   */
  subscribeToRide(rideId: string, callback: (ride: any) => void) {
    // 1. Suscribirse inmediatamente a RealtimeSyncBus
    const unsubBus = realtimeSyncBus.subscribeRide(rideId, callback);

    // 2. Suscribirse a Firestore si está disponible
    let unsubFirestore = () => {};
    if (isFirebaseConfigured()) {
      try {
        unsubFirestore = onSnapshot(
          doc(db, 'rides', rideId),
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              realtimeSyncBus.saveRide(data);
              callback(data);
            }
          },
          (err) => {
            console.warn('Firestore ride listener permission error:', err?.message || err);
          }
        );
      } catch (e) {
        console.warn('Firestore subscribeToRide error:', e);
      }
    }

    return () => {
      unsubBus();
      unsubFirestore();
    };
  },

  /**
   * Listen to pending ride requests for online drivers (en tiempo real)
   */
  subscribeToPendingRides(callback: (rides: any[]) => void) {
    // 1. Suscribirse inmediatamente a RealtimeSyncBus (0ms)
    const unsubBus = realtimeSyncBus.subscribePendingRides((busPending) => {
      callback(busPending);
    });

    // 2. Suscribirse también a Firestore si está disponible
    let unsubFirestore = () => {};
    if (isFirebaseConfigured()) {
      try {
        const q = query(
          collection(db, 'rides'), 
          where('status', '==', 'SEARCHING_DRIVER')
        );
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const freshPendingRides = snapshot.docs
              .map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
              } as any))
              .filter(r => {
                if (r.status !== 'SEARCHING_DRIVER') return false;
                if (r.driverId) return false;
                // Filtrar solo viajes recientes (menos de 5 minutos)
                const age = Date.now() - (r.createdAtMs || 0);
                if (r.createdAtMs && age > 5 * 60 * 1000) return false;
                return true;
              })
              .sort((a, b) => {
                const timeA = a.createdAtMs || (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
                const timeB = b.createdAtMs || (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
                return timeB - timeA;
              });

            // Sincronizar hacia RealtimeSyncBus
            freshPendingRides.forEach(r => realtimeSyncBus.saveRide(r));
            callback(realtimeSyncBus.getPendingRides());
          },
          (err) => {
            console.warn('Firestore pending rides listener permission error (usando bus local):', err?.message || err);
            // El bus local ya proveyó los datos
          }
        );
      } catch (e) {
        console.warn('Firestore query error:', e);
      }
    }

    return () => {
      unsubBus();
      unsubFirestore();
    };
  },

  /**
   * Driver accepts ride in Cloud Firestore and enters NEGOTIATING phase
   */
  async acceptRide(rideId: string, driver: DriverData) {
    const updatePayload = {
      id: rideId,
      status: 'NEGOTIATING',
      driverId: driver.id,
      driverName: driver.name,
      driverPhone: driver.phone,
      driverRating: driver.rating,
      motorcycle: driver.motorcycle,
      plate: driver.plate,
      acceptedAtMs: Date.now(),
    };

    // 1. Notificar inmediatamente al bus (0ms)
    realtimeSyncBus.saveRide(updatePayload);

    // 2. Persistir en Firestore de fondo
    if (isFirebaseConfigured()) {
      try {
        await updateDoc(doc(db, 'rides', rideId), {
          status: 'NEGOTIATING',
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone,
          driverRating: driver.rating,
          motorcycle: driver.motorcycle,
          plate: driver.plate,
          acceptedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore Accept Ride Error:', err);
      }
    }
  },

  /**
   * Propose a new fare or destination during negotiation
   */
  async proposeRideFare(rideId: string, proposedPrice: number, offeredBy: 'PASSENGER' | 'DRIVER', destinationName?: string) {
    const current = realtimeSyncBus.getRide(rideId) || {};
    const updatePayload: any = {
      ...current,
      id: rideId,
      proposedPrice,
      priceOfferedBy: offeredBy,
      updatedAtMs: Date.now(),
    };
    if (destinationName) {
      updatePayload.destination = {
        ...(current.destination || { lat: -11.0061, lng: -66.0747 }),
        name: destinationName,
      };
    }

    realtimeSyncBus.saveRide(updatePayload);

    if (isFirebaseConfigured()) {
      try {
        const updateData: any = {
          proposedPrice,
          priceOfferedBy: offeredBy,
          updatedAt: serverTimestamp(),
        };
        if (destinationName) {
          updateData['destination.name'] = destinationName;
        }
        await updateDoc(doc(db, 'rides', rideId), updateData);
      } catch (err) {
        console.warn('Firestore Propose Fare Error:', err);
      }
    }
  },

  /**
   * Confirm the negotiated fare and start going to passenger
   */
  async confirmRideFare(rideId: string, finalPrice: number, finalDestination?: string) {
    const current = realtimeSyncBus.getRide(rideId) || {};
    const updatePayload: any = {
      ...current,
      id: rideId,
      price: finalPrice,
      proposedPrice: finalPrice,
      fareAgreed: true,
      status: 'GOING_TO_PASSENGER',
      updatedAtMs: Date.now(),
    };
    if (finalDestination) {
      updatePayload.destination = {
        ...(current.destination || { lat: -11.0061, lng: -66.0747 }),
        name: finalDestination,
      };
    }

    realtimeSyncBus.saveRide(updatePayload);

    if (isFirebaseConfigured()) {
      try {
        const updateData: any = {
          price: finalPrice,
          proposedPrice: finalPrice,
          fareAgreed: true,
          status: 'GOING_TO_PASSENGER',
          updatedAt: serverTimestamp(),
        };
        if (finalDestination) {
          updateData['destination.name'] = finalDestination;
        }
        await updateDoc(doc(db, 'rides', rideId), updateData);
      } catch (err) {
        console.warn('Firestore Confirm Fare Error:', err);
      }
    }
  },

  /**
   * Cancel negotiation and release ride back to searching
   */
  async cancelRideNegotiation(rideId: string) {
    const current = realtimeSyncBus.getRide(rideId) || {};
    const updated: any = {
      ...current,
      id: rideId,
      status: 'SEARCHING_DRIVER',
    };
    delete updated.driverId;
    delete updated.driverName;
    delete updated.driverPhone;
    delete updated.proposedPrice;
    delete updated.priceOfferedBy;

    realtimeSyncBus.saveRide(updated);

    if (isFirebaseConfigured()) {
      try {
        const { deleteField } = await import('firebase/firestore');
        await updateDoc(doc(db, 'rides', rideId), {
          status: 'SEARCHING_DRIVER',
          driverId: deleteField(),
          driverName: deleteField(),
          driverPhone: deleteField(),
          proposedPrice: deleteField(),
          priceOfferedBy: deleteField(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore Cancel Negotiation Error:', err);
      }
    }
  },

  /**
   * Update ride status (GOING_TO_PASSENGER -> TRIP_STARTED -> COMPLETED)
   */
  async updateRideStatus(rideId: string, status: string) {
    const current = realtimeSyncBus.getRide(rideId) || {};
    const updated = {
      ...current,
      id: rideId,
      status,
      updatedAtMs: Date.now(),
    };
    realtimeSyncBus.saveRide(updated);

    if (isFirebaseConfigured()) {
      try {
        await updateDoc(doc(db, 'rides', rideId), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore Update Ride Status Error:', err);
      }
    }
  },

  /**
   * Send real-time chat message inside ride
   */
  async sendMessage(rideId: string, senderRole: 'PASSENGER' | 'DRIVER', text: string) {
    const msg = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      sender: senderRole,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
    };

    // Guardar y emitir inmediatamente por el bus local
    realtimeSyncBus.saveMessage(rideId, msg);

    if (isFirebaseConfigured()) {
      try {
        addDoc(collection(db, 'rides', rideId, 'messages'), {
          sender: senderRole,
          text,
          createdAt: serverTimestamp(),
        }).catch((err) => {
          console.warn('Firestore addDoc chat error:', err?.message || err);
        });
      } catch (err) {
        console.warn('Firestore Send Message Error:', err);
      }
    }
    return msg;
  },

  /**
   * Listen to real-time chat messages for a ride
   */
  subscribeToMessages(rideId: string, callback: (messages: any[]) => void) {
    const unsubBus = realtimeSyncBus.subscribeMessages(rideId, callback);

    let unsubFirestore = () => {};
    if (isFirebaseConfigured()) {
      try {
        const q = query(collection(db, 'rides', rideId, 'messages'), orderBy('createdAt', 'asc'));
        unsubFirestore = onSnapshot(
          q,
          (snapshot) => {
            const msgs = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
              time: docSnap.data().createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Ahora',
            }));
            if (msgs.length > 0) {
              callback(msgs);
            }
          },
          (err) => {
            console.warn('Firestore chat messages listener error (usando bus local):', err?.message || err);
          }
        );
      } catch (e) {
        console.warn('Firestore subscribeToMessages error:', e);
      }
    }

    return () => {
      unsubBus();
      unsubFirestore();
    };
  },

  /**
   * Top-up driver wallet balance in Cloud Firestore and record transaction in 'wallet_recharges'
   */
  async topUpDriverWallet(driverId: string, amount: number, currentBalance: number = 0, transferReference?: string): Promise<number> {
    const newBalance = (currentBalance || 0) + amount;
    if (isFirebaseConfigured() && driverId) {
      try {
        const rechargeId = 'rec-' + Date.now();
        // 1. Guardar la recarga en la colección 'wallet_recharges'
        await setDoc(doc(db, 'wallet_recharges', rechargeId), {
          id: rechargeId,
          driverId,
          amount,
          previousBalance: currentBalance || 0,
          newBalance,
          paymentMethod: 'QR_BOLIVIA',
          reference: transferReference || `QR-PAGO-${driverId}-${Date.now().toString().slice(-6)}`,
          status: 'COMPLETED',
          timestamp: serverTimestamp(),
        });

        // 2. Actualizar el saldo del conductor en 'users'
        await setDoc(doc(db, 'users', driverId), {
          walletBalance: newBalance,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('Firestore topUpDriverWallet Error:', err);
      }
    }
    return newBalance;
  },

  /**
   * Update arbitrary user profile fields in Cloud Firestore
   */
  async updateUserProfileFirestore(userId: string, data: Partial<UserProfile>) {
    if (isFirebaseConfigured() && userId) {
      try {
        await setDoc(doc(db, 'users', userId), {
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('Firestore updateUserProfileFirestore Error:', err);
      }
    }
  },

  /**
   * Mark driver onboarding tutorial as completed in Cloud Firestore
   */
  async setDriverTutorialCompleted(driverId: string) {
    if (isFirebaseConfigured() && driverId) {
      try {
        await setDoc(doc(db, 'users', driverId), {
          hasCompletedDriverTutorial: true,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('Firestore setDriverTutorialCompleted Error:', err);
      }
    }
  },

  /**
   * Deduct 1 BOB trip commission from driver balance in Cloud Firestore
   */
  async deductTripCommission(driverId: string, currentBalance: number = 0, commissionFee: number = 1.0): Promise<number> {
    const newBalance = Math.max(0, (currentBalance || 0) - commissionFee);
    if (isFirebaseConfigured() && driverId) {
      try {
        await setDoc(doc(db, 'users', driverId), {
          walletBalance: newBalance,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('Firestore deductTripCommission Error:', err);
      }
    }
    return newBalance;
  },

  /**
   * Decrement gift free trips remaining for a driver in Cloud Firestore
   */
  async decrementDriverFreeTrips(driverId: string, currentFreeTrips: number = 0): Promise<number> {
    const newRemaining = Math.max(0, (currentFreeTrips || 0) - 1);
    if (isFirebaseConfigured() && driverId) {
      try {
        await setDoc(doc(db, 'users', driverId), {
          freeTripsRemaining: newRemaining,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (err) {
        console.error('Firestore decrementDriverFreeTrips Error:', err);
      }
    }
    return newRemaining;
  },

  /**
   * Driver marks QR payment as confirmed and updates ride status in Cloud Firestore & RealtimeSyncBus
   */
  async confirmRideQrPayment(rideId: string) {
    const current = realtimeSyncBus.getRide(rideId) || {};
    realtimeSyncBus.saveRide({
      ...current,
      id: rideId,
      paymentStatus: 'CONFIRMED',
    });

    if (isFirebaseConfigured() && rideId) {
      try {
        await updateDoc(doc(db, 'rides', rideId), {
          paymentStatus: 'CONFIRMED',
          paymentConfirmedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore confirmRideQrPayment Error:', err);
      }
    }
  },

  /**
   * Passenger indicates they sent the QR payment and is waiting for driver approval
   */
  async submitRideQrPayment(rideId: string) {
    const current = realtimeSyncBus.getRide(rideId) || {};
    realtimeSyncBus.saveRide({
      ...current,
      id: rideId,
      paymentStatus: 'WAITING_DRIVER_CONFIRM',
    });

    if (isFirebaseConfigured() && rideId) {
      try {
        await updateDoc(doc(db, 'rides', rideId), {
          paymentStatus: 'WAITING_DRIVER_CONFIRM',
          paymentSentAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore submitRideQrPayment Error:', err);
      }
    }
  },

  /**
   * Fetch terminal departures or seed initial real departures
   */
  async getOrSeedTerminalDepartures(): Promise<TerminalDeparture[]> {
    const defaultDepartures: TerminalDeparture[] = [
      {
        id: 'dep-rib-gua-0800',
        route: 'Riberalta ➔ Guayaramerín',
        time: '08:00 AM',
        date: 'Hoy',
        vehicleType: 'TOYOTA_NOAH',
        vehicleModel: 'Toyota Noah (A/C - 7 Asientos)',
        plate: 'RBT-4821',
        driverName: 'Don Mario Justiniano',
        driverPhone: '+591 74512389',
        driverRating: 4.9,
        pricePerSeat: 35.00,
        totalSeats: 7,
        occupiedSeats: [2, 4],
      },
      {
        id: 'dep-rib-gua-1000',
        route: 'Riberalta ➔ Guayaramerín',
        time: '10:00 AM',
        date: 'Hoy',
        vehicleType: 'TOYOTA_IPSUM',
        vehicleModel: 'Toyota Ipsum (A/C - 6 Asientos)',
        plate: 'RBT-3190',
        driverName: 'Carlos Suarez',
        driverPhone: '+591 73298102',
        driverRating: 4.7,
        pricePerSeat: 35.00,
        totalSeats: 6,
        occupiedSeats: [1],
      },
      {
        id: 'dep-rib-gua-1200',
        route: 'Riberalta ➔ Guayaramerín',
        time: '12:00 PM',
        date: 'Hoy',
        vehicleType: 'TOYOTA_NOAH',
        vehicleModel: 'Toyota Noah (A/C - 7 Asientos)',
        plate: 'RBT-2105',
        driverName: 'Oscar Vaca',
        driverPhone: '+591 77891234',
        driverRating: 4.8,
        pricePerSeat: 35.00,
        totalSeats: 7,
        occupiedSeats: [1, 2, 5],
      },
      {
        id: 'dep-rib-gua-1430',
        route: 'Riberalta ➔ Guayaramerín',
        time: '02:30 PM',
        date: 'Hoy',
        vehicleType: 'TOYOTA_IPSUM',
        vehicleModel: 'Toyota Ipsum (A/C - 6 Asientos)',
        plate: 'RBT-5542',
        driverName: 'Roberto Pinto',
        driverPhone: '+591 72345678',
        driverRating: 4.9,
        pricePerSeat: 35.00,
        totalSeats: 6,
        occupiedSeats: [],
      },
      {
        id: 'dep-rib-gua-1700',
        route: 'Riberalta ➔ Guayaramerín',
        time: '05:00 PM',
        date: 'Hoy',
        vehicleType: 'TOYOTA_NOAH',
        vehicleModel: 'Toyota Noah (A/C - 7 Asientos)',
        plate: 'RBT-9011',
        driverName: 'Jorge Mercado',
        driverPhone: '+591 75678901',
        driverRating: 5.0,
        pricePerSeat: 35.00,
        totalSeats: 7,
        occupiedSeats: [3],
      },
    ];

    if (isFirebaseConfigured()) {
      try {
        const departuresRef = collection(db, 'terminal_departures');
        const snap = await getDocs(departuresRef);

        if (!snap.empty) {
          return snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })) as TerminalDeparture[];
        }

        // Seed initial departures to Cloud Firestore
        for (const dep of defaultDepartures) {
          try {
            await setDoc(doc(db, 'terminal_departures', dep.id), {
              ...dep,
              createdAt: serverTimestamp(),
            });
          } catch (e) {
            console.warn('Could not seed departure doc due to rules:', e);
          }
        }
        return defaultDepartures;
      } catch (err) {
        console.warn('Firestore terminal_departures query error:', err);
        return defaultDepartures;
      }
    }

    return defaultDepartures;
  },

  /**
   * Book seat for a Noah / Ipsum trip to Guayaramerín in Cloud Firestore
   */
  async bookTerminalSeat(
    departure: TerminalDeparture, 
    seatNumber: number, 
    user: UserProfile
  ): Promise<TerminalBooking> {
    const bookingId = 'book-' + Date.now();
    const newBooking: TerminalBooking = {
      id: bookingId,
      departureId: departure.id,
      passengerId: user.id,
      passengerName: user.name,
      passengerPhone: user.phone,
      seatNumber,
      route: departure.route,
      time: departure.time,
      date: departure.date,
      vehicleModel: departure.vehicleModel,
      plate: departure.plate,
      driverName: departure.driverName,
      driverPhone: departure.driverPhone,
      price: departure.pricePerSeat,
      status: 'CONFIRMED',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (isFirebaseConfigured()) {
      try {
        // Save booking in Firestore
        await setDoc(doc(db, 'terminal_bookings', bookingId), {
          ...newBooking,
          createdAt: serverTimestamp(),
        });

        // Update occupied seats array in departure doc
        const updatedOccupied = [...departure.occupiedSeats, seatNumber];
        await updateDoc(doc(db, 'terminal_departures', departure.id), {
          occupiedSeats: updatedOccupied,
          updatedAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn('Firestore bookTerminalSeat notice:', err?.message || err);
      }
    }

    return newBooking;
  },

  /**
   * Listen to real-time seat bookings for a user
   */
  subscribeToUserBookings(userId: string, callback: (bookings: TerminalBooking[]) => void) {
    if (isFirebaseConfigured() && userId) {
      try {
        const q = query(collection(db, 'terminal_bookings'), where('passengerId', '==', userId));
        return onSnapshot(
          q,
          (snapshot) => {
            const bookings = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            })) as TerminalBooking[];
            callback(bookings);
          },
          (err) => {
            console.warn('Firestore terminal_bookings listener notice:', err?.message || err);
            callback([]);
          }
        );
      } catch (e) {
        console.warn('Error setting up terminal_bookings listener:', e);
        callback([]);
      }
    }
    callback([]);
    return () => {};
  },

  /**
   * Request private door-to-door car trip to Guayaramerín
   */
  async requestExpresoRide(
    user: UserProfile, 
    pickupAddress: string, 
    destinationAddress: string, 
    departureDate: string, 
    departureTime: string
  ): Promise<TerminalExpreso> {
    const expresoId = 'exp-' + Date.now();
    const newExpreso: TerminalExpreso = {
      id: expresoId,
      passengerId: user.id,
      passengerName: user.name,
      passengerPhone: user.phone,
      pickupAddress: pickupAddress || 'Domicilio en Riberalta',
      destinationAddress: destinationAddress || 'Guayaramerín Centro',
      departureDate: departureDate || 'Hoy',
      departureTime: departureTime || 'Ahora',
      vehicleType: 'TOYOTA_NOAH',
      price: 250.00,
      status: 'ACCEPTED',
      driverName: 'Don Grover Soliz (Auto Expreso A/C)',
      driverPhone: '+591 71298456',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(db, 'terminal_expresos', expresoId), {
          ...newExpreso,
          createdAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn('Firestore requestExpresoRide notice:', err?.message || err);
      }
    }

    return newExpreso;
  },

  /**
   * Send package encomienda Riberalta ↔ Guayaramerín
   */
  async sendEncomienda(
    user: UserProfile,
    recipientName: string,
    recipientPhone: string,
    packageDescription: string,
    origin: string,
    destination: string,
    deliveryAddress: string
  ): Promise<TerminalEncomienda> {
    const trackingCode = 'ENC-' + Math.floor(1000 + Math.random() * 9000);
    const encomiendaId = 'enc-' + Date.now();

    const newEncomienda: TerminalEncomienda = {
      id: encomiendaId,
      trackingCode,
      senderName: user.name,
      senderPhone: user.phone,
      recipientName: recipientName || 'Destinatario',
      recipientPhone: recipientPhone || '+591 70000000',
      packageDescription: packageDescription || 'Paquete / Sobre',
      origin: origin || 'Riberalta',
      destination: destination || 'Guayaramerín',
      deliveryAddress: deliveryAddress || 'Terminal Guayaramerín',
      price: 20.00,
      status: 'EN_TRANSITO',
      driverName: 'Chofer Juan Carlos (Noah RBT-3912)',
      driverPhone: '+591 71123456',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    if (isFirebaseConfigured()) {
      try {
        await setDoc(doc(db, 'terminal_encomiendas', encomiendaId), {
          ...newEncomienda,
          createdAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.warn('Firestore sendEncomienda notice:', err?.message || err);
      }
    }

    return newEncomienda;
  },

  /**
   * Listen to real-time encomiendas for user
   */
  subscribeToEncomiendas(userId: string, callback: (encomiendas: TerminalEncomienda[]) => void) {
    if (isFirebaseConfigured() && userId) {
      try {
        const q = query(collection(db, 'terminal_encomiendas'), where('senderName', '==', userId));
        return onSnapshot(
          q,
          (snapshot) => {
            const encs = snapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            })) as TerminalEncomienda[];
            callback(encs);
          },
          (err) => {
            console.warn('Firestore terminal_encomiendas listener notice:', err?.message || err);
            callback([]);
          }
        );
      } catch (e) {
        console.warn('Error setting up terminal_encomiendas listener:', e);
        callback([]);
      }
    }
    callback([]);
    return () => {};
  },
};
