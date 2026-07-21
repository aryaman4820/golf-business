export type LatLng = { lat: number; lng: number };

// Great-circle distance between two coordinates, in miles (Haversine formula).
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    (Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Dynamic geocoding via Komoot's Photon API (CORS-friendly, no API key).
// Returns the best matching coordinate for a free-text query, or null when
// the query is too short, the API returns nothing, or the request fails.
// Photon returns GeoJSON with coordinates ordered [lng, lat], so we map
// coords[1] -> lat and coords[0] -> lng. The entire network call is wrapped
// in try/catch so a failed fetch logs a fallback warning and returns null
// instead of throwing an uncaught TypeError.
export async function fetchCoordinates(
  searchQuery: string,
): Promise<LatLng | null> {
  if (!searchQuery || searchQuery.trim().length < 3) return null;
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=1`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ geometry?: { coordinates?: [number, number] } }>;
    };
    const coords = data?.features?.[0]?.geometry?.coordinates;
    if (coords && coords.length === 2) {
      return { lat: coords[1], lng: coords[0] };
    }
  } catch (err) {
    console.warn("Geocoding fallback:", searchQuery, err);
    return null;
  }
  return null;
}
