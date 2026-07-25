export type LatLng = { lat: number; lng: number };

export type ResolvedLocation = {
  lat: number;
  lng: number;
  displayName: string;
};

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

// Levenshtein edit distance between two strings. Used for fuzzy typo
// correction of location and club-name queries.
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

// Fuzzy match: true when `query` is a substring of `target`, or when the two
// are close enough by edit distance (tolerance scales with length so short
// words still require near-exact matches). Case-insensitive.
export function fuzzyMatch(query: string, target: string): boolean {
  const q = query.trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (!q || !t) return false;
  if (t.includes(q)) return true;
  const tokens = t.split(/\s+/);
  if (levenshteinDistance(q, t) <= Math.max(1, Math.floor(t.length / 5))) {
    return true;
  }
  for (const tok of tokens) {
    if (tok.includes(q)) return true;
    if (levenshteinDistance(q, tok) <= Math.max(1, Math.floor(tok.length / 4))) {
      return true;
    }
  }
  return false;
}

// Picks the best fuzzy match for `query` from a list of named candidates.
// Returns the index of the closest match, or -1 when nothing is close enough.
export function bestFuzzyIndex(query: string, names: string[]): number {
  const q = query.trim().toLowerCase();
  if (!q) return -1;
  let bestIdx = -1;
  let bestScore = Infinity;
  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim().toLowerCase();
    if (!name) continue;
    if (name === q) return i;
    if (name.includes(q) || q.includes(name)) {
      const score = Math.abs(name.length - q.length);
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
      continue;
    }
    const dist = levenshteinDistance(q, name);
    const tol = Math.max(2, Math.floor(name.length / 4));
    if (dist <= tol && dist < bestScore) {
      bestScore = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// Dynamic geocoding via Komoot's Photon API (CORS-friendly, no API key).
// Returns the best matching coordinate AND a formatted display name parsed
// from the GeoJSON properties. Returns null when the query is too short, the
// API returns nothing, or the request fails. Photon returns GeoJSON with
// coordinates ordered [lng, lat], so we map coords[1] -> lat and coords[0]
// -> lng. The entire network call is wrapped in try/catch so a failed fetch
// logs a fallback warning and returns null instead of throwing.
export async function fetchCoordinates(
  searchQuery: string,
): Promise<ResolvedLocation | null> {
  if (!searchQuery || searchQuery.trim().length < 3) return null;
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=1`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{
        geometry?: { coordinates?: [number, number] };
        properties?: {
          name?: string;
          city?: string;
          state?: string;
          country?: string;
          street?: string;
          postcode?: string;
        };
      }>;
    };
    const feature = data?.features?.[0];
    const coords = feature?.geometry?.coordinates;
    const props = feature?.properties ?? {};
    if (coords && coords.length === 2) {
      const displayNameParts = [
        props.name,
        props.city,
        props.state,
        props.country,
      ].filter((v): v is string => Boolean(v && v.trim()));
      const displayName = displayNameParts.join(", ") || searchQuery.trim();
      return { lat: coords[1], lng: coords[0], displayName };
    }
  } catch (err) {
    console.warn("Geocoding fallback:", searchQuery, err);
    return null;
  }
  return null;
}
