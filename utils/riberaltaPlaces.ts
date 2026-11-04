export interface RiberaltaPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: 'plaza' | 'mercado' | 'hospital' | 'barrio' | 'calle' | 'avenida' | 'transporte' | 'otro';
}

export const RIBERALTA_PLACES: RiberaltaPlace[] = [
  // Plazas y Centros
  {
    id: 'plaza-3-febrero',
    name: 'Plaza Principal 3 de Febrero',
    address: 'Centro Histórico, Riberalta',
    lat: -11.0061,
    lng: -66.0747,
    category: 'plaza',
  },
  {
    id: 'plaza-los-almendros',
    name: 'Plaza / Cancha Los Almendros',
    address: 'Barrio Los Almendros, Riberalta',
    lat: -11.0118,
    lng: -66.0685,
    category: 'plaza',
  },
  {
    id: 'malecon-costanera',
    name: 'Costanera Río Beni / El Malecón',
    address: 'Av. Costanera, Riberalta',
    lat: -10.9980,
    lng: -66.0790,
    category: 'plaza',
  },

  // Mercados
  {
    id: 'mercado-central',
    name: 'Mercado Central',
    address: 'Calle Comercio esq. Chuquisaca',
    lat: -11.0090,
    lng: -66.0780,
    category: 'mercado',
  },
  {
    id: 'mercado-almendros',
    name: 'Mercado Los Almendros',
    address: 'Av. Gabriel René Moreno, Los Almendros',
    lat: -11.0115,
    lng: -66.0682,
    category: 'mercado',
  },
  {
    id: 'mercado-san-jose',
    name: 'Mercado San José / El Triángulo',
    address: 'Barrio San José, Riberalta',
    lat: -11.0080,
    lng: -66.0630,
    category: 'mercado',
  },

  // Salud y Hospitales
  {
    id: 'hospital-general',
    name: 'Hospital General / San Vicente de Paúl',
    address: 'Av. Gabriel René Moreno, Riberalta',
    lat: -11.0010,
    lng: -66.0710,
    category: 'hospital',
  },
  {
    id: 'hospital-materno',
    name: 'Hospital Materno Infantil',
    address: 'Av. Plácido Méndez, Riberalta',
    lat: -11.0035,
    lng: -66.0730,
    category: 'hospital',
  },
  {
    id: 'caja-nacional-salud',
    name: 'Caja Nacional de Salud (CNS)',
    address: 'Calle Pando esq. Beni',
    lat: -11.0042,
    lng: -66.0738,
    category: 'hospital',
  },

  // Transporte
  {
    id: 'aeropuerto-selva-alegre',
    name: 'Aeropuerto Selva Alegre',
    address: 'Av. Aeropuerto / Av. Integración',
    lat: -10.9850,
    lng: -66.0820,
    category: 'transporte',
  },
  {
    id: 'terminal-buses',
    name: 'Terminal de Buses Riberalta',
    address: 'Av. Circunvalación Sur, Riberalta',
    lat: -11.0180,
    lng: -66.0690,
    category: 'transporte',
  },
  {
    id: 'puerto-capitania',
    name: 'Puerto Capitanía / Muelle Río Beni',
    address: 'Sector La Barranca, Riberalta',
    lat: -10.9950,
    lng: -66.0825,
    category: 'transporte',
  },

  // Barrios populares
  {
    id: 'barrio-los-tajibos',
    name: 'Barrio Los Tajibos',
    address: 'Zona Sudoeste, Riberalta',
    lat: -11.0140,
    lng: -66.0810,
    category: 'barrio',
  },
  {
    id: 'barrio-concesion-forestal',
    name: 'Barrio Concesión Forestal',
    address: 'Sector Forestal / Tranca, Riberalta',
    lat: -11.0195,
    lng: -66.0860,
    category: 'barrio',
  },
  {
    id: 'final-jacaranda',
    name: 'Final Jacarandá',
    address: 'Av. Jacarandá al fondo, Riberalta',
    lat: -11.0220,
    lng: -66.0760,
    category: 'barrio',
  },
  {
    id: 'barrio-la-cruz',
    name: 'Barrio La Cruz',
    address: 'Zona Central-Sur, Riberalta',
    lat: -11.0120,
    lng: -66.0750,
    category: 'barrio',
  },
  {
    id: 'barrio-san-antonio',
    name: 'Barrio San Antonio',
    address: 'Cerca del Puente de Madera, Riberalta',
    lat: -11.0170,
    lng: -66.0800,
    category: 'barrio',
  },
  {
    id: 'barrio-el-prado',
    name: 'Barrio El Prado',
    address: 'Riberalta Este',
    lat: -11.0150,
    lng: -66.0700,
    category: 'barrio',
  },
  {
    id: 'barrio-25-diciembre',
    name: 'Barrio 25 de Diciembre',
    address: 'Riberalta Sur',
    lat: -11.0210,
    lng: -66.0820,
    category: 'barrio',
  },
  {
    id: 'barrio-centenario',
    name: 'Barrio Centenario',
    address: 'Riberalta Oeste',
    lat: -11.0090,
    lng: -66.0840,
    category: 'barrio',
  },

  // Avenidas y Calles Principales
  {
    id: 'av-integracion',
    name: 'Avenida Integración',
    address: 'Vía al Aeropuerto, Riberalta',
    lat: -10.9910,
    lng: -66.0780,
    category: 'avenida',
  },
  {
    id: 'av-circunvalacion',
    name: 'Avenida Circunvalación',
    address: 'Anillo Perimetral, Riberalta',
    lat: -11.0160,
    lng: -66.0720,
    category: 'avenida',
  },
  {
    id: 'av-gabriel-rene-moreno',
    name: 'Avenida Gabriel René Moreno',
    address: 'Av. Moreno, Riberalta',
    lat: -11.0030,
    lng: -66.0720,
    category: 'avenida',
  },
  {
    id: 'av-nicolas-suarez',
    name: 'Avenida Nicolás Suárez',
    address: 'Centro, Riberalta',
    lat: -11.0040,
    lng: -66.0770,
    category: 'avenida',
  },
  {
    id: 'calle-comercio',
    name: 'Calle Comercio',
    address: 'Zona Comercial, Riberalta',
    lat: -11.0075,
    lng: -66.0760,
    category: 'calle',
  },
  {
    id: 'calle-chuquisaca',
    name: 'Calle Chuquisaca',
    address: 'Centro, Riberalta',
    lat: -11.0045,
    lng: -66.0755,
    category: 'calle',
  },
  {
    id: 'calle-cochabamba',
    name: 'Calle Cochabamba',
    address: 'Centro, Riberalta',
    lat: -11.0068,
    lng: -66.0735,
    category: 'calle',
  },
  {
    id: 'calle-placido-mendez',
    name: 'Calle Plácido Méndez',
    address: 'Riberalta Centro-Sur',
    lat: -11.0085,
    lng: -66.0745,
    category: 'calle',
  },

  // Deportes e Instituciones
  {
    id: 'estadio-enrique-giese',
    name: 'Estadio Enrique Giese',
    address: 'Av. René Moreno, Riberalta',
    lat: -11.0025,
    lng: -66.0675,
    category: 'otro',
  },
  {
    id: 'universidad-uab',
    name: 'Universidad Autónoma del Beni (UAB)',
    address: 'Campus Riberalta, Av. Moreno',
    lat: -11.0105,
    lng: -66.0655,
    category: 'otro',
  },
  {
    id: 'cementerio-general',
    name: 'Cementerio General Riberalta',
    address: 'Av. Cochabamba, Riberalta',
    lat: -11.0130,
    lng: -66.0730,
    category: 'otro',
  },
];

/**
 * Searches locations in Riberalta by name, address, or category.
 */
export function searchRiberaltaLocations(query: string): RiberaltaPlace[] {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  return RIBERALTA_PLACES.filter((p) => {
    return (
      p.name.toLowerCase().includes(cleanQuery) ||
      p.address.toLowerCase().includes(cleanQuery) ||
      p.category.toLowerCase().includes(cleanQuery)
    );
  }).slice(0, 6);
}

/**
 * Creates a custom unmapped destination when the place is not found in Riberalta database.
 * No map route will be drawn for custom destinations; it will be coordinated in person.
 */
export function createCustomDestination(customName: string) {
  const trimmed = customName.trim() || 'Destino acordado en persona';
  return {
    id: 'custom-destination',
    name: trimmed,
    address: 'Coordinar con el conductor en persona',
    lat: 0,
    lng: 0,
    isCustom: true,
  };
}
