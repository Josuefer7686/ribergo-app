import { calculateDistanceMeters } from './geo';

/**
 * In-memory LRU-like route cache to prevent unnecessary repeated requests
 * when driver/user GPS jitters by just a few meters.
 */
const routeCache = new Map<string, { coords: [number, number][]; timestamp: number }>();
const CACHE_TTL_MS = 8000; // 8 seconds cache for same coordinate segment

/**
 * Fetches turn-by-turn street route coordinates from OSRM for Riberalta, Bolivia.
 * If OSRM is slow, unreachable, or rate-limited, safely returns a fallback straight line segment.
 */
export async function fetchLiveRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<[number, number][]> {
  // If coordinates are invalid or identical
  if (
    typeof startLat !== 'number' || typeof startLng !== 'number' ||
    typeof endLat !== 'number' || typeof endLng !== 'number' ||
    isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)
  ) {
    return [];
  }

  const distMeters = calculateDistanceMeters(startLat, startLng, endLat, endLng);
  if (distMeters < 8) {
    return [[startLat, startLng], [endLat, endLng]];
  }

  // 4 decimal places precision is ~11 meters, perfect for street route detection & deviation
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.coords;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes[0]?.geometry?.coordinates) {
        // GeoJSON geometry.coordinates is array of [longitude, latitude]
        // Leaflet Polyline expects array of [latitude, longitude]
        const leafletCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        if (leafletCoords.length > 0) {
          // Store in cache
          routeCache.set(cacheKey, { coords: leafletCoords, timestamp: Date.now() });

          // Keep cache clean (max 50 entries)
          if (routeCache.size > 50) {
            const oldestKey = routeCache.keys().next().value;
            if (oldestKey) routeCache.delete(oldestKey);
          }

          return leafletCoords;
        }
      }
    }
  } catch (err) {
    // Network timeout or offline - seamlessly fallback to direct line
  }

  return [[startLat, startLng], [endLat, endLng]];
}
