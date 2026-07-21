import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Database, Search, AlertTriangle, ShieldCheck, Home, SlidersHorizontal, X, Car, UtensilsCrossed, Dumbbell, Warehouse, MapPin } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClubProfile, Tier } from "../types";
import { TIER_ORDER } from "../types";
import { TIER_THEMES, formatGBP } from "../lib/tiers";
import ClubCard from "./ClubCard";
import ShoppingBag from "./ShoppingBag";
import { fetchCoordinates, haversineMiles, type LatLng } from "../lib/geo";

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

// Four distinct Premium clubs with stable, unique IDs. Sourced directly so the
// Premium tab always renders exactly these cards independent of DB state.
const PREMIUM_CLONES: ClubProfile[] = [
  {
    id: "rb-clone-1",
    created_at: null,
    name: "Royal Birkdale Clone (North)",
    location: "Southport, England",
    joining_fee_7day: 1450,
    joining_fee_5day: 1180,
    clubhouse_bar_levy: 150,
    year: 2025,
    total_historic_revenue: 250000,
    total_member_count: 320,
    price_under_12: 120,
    price_junior_12_18: 240,
    price_colt_21: 360,
    price_intermediate_25: 520,
    price_intermediate_28: 640,
    price_intermediate_31_35: 760,
    price_full_7day_adult: 1450,
    price_5day_adult: 1180,
    price_country_member: 700,
    price_student: 420,
    tier: "Premium",
  },
  {
    id: "rb-clone-2",
    created_at: null,
    name: "Royal Birkdale Clone (South)",
    location: "Southport, England",
    joining_fee_7day: 1520,
    joining_fee_5day: 1240,
    clubhouse_bar_levy: 160,
    year: 2025,
    total_historic_revenue: 265000,
    total_member_count: 335,
    price_under_12: 125,
    price_junior_12_18: 250,
    price_colt_21: 380,
    price_intermediate_25: 540,
    price_intermediate_28: 670,
    price_intermediate_31_35: 790,
    price_full_7day_adult: 1520,
    price_5day_adult: 1240,
    price_country_member: 720,
    price_student: 430,
    tier: "Premium",
  },
  {
    id: "rb-clone-3",
    created_at: null,
    name: "Royal Birkdale Clone (Links)",
    location: "Merseyside, England",
    joining_fee_7day: 1680,
    joining_fee_5day: 1380,
    clubhouse_bar_levy: 175,
    year: 2025,
    total_historic_revenue: 290000,
    total_member_count: 360,
    price_under_12: 135,
    price_junior_12_18: 270,
    price_colt_21: 410,
    price_intermediate_25: 580,
    price_intermediate_28: 720,
    price_intermediate_31_35: 850,
    price_full_7day_adult: 1680,
    price_5day_adult: 1380,
    price_country_member: 760,
    price_student: 460,
    tier: "Premium",
  },
  {
    id: "rb-clone-4",
    created_at: null,
    name: "Royal Birkdale Clone (Championship)",
    location: "Ainsdale, England",
    joining_fee_7day: 1890,
    joining_fee_5day: 1560,
    clubhouse_bar_levy: 195,
    year: 2025,
    total_historic_revenue: 320000,
    total_member_count: 390,
    price_under_12: 150,
    price_junior_12_18: 300,
    price_colt_21: 450,
    price_intermediate_25: 640,
    price_intermediate_28: 790,
    price_intermediate_31_35: 930,
    price_full_7day_adult: 1890,
    price_5day_adult: 1560,
    price_country_member: 820,
    price_student: 500,
    tier: "Premium",
  },
];

const FALLBACK_CLUBS: ClubProfile[] = [
  {
    id: "demo-birkdale",
    created_at: null,
    name: "Royal Birkdale Clone",
    location: "Merseyside",
    joining_fee_7day: 500,
    joining_fee_5day: null,
    clubhouse_bar_levy: 150,
    year: null,
    total_historic_revenue: null,
    total_member_count: null,
    price_under_12: 150,
    price_junior_12_18: 300,
    price_colt_21: 950,
    price_intermediate_25: 1400,
    price_intermediate_28: 1800,
    price_intermediate_31_35: 2100,
    price_full_7day_adult: 2500,
    price_5day_adult: null,
    price_country_member: null,
    price_student: 650,
    tier: "Luxury",
  },
  {
    id: "demo-greenfield",
    created_at: null,
    name: "Greenfield Links",
    location: "Leeds",
    joining_fee_7day: 150,
    joining_fee_5day: null,
    clubhouse_bar_levy: 50,
    year: null,
    total_historic_revenue: null,
    total_member_count: null,
    price_under_12: 50,
    price_junior_12_18: 100,
    price_colt_21: 420,
    price_intermediate_25: 600,
    price_intermediate_28: 750,
    price_intermediate_31_35: 850,
    price_full_7day_adult: 950,
    price_5day_adult: null,
    price_country_member: null,
    price_student: 380,
    tier: "Mid-tier",
  },
];

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
  // Persistent lookup cache: maps a club location string to its dynamically
  // resolved Nominatim coordinates. Each unique location is fetched at most
  // once to prevent duplicate network calls.
  const [clubCoordinatesMap, setClubCoordinatesMap] = useState<Record<string, LatLng>>({});
  const [showFilters, setShowFilters] = useState(true);

  // Debounced dynamic geocoding of the typed location via OpenStreetMap
  // Nominatim. Fires 400ms after the user stops typing and stores the resolved
  // UK coordinate as the radius filter's center anchor.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setUserCenterCoords(null);
      return;
    }
    const handle = setTimeout(() => {
      let cancelled = false;
      fetchCoordinates(q).then((coords) => {
        if (!cancelled) setUserCenterCoords(coords);
      });
      return () => {
        cancelled = true;
      };
    }, 400);
    return () => clearTimeout(handle);
  }, [query]);

  // Sequential async club geocoding. Fires immediately after clubs load and
  // iterates through every unique `club.location` string, fetching exact UK
  // coordinates from Nominatim. Results are stored in `clubCoordinatesMap` so
  // repeated locations are read from cache instead of re-fetched.
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
      if (!cancelled && Object.keys(updates).length > 0) {
        setClubCoordinatesMap((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clubs, clubCoordinatesMap]);

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
      setClubs(fetched.length > 0 ? fetched : FALLBACK_CLUBS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clubs");
      setClubs(FALLBACK_CLUBS);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Group clubs by tier. Premium is always sourced from PREMIUM_CLONES so the
  // four stable-id cards render regardless of DB contents. Other tiers come
  // from Supabase (deduped by club.id so multi-year demographics don't fan out
  // into duplicate cards sharing one id).
  const grouped = useMemo(() => {
    const map: Record<Tier, ClubProfile[]> = {
      Budget: [],
      "Mid-tier": [],
      Premium: PREMIUM_CLONES,
      Luxury: [],
    };
    const seen = new Set<string>();
    for (const c of clubs) {
      if (!c.tier || !(TIER_ORDER as string[]).includes(c.tier)) continue;
      if (c.tier === "Premium") continue; // Premium handled by PREMIUM_CLONES
      if (c.id && seen.has(c.id)) continue;
      if (c.id) seen.add(c.id);
      map[c.tier].push(c);
    }
    return map;
  }, [clubs]);

  // Unified distance map. Both the user's typed location and each club's
  // location are resolved dynamically via Nominatim, then compared with the
  // shared Haversine formula. Clubs whose coordinates are still pending or
  // failed to resolve are stored as null (the filter auto-includes them).
  const distanceMap = useMemo(() => {
    const map: Record<string, number | null> = {};
    if (!userCenterCoords) return map;
    for (const c of clubs) {
      const clubCoords =
        c.lat != null && c.lng != null
          ? { lat: c.lat, lng: c.lng }
          : clubCoordinatesMap[(c.location ?? "").trim()] ?? null;
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

  // Count how many clubs have resolved coordinates (stored or dynamic cache).
  const resolvedCount = useMemo(() => {
    let count = 0;
    for (const c of clubs) {
      if (c.lat != null && c.lng != null) {
        count++;
        continue;
      }
      if (c.location && clubCoordinatesMap[(c.location ?? "").trim()]) count++;
    }
    return count;
  }, [clubs, clubCoordinatesMap]);

  const filteredForActive = useMemo(() => {
    const list = grouped[activeTier] ?? [];
    const q = query.trim().toLowerCase();

    // The radius filter's center anchor is always the dynamically geocoded
    // coordinate from Nominatim for the user's typed location.
    const center: LatLng | null = radius !== null ? userCenterCoords : null;

    return list.filter((c) => {
      if (q) {
        const hay = `${c.name ?? ""} ${c.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (radius !== null && center) {
        // Unified Haversine comparison: both sides resolved dynamically.
        const clubCoords =
          c.lat != null && c.lng != null
            ? { lat: c.lat, lng: c.lng }
            : clubCoordinatesMap[(c.location ?? "").trim()] ?? null;
        // Auto-include on API failures: if Nominatim is rate-limited or hasn't
        // returned coordinates for this club yet, pass it through as true so
        // the user never sees a blank screen due to network limits.
        if (!clubCoords) return true;
        const dist = haversineMiles(
          center.lat,
          center.lng,
          clubCoords.lat,
          clubCoords.lng,
        );
        if (dist > radius) return false;
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
  }, [grouped, activeTier, query, maxPrice, activeAmenities, radius, userCenterCoords, clubCoordinatesMap]);

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
