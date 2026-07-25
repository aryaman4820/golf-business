import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Database, Search, AlertTriangle, ShieldCheck, Home, SlidersHorizontal, X, Car, UtensilsCrossed, Dumbbell, Warehouse, MapPin } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClubProfile, Tier } from "../types";
import { TIER_ORDER } from "../types";
import { TIER_THEMES, formatGBP } from "../lib/tiers";
import ClubCard from "./ClubCard";
import ShoppingBag from "./ShoppingBag";
import {
  fetchCoordinates,
  haversineMiles,
  fuzzyMatch,
  type LatLng,
  type ResolvedLocation,
} from "../lib/geo";

export type RadiusOption = number | null;

const RADIUS_OPTIONS: { label: string; value: RadiusOption }[] = [
  { label: "5 miles", value: 5 },
  { label: "10 miles", value: 10 },
  { label: "25 miles", value: 25 },
  { label: "50 miles", value: 50 },
  { label: "Anywhere", value: null },
];

type AmenityKey = "buggies" | "dining" | "gym" | "storage";

const AMENITIES: { key: AmenityKey; label: string; icon: typeof Car; hint: string }[] = [
  { key: "buggies", label: "Buggies", icon: Car, hint: "Golf buggies available" },
  { key: "dining", label: "On-site dining", icon: UtensilsCrossed, hint: "Restaurant or bar on premises" },
  { key: "gym", label: "Fitness suite", icon: Dumbbell, hint: "On-site gym or fitness facilities" },
  { key: "storage", label: "Club storage", icon: Warehouse, hint: "Bag and trolley storage" },
];

type Props = {
  client: SupabaseClient;
  initialTier?: Tier | null;
  onResetConfig: () => void;
  onOpenAdmin: () => void;
  onGoHome?: () => void;
};

export default function PackageBuilder({ client, initialTier, onResetConfig, onOpenAdmin, onGoHome }: Props) {
  const [activeTier, setActiveTier] = useState<Tier>(initialTier ?? "Premium");

  useEffect(() => {
    if (initialTier) setActiveTier(initialTier);
  }, [initialTier]);
  const [clubs, setClubs] = useState<ClubProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [activeAmenities, setActiveAmenities] = useState<Set<AmenityKey>>(new Set());
  const [radius, setRadius] = useState<RadiusOption>(null);
  const [userCenterCoords, setUserCenterCoords] = useState<LatLng | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<ResolvedLocation | null>(null);
  // Persistent lookup cache: maps a club location string to its dynamically
  // resolved Photon coordinates. Each unique location is fetched at most
  // once to prevent duplicate network calls.
  const [clubCoordinatesMap, setClubCoordinatesMap] = useState<Record<string, LatLng>>({});
  const [showFilters, setShowFilters] = useState(true);

  // Debounced dynamic geocoding of the typed location via the Komoot Photon
  // API. Fires 400ms after the user stops typing and stores the resolved
  // global coordinate as the radius filter's center anchor. The query is
  // treated as a location anchor (geocoded via Photon) AND, when no radius is
  // selected, as a fuzzy club-name filter that tolerates typos.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setUserCenterCoords(null);
      setResolvedLocation(null);
      return;
    }
    const handle = setTimeout(() => {
      let cancelled = false;
      fetchCoordinates(q).then((resolved: ResolvedLocation | null) => {
        if (cancelled) return;
        setUserCenterCoords(resolved);
        setResolvedLocation(resolved);
        console.log(
          "Geocode resolved:",
          resolved?.displayName,
          "->",
          resolved ? `${resolved.lat}, ${resolved.lng}` : "no match",
        );
      });
      return () => {
        cancelled = true;
      };
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  // Background geocoding scanner. Iterates through every club that lacks
  // stored lat/lng, geocodes each unique `location` string once via Nominatim,
  // caches the result in `clubCoordinatesMap`, AND persists the resolved
  // coordinates back to the live `clubs` table so future loads skip the
  // network call entirely.
  useEffect(() => {
    if (clubs.length === 0) return;
    const missing = new Set<string>();
    for (const c of clubs) {
      const loc = (c.location ?? "").trim();
      if (loc.length < 3) continue;
      if (c.lat != null && c.lng != null) continue;
      if (clubCoordinatesMap[loc]) continue;
      missing.add(loc);
    }
    if (missing.size === 0) return;
    let cancelled = false;
    (async () => {
      const updates: Record<string, LatLng> = {};
      for (const loc of missing) {
        if (cancelled) return;
        const coords = await fetchCoordinates(loc);
        if (coords) updates[loc] = coords;
      }
      if (cancelled || Object.keys(updates).length === 0) return;
      setClubCoordinatesMap((prev) => ({ ...prev, ...updates }));
      // Persist resolved coordinates back to Supabase for every real club
      // row that shares this location string. Best-effort: failures are
      // swallowed so the filter still works in-memory via the cache.
      for (const [loc, coords] of Object.entries(updates)) {
        const ids = clubs
          .filter(
            (c) =>
              (c.location ?? "").trim() === loc &&
              !(c.lat != null && c.lng != null) &&
              c.id != null &&
              !c.id.startsWith("rb-clone-"),
          )
          .map((c) => c.id);
        for (const id of ids) {
          await client
            .from("clubs")
            .update({ lat: coords.lat, lng: coords.lng })
            .eq("id", id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubs, clubCoordinatesMap, client]);

  // Multi-selection state: holds the unique club ids of every selected club.
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);

  async function fetchClubs() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await client
        .from("club_profiles_with_tiers")
        .select("*")
        .order("price_full_7day_adult", { ascending: true });
      if (error) throw error;
      const fetched = (data ?? []) as ClubProfile[];
      if (fetched.length === 0) {
        setError(
          "No clubs found in the database. The clubs table may be empty or unreachable.",
        );
      }
      setClubs(fetched);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to load clubs: ${err.message}`
          : "Failed to load clubs",
      );
      setClubs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group clubs by tier. All tiers come from Supabase, deduped by club.id so
  // multi-year demographics don't fan out into duplicate cards sharing one id.
  const grouped = useMemo(() => {
    const map: Record<Tier, ClubProfile[]> = {
      Budget: [],
      "Mid-tier": [],
      Premium: [],
      Luxury: [],
    };
    const seen = new Set<string>();
    for (const c of clubs) {
      if (!c.tier || !(TIER_ORDER as string[]).includes(c.tier)) continue;
      if (c.id && seen.has(c.id)) continue;
      if (c.id) seen.add(c.id);
      map[c.tier].push(c);
    }
    return map;
  }, [clubs]);

  // Unified distance map. Both the user's typed location and each club's
  // location are resolved dynamically via Photon, then compared with the
  // shared Haversine formula. Clubs whose coordinates are still pending or
  // failed to resolve are stored as null (the filter auto-includes them).
  const distanceMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (!userCenterCoords) return map;
    const isValidCoord = (lat: number, lng: number) =>
      !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    for (const c of clubs) {
      const rawLat = c.lat != null ? Number(c.lat) : NaN;
      const rawLng = c.lng != null ? Number(c.lng) : NaN;
      let clubCoords: { lat: number; lng: number } | null = null;
      if (isValidCoord(rawLat, rawLng)) {
        clubCoords = { lat: rawLat, lng: rawLng };
      } else {
        const cached = clubCoordinatesMap[(c.location ?? "").trim()];
        if (cached && isValidCoord(Number(cached.lat), Number(cached.lng))) {
          clubCoords = { lat: Number(cached.lat), lng: Number(cached.lng) };
        }
      }
      if (!clubCoords) {
        map[c.id] = null;
        continue;
      }
      map[c.id] = haversineMiles(
        userCenterCoords.lat,
        userCenterCoords.lng,
        clubCoords.lat,
        clubCoords.lng,
      );
    }
    return map;
  }, [clubs, userCenterCoords, clubCoordinatesMap]);

  const filteredForActive = useMemo(() => {
    // Immediate raw diagnostic: how many clubs did Supabase actually return?
    console.log("Raw clubs array length loaded from Supabase:", clubs?.length);

    const q = query.trim().toLowerCase();
    const radiusNum = radius !== null ? Number(radius) : null;
    const selectedTier = activeTier;

    // Fail-safe: if the user selected a radius but the Photon geocoder hasn't
    // resolved their typed location yet (or the API failed), skip the distance
    // filter entirely and show all clubs for the selected tier.
    const center: LatLng | null =
      radiusNum !== null && userCenterCoords ? userCenterCoords : null;

    const seen = new Set<string>();
    const filtered = clubs.filter((c) => {
      // (3a) Flexible tier match: if no tier is selected, allow all clubs
      // through. Otherwise match permissively via bidirectional includes so
      // case/hyphen differences never filter out courses.
      const isTierMatch =
        !selectedTier ||
        !c.tier ||
        c.tier.toLowerCase().trim().includes(selectedTier.toLowerCase().trim()) ||
        selectedTier.toLowerCase().trim().includes(c.tier.toLowerCase().trim());
      if (!isTierMatch) return false;

      // Dedup by club id so multi-year demographics don't fan out duplicates.
      if (c.id && seen.has(c.id)) return false;
      if (c.id) seen.add(c.id);

      // Keyword-vs-radius conflict fix: when a radius is selected AND the
      // typed location resolved to real coordinates, the query is purely a
      // location anchor — it must NOT also act as a club-name filter,
      // otherwise typing "Manchester" with a 25-mile radius would hide
      // nearby courses in Bolton or Stockport whose names don't contain
      // "Manchester". Fuzzy name matching only applies when no radius is
      // active (pure keyword search for a specific club name).
      const radiusAnchorActive = radiusNum !== null && resolvedLocation != null;
      if (q && !radiusAnchorActive) {
        const hay = `${c.name ?? ""} ${c.location ?? ""}`;
        if (!fuzzyMatch(query, hay)) return false;
      }
      // (3b/3c/3d) Bulletproof radius filtering.
      if (radiusNum !== null && center) {
        // (3a) Convert coordinates safely to numbers.
        const clubLat = Number(c.lat);
        const clubLng = Number(c.lng);

        if (!isNaN(clubLat) && !isNaN(clubLng) && clubLat !== 0 && clubLng !== 0) {
          // (3c) Both user anchor and club coordinates are valid numbers
          // (and not Null Island 0,0): calculate Haversine distance in miles
          // (R = 3958.8) and filter strictly by distanceMiles <= selectedRadius.
          const distanceMiles = haversineMiles(
            center.lat,
            center.lng,
            clubLat,
            clubLng,
          );
          if (distanceMiles > radiusNum) return false;
        } else {
          // (3b) A club has missing/null/NaN/0,0 coordinates. DO NOT exclude
          // it! Fall back to the cached geocode map; if that is also missing
          // or invalid, auto-include the course so it is never hidden from
          // users due to missing coordinates.
          const cached = clubCoordinatesMap[(c.location ?? "").trim()];
          if (
            cached &&
            !isNaN(Number(cached.lat)) &&
            !isNaN(Number(cached.lng)) &&
            Number(cached.lat) !== 0 &&
            Number(cached.lng) !== 0
          ) {
            const distanceMiles = haversineMiles(
              center.lat,
              center.lng,
              Number(cached.lat),
              Number(cached.lng),
            );
            if (distanceMiles > radiusNum) return false;
          }
          // No usable coordinates at all -> auto-include (withinRadius = true).
          return true;
        }
      }

      if (maxPrice !== null) {
        const price = Number(c.price_full_7day_adult) || 0;
        if (price > maxPrice) return false;
      }
      if (activeAmenities.size > 0) {
        const flags = clubAmenities(c);
        for (const key of activeAmenities) {
          if (!flags[key]) return false;
        }
      }
      return true;
    });

    // Detailed diagnostics: log every club that passes the distance and tier
    // filters with its raw tier and computed distance. Compute distance per
    // matched club so the log reflects the value used by the filter.
    const calculateDistance = (
      centerCoords: LatLng | null,
      club: ClubProfile,
    ): number | null => {
      if (!centerCoords) return null;
      const clubLat = Number(club.lat);
      const clubLng = Number(club.lng);
      if (!isNaN(clubLat) && !isNaN(clubLng) && clubLat !== 0 && clubLng !== 0) {
        return haversineMiles(centerCoords.lat, centerCoords.lng, clubLat, clubLng);
      }
      const cached = clubCoordinatesMap[(club.location ?? "").trim()];
      if (
        cached &&
        !isNaN(Number(cached.lat)) &&
        !isNaN(Number(cached.lng)) &&
        Number(cached.lat) !== 0 &&
        Number(cached.lng) !== 0
      ) {
        return haversineMiles(
          centerCoords.lat,
          centerCoords.lng,
          Number(cached.lat),
          Number(cached.lng),
        );
      }
      return null;
    };

    if (filtered.length === 0) {
      console.log(
        "No courses matched within",
        radiusNum,
        "miles of anchor",
        userCenterCoords,
      );
    } else {
      filtered.forEach((c) => {
        const distanceMiles = calculateDistance(userCenterCoords, c);
        console.log(
          "MATCH FOUND:",
          c.name,
          "| Tier:",
          c.tier,
          "| Distance:",
          distanceMiles,
          "miles",
        );
      });
    }

    console.log(
      "Search anchor:",
      userCenterCoords,
      "Selected Radius:",
      radiusNum,
      "Filtered Club count:",
      filtered.length,
    );
    return filtered;
  }, [clubs, activeTier, query, maxPrice, activeAmenities, radius, userCenterCoords, resolvedLocation, clubCoordinatesMap]);

  // Flatten all tiers so a selection made in one tab persists when the user
  // switches tabs and adds clubs from another tier.
  const allClubs = useMemo(
    () => TIER_ORDER.flatMap((t) => grouped[t]),
    [grouped],
  );

  const selectedClubs = useMemo(
    () => allClubs.filter((c) => selectedClubIds.includes(c.id)),
    [allClubs, selectedClubIds],
  );

  function requestTierChange(tier: Tier) {
    setActiveTier(tier);
  }

  const bagTier = activeTier;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <Header
        filledCount={selectedClubs.length}
        onOpenBag={() => void 0}
        onResetConfig={onResetConfig}
        onOpenAdmin={onOpenAdmin}
        onGoHome={onGoHome}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Build your golf package
          </h1>
          <p className="text-stone-500 mt-2 max-w-2xl">
            Clubs are grouped by their auto-calculated membership tier. Add as many clubs as you like
            across tiers — your selections persist as you browse.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] xl:grid-cols-[1fr_24rem] gap-6 lg:gap-8">
          <div className="min-w-0">
            <TierTabs
              activeTier={activeTier}
              onChange={requestTierChange}
              counts={TIER_ORDER.reduce(
                (acc, t) => ({ ...acc, [t]: grouped[t].length }),
                {} as Record<Tier, number>,
              )}
              selectedCount={selectedClubs.length}
            />

            <div className="mt-5 space-y-4">
              <FilterBar
                query={query}
                setQuery={setQuery}
                maxPrice={maxPrice}
                setMaxPrice={setMaxPrice}
                radius={radius}
                setRadius={setRadius}
                activeAmenities={activeAmenities}
                toggleAmenity={(k) =>
                  setActiveAmenities((prev) => {
                    const next = new Set(prev);
                    if (next.has(k)) next.delete(k);
                    else next.add(k);
                    return next;
                  })
                }
                clearAll={() => {
                  setQuery("");
                  setMaxPrice(null);
                  setRadius(null);
                  setActiveAmenities(new Set());
                }}
                resultCount={filteredForActive.length}
                totalCount={(grouped[activeTier] ?? []).length}
                resolvedLocation={resolvedLocation}
                show={showFilters}
                setShow={setShowFilters}
              />
              <div className="flex items-center justify-end">
                <button
                  onClick={fetchClubs}
                  className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition px-3 py-2 rounded-xl hover:bg-stone-100"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6">
              {loading ? (
                <LoadingState />
              ) : error ? (
                <ErrorState message={error} onRetry={fetchClubs} />
              ) : filteredForActive.length === 0 ? (
                <EmptyState query={query} tier={activeTier} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-500">
                  {filteredForActive.map((club) => {
                    const isSelected = selectedClubIds.includes(club.id);
                    return (
                      <ClubCard
                        key={club.id}
                        club={club}
                        tier={activeTier}
                        selected={isSelected}
                        calculatedDistance={distanceMap[club.id] ?? null}
                        onToggle={() =>
                          setSelectedClubIds((prev) =>
                            prev.includes(club.id)
                              ? prev.filter((id) => id !== club.id)
                              : [...prev, club.id],
                          )
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="bg-stone-900 rounded-2xl shadow-2xl overflow-hidden h-[calc(100vh-7rem)] min-h-[32rem]">
                <ShoppingBag
                  activeTier={bagTier}
                  selectedClubs={selectedClubs}
                  client={client}
                  onRemove={(id) =>
                    setSelectedClubIds((prev) => prev.filter((x) => x !== id))
                  }
                  onClear={() => setSelectedClubIds([])}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedClubs.length > 0 && (
        <button
          className="lg:hidden fixed bottom-5 right-5 z-40 bg-stone-900 text-white rounded-full shadow-2xl px-5 py-3.5 flex items-center gap-2.5 animate-scale-in"
        >
          <span className="relative">
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
              {selectedClubs.length}
            </span>
            View package
          </span>
        </button>
      )}
    </div>
  );
}

function Header({
  filledCount,
  onOpenBag,
  onResetConfig,
  onOpenAdmin,
  onGoHome,
}: {
  filledCount: number;
  onOpenBag: () => void;
  onResetConfig: () => void;
  onOpenAdmin: () => void;
  onGoHome?: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 group"
            aria-label="Back to home"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="font-display text-white font-bold text-lg leading-none">N</span>
            </div>
            <div className="text-left">
              <span className="font-display text-lg font-semibold tracking-tight">NeoGolf</span>
              <span className="text-stone-400 text-sm ml-1.5">Package Builder</span>
            </div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition px-3 py-2 rounded-lg hover:bg-stone-100"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          )}
          <button
            onClick={onOpenAdmin}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition px-3 py-2 rounded-lg hover:bg-stone-100"
          >
            <ShieldCheck className="w-4 h-4" />
            Admin Portal
          </button>
          <button
            onClick={onResetConfig}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition px-3 py-2 rounded-lg hover:bg-stone-100"
          >
            <Database className="w-4 h-4" />
            Reconfigure
          </button>
          <button
            onClick={onOpenBag}
            className="lg:hidden inline-flex items-center gap-1.5 text-sm bg-stone-900 text-white px-3.5 py-2 rounded-lg"
          >
            Bag
            {filledCount > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {filledCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function TierTabs({
  activeTier,
  onChange,
  counts,
  selectedCount,
}: {
  activeTier: Tier;
  onChange: (t: Tier) => void;
  counts: Record<Tier, number>;
  selectedCount: number;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
      {TIER_ORDER.map((tier) => {
        const theme = TIER_THEMES[tier];
        const active = activeTier === tier;
        return (
          <button
            key={tier}
            onClick={() => onChange(tier)}
            className={`relative flex-shrink-0 px-4 sm:px-5 py-3 rounded-xl text-sm font-medium transition-all border ${
              active
                ? `bg-white border-stone-200 shadow-sm ${theme.text}`
                : "bg-white/50 border-transparent text-stone-500 hover:bg-white hover:text-stone-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
              <span>{theme.label}</span>
              <span className="text-xs text-stone-400 tabular-nums">{counts[tier]}</span>
              {active && selectedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold leading-none">
                  {selectedCount}
                </span>
              )}
            </div>
            <span className="block text-[10px] text-stone-400 mt-0.5 font-normal">{theme.range}</span>
          </button>
        );
      })}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <article
          key={i}
          className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
          <div className="p-5 flex flex-col flex-1 gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-20 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
                <div className="h-5 w-3/4 rounded-md bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
                <div className="h-3 w-1/2 rounded-md bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
              </div>
              <div className="h-7 w-16 rounded-full bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse flex-shrink-0" />
            </div>
            <div className="grid grid-cols-2 gap-3 py-3 border-y border-stone-100">
              {[0, 1].map((j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-2.5 w-16 rounded bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
                </div>
              ))}
            </div>
            <div className="mt-2 pt-1 flex-1 flex flex-col justify-end">
              <div className="h-10 w-full rounded-xl bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-rose-500" />
      </div>
      <h3 className="font-semibold text-rose-900">Couldn&apos;t load clubs</h3>
      <p className="text-sm text-rose-600 mt-1 max-w-md mx-auto">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition"
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </div>
  );
}

function EmptyState({ query, tier }: { query: string; tier: Tier }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
        <Search className="w-6 h-6 text-stone-400" />
      </div>
      <h3 className="font-semibold text-stone-800">
        {query ? "No clubs match your search" : `No clubs in ${tier} yet`}
      </h3>
      <p className="text-sm text-stone-500 mt-1">
        {query ? "Try a different search term." : "Clubs in this tier will appear here."}
      </p>
    </div>
  );
}

function clubAmenities(c: ClubProfile): Record<AmenityKey, boolean> {
  const price = Number(c.price_full_7day_adult) || 0;
  const levy = Number(c.clubhouse_bar_levy) || 0;
  const members = Number(c.total_member_count) || 0;
  return {
    dining: levy > 0,
    buggies: price >= 700,
    gym: price >= 1200,
    storage: members > 0,
  };
}

type FilterBarProps = {
  query: string;
  setQuery: (v: string) => void;
  maxPrice: number | null;
  setMaxPrice: (v: number | null) => void;
  radius: RadiusOption;
  setRadius: (v: RadiusOption) => void;
  activeAmenities: Set<AmenityKey>;
  toggleAmenity: (k: AmenityKey) => void;
  clearAll: () => void;
  resultCount: number;
  totalCount: number;
  resolvedLocation: ResolvedLocation | null;
  show: boolean;
  setShow: (v: boolean) => void;
};

function FilterBar({
  query,
  setQuery,
  maxPrice,
  setMaxPrice,
  radius,
  setRadius,
  activeAmenities,
  toggleAmenity,
  clearAll,
  resultCount,
  totalCount,
  resolvedLocation,
  show,
  setShow,
}: FilterBarProps) {
  const priceCap = 3000;
  const hasFilters = query.trim() !== "" || maxPrice !== null || radius !== null || activeAmenities.size > 0;
  return (
    <div className="bg-white/80 backdrop-blur-md border border-stone-200 rounded-2xl shadow-sm shadow-stone-900/5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-stone-800">Filters</span>
          <span className="text-xs text-stone-400 tabular-nums">
            {resultCount} of {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-emerald-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <button
            onClick={() => setShow(!show)}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-emerald-600 transition-colors"
          >
            {show ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <div
        className={`grid transition-all duration-300 ease-out ${
          show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 sm:px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1.5">
                  Location or club
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Town, city or club name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200"
                  />
                </div>
                {resolvedLocation && query.trim().length >= 3 && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-top-1 duration-300">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>Radius center: {resolvedLocation.displayName}</span>
                  </div>
                )}
              </div>
              <div className="md:col-span-1">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-1.5">
                  Distance radius
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={radius === null ? "any" : String(radius)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRadius(v === "any" ? null : Number(v));
                    }}
                    className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {RADIUS_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value === null ? "any" : String(opt.value)}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="md:col-span-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400">
                    Maximum 7-day adult price
                  </label>
                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                    {maxPrice === null ? "Any" : formatGBP(maxPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={priceCap}
                    step={50}
                    value={maxPrice ?? priceCap}
                    onChange={(e) => setMaxPrice(Number(e.target.value) >= priceCap ? null : Number(e.target.value))}
                    className="flex-1 accent-emerald-600 cursor-pointer"
                  />
                  <button
                    onClick={() => setMaxPrice(null)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${
                      maxPrice === null
                        ? "text-stone-400"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    Any
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-stone-400 mb-2">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map(({ key, label, icon: Icon, hint }) => {
                  const active = activeAmenities.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleAmenity(key)}
                      title={hint}
                      aria-pressed={active}
                      className={`group inline-flex items-center gap-2 pl-3 pr-3 py-2 rounded-full text-sm font-medium border transition-all duration-300 ${
                        active
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/30"
                          : "bg-white text-stone-600 border-stone-200 hover:border-emerald-300 hover:text-emerald-700"
                      }`}
                    >
                      <Icon className={`w-4 h-4 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                      <span>{label}</span>
                      <span
                        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-300 ${
                          active ? "bg-white/30" : "bg-stone-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-300 ${
                            active ? "translate-x-3.5" : "translate-x-0.5"
                          }`}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
