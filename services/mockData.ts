export interface DestinationOption {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Categoría para agrupar y elegir icono en el buscador */
  category?: DestinationCategory;
  /** Palabras alternativas para que el buscador lo encuentre */
  aliases?: string[];
}

export type DestinationCategory =
  | 'plaza' | 'salud' | 'mercado' | 'transporte' | 'educacion'
  | 'banco' | 'hotel' | 'deporte' | 'servicio' | 'otro';

export type VehicleType = 'MOTOTAXI' | 'MOTOCAR' | 'TAXI_AUTO';

export interface DriverData {
  id: string;
  name: string;
  rating: number | null;
  ratingsCount?: number;
  trips: number;
  vehicleType?: VehicleType;
  motorcycle: string;
  plate: string;
  phone: string;
  avatar: string;
  currentLocation: { lat: number; lng: number };
  heading?: number; // Angulo de dirección en grados (0 - 360) hacia donde apunta el vehículo
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
    id: 'plaza-armas',
    name: 'Plaza de Armas 3 de Febrero',
    address: 'Centro, Riberalta',
    lat: -10.99763,
    lng: -66.07495,
    category: 'plaza',
    aliases: ['plaza principal', 'centro', 'iglesia', 'catedral'],
  },
  {
    id: 'mercado-central',
    name: 'Mercado Central',
    address: 'Centro, Riberalta',
    lat: -11.00025,
    lng: -66.07776,
    category: 'mercado',
    aliases: ['mercado', 'compras', 'verduras'],
  },
  {
    id: 'mercado-san-jose',
    name: 'Mercado San José',
    address: 'Barrio San José, Riberalta',
    lat: -11.00027,
    lng: -66.0648,
    category: 'mercado',
    aliases: ['mercado', 'compras'],
  },
  {
    id: 'hospital-general',
    name: 'Hospital General de Riberalta',
    address: 'Zona Hospital, Riberalta',
    lat: -11.00023,
    lng: -66.05959,
    category: 'salud',
    aliases: ['hospital', 'emergencia', 'urgencias', 'medico', 'san vicente'],
  },
  {
    id: 'centro-salud',
    name: 'Centro de Salud Riberalta',
    address: 'Riberalta',
    lat: -11.00188,
    lng: -66.05944,
    category: 'salud',
    aliases: ['posta', 'medico', 'salud'],
  },
  {
    id: 'clinica-4-dic',
    name: 'Clínica 4 de Diciembre',
    address: 'Riberalta',
    lat: -11.00458,
    lng: -66.06474,
    category: 'salud',
    aliases: ['clinica', 'medico'],
  },
  {
    id: 'terminal-buses',
    name: 'Terminal de Buses de Riberalta',
    address: 'Riberalta',
    lat: -11.00392,
    lng: -66.05879,
    category: 'transporte',
    aliases: ['terminal', 'flota', 'bus', 'viaje', 'guayaramerin', 'rurrenabaque', 'cobija'],
  },
  {
    id: 'aeropuerto',
    name: 'Aeropuerto Capitán Selin Zeitun López',
    address: 'Sur de Riberalta',
    lat: -11.00981,
    lng: -66.07336,
    category: 'transporte',
    aliases: ['aeropuerto', 'avion', 'vuelo', 'selva alegre'],
  },
  {
    id: 'puerto-pila',
    name: 'Puerto Pila',
    address: 'Ribera del Río Beni',
    lat: -10.99457,
    lng: -66.0665,
    category: 'transporte',
    aliases: ['puerto', 'rio', 'embarcadero', 'lancha', 'beni'],
  },
  {
    id: 'puerto-capitania',
    name: 'Puerto Capitanía',
    address: 'Ribera del Río Beni',
    lat: -10.99461,
    lng: -66.07258,
    category: 'transporte',
    aliases: ['puerto', 'capitania', 'rio', 'costanera', 'malecon', 'beni'],
  },
  {
    id: 'campus-uni',
    name: 'Campus Universitario Riberalta',
    address: 'Norte de Riberalta',
    lat: -10.99499,
    lng: -66.06083,
    category: 'educacion',
    aliases: ['universidad', 'uab', 'uagrm', 'campus', 'uni'],
  },
  {
    id: 'normal-rural',
    name: 'Escuela Normal Rural',
    address: 'Riberalta',
    lat: -11.00333,
    lng: -66.06039,
    category: 'educacion',
    aliases: ['normal', 'escuela', 'instituto'],
  },
  {
    id: 'colegio-kramer',
    name: 'Colegio Nacional Pedro Kramer',
    address: 'Riberalta',
    lat: -10.99892,
    lng: -66.06919,
    category: 'educacion',
    aliases: ['colegio', 'kramer', 'escuela', 'unidad educativa'],
  },
  {
    id: 'colegio-carmen',
    name: 'U.E. Nuestra Señora del Carmen',
    address: 'Riberalta',
    lat: -10.99882,
    lng: -66.07722,
    category: 'educacion',
    aliases: ['colegio', 'carmen', 'escuela', 'unidad educativa'],
  },
  {
    id: 'colegio-avaroa',
    name: 'U.E. Colegio Avaroa',
    address: 'Riberalta',
    lat: -11.00761,
    lng: -66.06124,
    category: 'educacion',
    aliases: ['colegio', 'avaroa', 'escuela', 'unidad educativa'],
  },
  {
    id: 'colegio-suizo',
    name: 'Colegio Suizo',
    address: 'Riberalta',
    lat: -11.00895,
    lng: -66.04089,
    category: 'educacion',
    aliases: ['colegio', 'suizo', 'escuela'],
  },
  {
    id: 'banco-union',
    name: 'Banco Unión',
    address: 'Centro, Riberalta',
    lat: -10.99916,
    lng: -66.07566,
    category: 'banco',
    aliases: ['banco', 'cajero', 'atm', 'dinero'],
  },
  {
    id: 'banco-sol',
    name: 'Banco Sol',
    address: 'Centro, Riberalta',
    lat: -10.9985,
    lng: -66.07606,
    category: 'banco',
    aliases: ['banco', 'cajero', 'atm', 'dinero'],
  },
  {
    id: 'banco-bnb',
    name: 'Banco Nacional de Bolivia',
    address: 'Centro, Riberalta',
    lat: -10.99991,
    lng: -66.075,
    category: 'banco',
    aliases: ['banco', 'bnb', 'cajero', 'atm'],
  },
  {
    id: 'banco-mercantil',
    name: 'Banco Mercantil Santa Cruz',
    address: 'Centro, Riberalta',
    lat: -10.99832,
    lng: -66.07494,
    category: 'banco',
    aliases: ['banco', 'bmsc', 'cajero', 'atm'],
  },
  {
    id: 'banco-fie',
    name: 'Banco FIE',
    address: 'Centro, Riberalta',
    lat: -11.00055,
    lng: -66.0783,
    category: 'banco',
    aliases: ['banco', 'fie', 'cajero', 'atm'],
  },
  {
    id: 'alcaldia',
    name: 'Alcaldía de Riberalta',
    address: 'Centro, Riberalta',
    lat: -10.99716,
    lng: -66.07431,
    category: 'servicio',
    aliases: ['municipio', 'gobierno municipal', 'tramites'],
  },
  {
    id: 'policia',
    name: 'Policía Nacional (PNB)',
    address: 'Centro, Riberalta',
    lat: -10.99754,
    lng: -66.07345,
    category: 'servicio',
    aliases: ['policia', 'pnb', 'denuncia', 'felcc'],
  },
  {
    id: 'cine',
    name: 'Cinecenter Riberalta',
    address: 'Centro, Riberalta',
    lat: -10.99829,
    lng: -66.07479,
    category: 'otro',
    aliases: ['cine', 'peliculas', 'entretenimiento'],
  },
  {
    id: 'centro-cultural',
    name: 'Centro Cultural Boliviano-Japonés',
    address: 'Riberalta',
    lat: -11.00101,
    lng: -66.07794,
    category: 'otro',
    aliases: ['museo', 'cultura', 'japones'],
  },
  {
    id: 'hotel-colonial',
    name: 'Hotel Colonial',
    address: 'Centro, Riberalta',
    lat: -10.99787,
    lng: -66.07379,
    category: 'hotel',
    aliases: ['hotel', 'alojamiento', 'hospedaje'],
  },
  {
    id: 'hotel-campos',
    name: 'Hotel Campos',
    address: 'Riberalta',
    lat: -10.99845,
    lng: -66.07137,
    category: 'hotel',
    aliases: ['hotel', 'alojamiento', 'hospedaje'],
  },
  {
    id: 'hotel-jomali',
    name: 'Hotel Jomali',
    address: 'Centro, Riberalta',
    lat: -10.99862,
    lng: -66.07434,
    category: 'hotel',
    aliases: ['hotel', 'alojamiento', 'hospedaje'],
  },
  {
    id: 'hotel-perla',
    name: 'Hotel Perla Amazónica',
    address: 'Riberalta',
    lat: -11.00262,
    lng: -66.06369,
    category: 'hotel',
    aliases: ['hotel', 'alojamiento', 'hospedaje', 'perla'],
  },
  {
    id: 'estadio',
    name: 'Estadio Enrique Giesse',
    address: 'Riberalta',
    lat: -11.00322,
    lng: -66.0781,
    category: 'deporte',
    aliases: ['estadio', 'futbol', 'cancha', 'giesse'],
  },
  {
    id: 'coliseo-cerrado',
    name: 'Coliseo Cerrado Juan Evo Morales Ayma',
    address: 'Riberalta',
    lat: -10.99791,
    lng: -66.04848,
    category: 'deporte',
    aliases: ['coliseo', 'deporte', 'basquet', 'evo'],
  },
  {
    id: 'coliseo-riberalta',
    name: 'Coliseo de Riberalta',
    address: 'Riberalta',
    lat: -11.01195,
    lng: -66.05827,
    category: 'deporte',
    aliases: ['coliseo', 'deporte'],
  },
  {
    id: 'polideportivo-bersatti',
    name: 'Polideportivo Bersatti',
    address: 'Riberalta',
    lat: -11.01388,
    lng: -66.05028,
    category: 'deporte',
    aliases: ['polideportivo', 'cancha', 'deporte'],
  },
  {
    id: 'plaza-santa-cruz',
    name: 'Plaza Santa Cruz',
    address: 'Riberalta',
    lat: -11.00522,
    lng: -66.06595,
    category: 'plaza',
    aliases: ['plaza'],
  },
  {
    id: 'plaza-san-antonio',
    name: 'Plaza San Antonio',
    address: 'Riberalta',
    lat: -10.99727,
    lng: -66.06698,
    category: 'plaza',
    aliases: ['plaza'],
  },
  {
    id: 'plaza-periodista',
    name: 'Plaza del Periodista',
    address: 'Riberalta',
    lat: -11.00228,
    lng: -66.06401,
    category: 'plaza',
    aliases: ['plaza', 'periodista'],
  },
  {
    id: 'plaza-sucre',
    name: 'Plaza Antonio José de Sucre',
    address: 'Riberalta',
    lat: -11.00161,
    lng: -66.07693,
    category: 'plaza',
    aliases: ['plaza', 'sucre'],
  },
  {
    id: 'plaza-cultural',
    name: 'Plaza Cultural',
    address: 'Centro, Riberalta',
    lat: -10.99929,
    lng: -66.07361,
    category: 'plaza',
    aliases: ['plaza', 'cultura'],
  },
  {
    id: 'plaza-tajibo',
    name: 'Plaza Tajibo',
    address: 'Sur de Riberalta',
    lat: -11.02334,
    lng: -66.04766,
    category: 'plaza',
    aliases: ['plaza', 'tajibo'],
  },
  {
    id: 'surtidor-vaca-diez',
    name: 'Surtidor Vaca Diez II',
    address: 'Riberalta',
    lat: -10.99933,
    lng: -66.06265,
    category: 'servicio',
    aliases: ['gasolina', 'surtidor', 'combustible', 'estacion de servicio'],
  },
  {
    id: 'surtidor-imanol',
    name: 'Surtidor Imanol',
    address: 'Riberalta',
    lat: -11.00417,
    lng: -66.05534,
    category: 'servicio',
    aliases: ['gasolina', 'surtidor', 'combustible', 'estacion de servicio'],
  },
  {
    id: 'usina',
    name: 'Usina El Palmar',
    address: 'Riberalta',
    lat: -10.99769,
    lng: -66.05341,
    category: 'otro',
    aliases: ['planta electrica', 'usina', 'luz'],
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
