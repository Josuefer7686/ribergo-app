/**
 * GEOLOCATION & BEARING MATHEMATICAL UTILITIES
 * For real-time heading orientation, distance calculation, and direction labeling in Riberalta.
 */

export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

export function getBearingDirectionLabel(heading: number = 0): string {
  const normalized = (heading % 360 + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'Norte';
  if (normalized >= 22.5 && normalized < 67.5) return 'Noreste';
  if (normalized >= 67.5 && normalized < 112.5) return 'Este';
  if (normalized >= 112.5 && normalized < 157.5) return 'Sureste';
  if (normalized >= 157.5 && normalized < 202.5) return 'Sur';
  if (normalized >= 202.5 && normalized < 247.5) return 'Suroeste';
  if (normalized >= 247.5 && normalized < 292.5) return 'Oeste';
  return 'Noroeste';
}

export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function estimateArrivalTimeMinutes(meters: number, avgSpeedKmh: number = 25): number {
  const speedMetersPerMin = (avgSpeedKmh * 1000) / 60;
  const mins = Math.ceil(meters / speedMetersPerMin);
  return Math.max(1, mins);
}
