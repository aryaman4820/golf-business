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

// Dynamic geocoding via OpenStreetMap's free public Nominatim API. Returns the
// best matching UK coordinate for a free-text query, or null when the query is
// too short, the API returns nothing, or the request fails. Callers are
// responsible for graceful fallback (e.g. auto-including the club).
export async function fetchCoordinates(
  searchQuery: string,
): Promise<LatLng | null> {
  if (!searchQuery || searchQuery.trim().length < 3) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery,
      )}&countrycodes=gb&limit=1`,
    );
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Geocoding failed:", err);
  }
  return null;
}
