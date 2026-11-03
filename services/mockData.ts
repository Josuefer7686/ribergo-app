export interface DestinationOption {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface DriverData {
  id: string;
  name: string;
  rating: number;
  trips: number;
  motorcycle: string;
  plate: string;
  phone: string;
  avatar: string;
  currentLocation: { lat: number; lng: number };
  heading?: number; // Angulo de dirección en grados (0 - 360) hacia donde apunta la moto
  speed?: number; // Velocidad estimada en km/h
}

export interface TripHistoryItem {
  id: string;
  date: string;
  time: string;
  pickup: string;
  destination: string;
  price: number;
  driverName: string;
  driverRating: number;
  motorcycle: string;
  status: 'COMPLETED' | 'CANCELLED';
  group: 'TODAY' | 'WEEK' | 'MONTH';
}

export interface ChatMessage {
  id: string;
  sender: 'PASSENGER' | 'DRIVER';
  text: string;
  time: string;
}

// Riberalta Center
export const RIBERALTA_CENTER = {
  lat: -11.0061,
  lng: -66.0747,
};

export const DESTINATION_IN_PERSON: DestinationOption = {
  id: 'in-person',
  name: 'Acordar destino en persona',
  address: 'Habla directamente con tu mototaxista al subirte',
  lat: -11.0061,
  lng: -66.0747,
};

export const RIBERALTA_DESTINATIONS: DestinationOption[] = [
  DESTINATION_IN_PERSON,
  {
    id: '1',
    name: 'Plaza Principal 3 de Febrero',
    address: 'Centro, Riberalta',
    lat: -11.0061,
    lng: -66.0747,
  },
  {
    id: '2',
    name: 'Aeropuerto Selva Alegre',
    address: 'Av. Aeropuerto, Riberalta',
    lat: -10.9850,
    lng: -66.0820,
  },
  {
    id: '3',
    name: 'Mercado Central',
    address: 'Calle Comercio, Riberalta',
    lat: -11.0090,
    lng: -66.0780,
  },
  {
    id: '4',
    name: 'Hospital San Vicente de Paúl',
    address: 'Av. Gabriel René Moreno, Riberalta',
    lat: -11.0010,
    lng: -66.0710,
  },
  {
    id: '5',
    name: 'Costanera Río Beni',
    address: 'Malecón Costanera, Riberalta',
    lat: -10.9980,
    lng: -66.0790,
  },
  {
    id: '6',
    name: 'Terminal de Buses',
    address: 'Av. Circunvalación, Riberalta',
    lat: -11.0180,
    lng: -66.0690,
  },
];

export const MOCK_DRIVERS: DriverData[] = [];

export const INITIAL_TRIPS: TripHistoryItem[] = [
  {
    id: 'trip-101',
    date: 'Hoy',
    time: '14:20',
    pickup: 'Mi Ubicación',
    destination: 'Plaza Principal 3 de Febrero',
    price: 7,
    driverName: 'Carlos Mendoza',
    driverRating: 5,
    motorcycle: 'Honda Wave 110',
    status: 'COMPLETED',
    group: 'TODAY',
  },
  {
    id: 'trip-102',
    date: 'Ayer',
    time: '18:45',
    pickup: 'Mercado Central',
    destination: 'Hospital San Vicente',
    price: 8,
    driverName: 'María González',
    driverRating: 5,
    motorcycle: 'Suzuki AX100',
    status: 'COMPLETED',
    group: 'WEEK',
  },
  {
    id: 'trip-103',
    date: '10 de Septiembre',
    time: '09:15',
    pickup: 'Costanera Río Beni',
    destination: 'Aeropuerto Selva Alegre',
    price: 15,
    driverName: 'Javier Roca',
    driverRating: 5,
    motorcycle: 'Yamaha Crypton 115',
    status: 'COMPLETED',
    group: 'MONTH',
  },
];

export const MOCK_DRIVER_INCOME = {
  today: 145,
  week: 890,
  month: 3450,
  todayTrips: 14,
  connectedHours: 5.5,
  dailyChart: [
    { day: 'Lun', amount: 110 },
    { day: 'Mar', amount: 135 },
    { day: 'Mié', amount: 120 },
    { day: 'Jue', amount: 160 },
    { day: 'Vie', amount: 210 },
    { day: 'Sáb', amount: 240 },
    { day: 'Dom', amount: 145 },
  ],
};
