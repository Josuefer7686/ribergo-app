import { calculateDistanceMeters } from './geo';

/**
 * In-memory LRU route cache to prevent repeated requests
 * when driver/user GPS jitters by a few meters.
 */
const routeCache = new Map<string, { coords: [number, number][]; timestamp: number }>();
const CACHE_TTL_MS = 10000; // 10 seconds cache for coordinate segment

const ROUTING_ENDPOINTS = [
  // 1. OpenStreetMap DE routed-bike (Ideal for mototaxis in Riberalta: navigates streets, alleys & unpaved avenues)
  (startLng: number, startLat: number, endLng: number, endLat: number) =>
    `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
  // 2. OpenStreetMap DE routed-car
  (startLng: number, startLat: number, endLng: number, endLat: number) =>
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
  // 3. Global Project-OSRM fallback
  (startLng: number, startLat: number, endLng: number, endLat: number) =>
    `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
];

/**
 * Fetches turn-by-turn street route coordinates for Riberalta, Bolivia.
 * Guarantees that the route starts exactly at the start point and terminates exactly at the destination.
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

  // 4 decimal places precision is ~11 meters
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.coords;
  }

  for (const buildUrl of ROUTING_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2600);

      const url = buildUrl(startLng, startLat, endLng, endLat);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes[0]?.geometry?.coordinates) {
          const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
          if (rawCoords.length >= 2) {
            // GeoJSON coordinates are [longitude, latitude] -> convert to Leaflet [latitude, longitude]
            const points: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

            // Ensure route starts at the exact start coordinate
            const firstDist = calculateDistanceMeters(points[0][0], points[0][1], startLat, startLng);
            if (firstDist > 5) {
              points.unshift([startLat, startLng]);
            } else {
              points[0] = [startLat, startLng];
            }

            // Ensure route terminates at the exact destination coordinate
            const lastIdx = points.length - 1;
            const lastDist = calculateDistanceMeters(points[lastIdx][0], points[lastIdx][1], endLat, endLng);
            if (lastDist > 5) {
              points.push([endLat, endLng]);
            } else {
              points[lastIdx] = [endLat, endLng];
            }

            // Save in cache
            routeCache.set(cacheKey, { coords: points, timestamp: Date.now() });
            if (routeCache.size > 60) {
              const oldest = routeCache.keys().next().value;
              if (oldest) routeCache.delete(oldest);
            }

            return points;
          }
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  // Graceful fallback: clean direct connection between origin and destination
  const fallbackRoute: [number, number][] = [
    [startLat, startLng],
    [endLat, endLng],
  ];
  return fallbackRoute;
}
