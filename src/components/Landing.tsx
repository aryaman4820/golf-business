import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MapPin,
  Search,
  ArrowRight,
  Lock,
  Loader2,
} from "lucide-react";
import type { ClubProfile, Tier } from "../types";
import { TIER_THEMES, formatGBP } from "../lib/tiers";

type Props = {
  client: SupabaseClient;
  onBuildPackage: () => void;
  onViewInBuilder: (tier: Tier) => void;
  onOpenAdmin: () => void;
};

type Slide = {
  id: number;
  image: string;
  eyebrow: string;
  headline: string;
  narrative: string;
  cta: string;
  align: "center" | "lower-left";
};

const SLIDES: Slide[] = [
  {
    id: 1,
    image:
      "https://images.pexels.com/photos/280207/pexels-photo-280207.jpeg?auto=compress&cs=tinysrgb&w=2000",
    eyebrow: "The Premium Network",
    headline: "The Endless Fairway",
    narrative:
      "Traditional memberships restrict you to a single course. Break the routine. Access a premium network of multi-course experiences across the North West for essentially the same price as a standard single club membership.",
    cta: "Explore the Network",
    align: "lower-left",
  },
  {
    id: 2,
    image:
      "https://images.pexels.com/photos/2469685/pexels-photo-2469685.jpeg?auto=compress&cs=tinysrgb&w=2000",
    eyebrow: "Academic & Youth Excellence",
    headline: "The Next Generation of Golf",
    narrative:
      "Tailored memberships for students and young professionals. Unlock cheaper graduated demographic brackets and seamless .ac.uk confirmation verification built for the modern player.",
    cta: "Discover Student Rates",
    align: "center",
  },
  {
    id: 3,
    image:
      "https://images.pexels.com/photos/460179/pexels-photo-460179.jpeg?auto=compress&cs=tinysrgb&w=2000",
    eyebrow: "Partner Course Integration",
    headline: "A Network Built on Prestige",
    narrative:
      "Leveraging survey data, multi-course access is the ultimate incentive. Our weighted historical average equation ensures golf clubs maximize revenue while you gain unparalleled regional versatility.",
    cta: "Build Your Package",
    align: "lower-left",
  },
];

export default function Landing({
  client,
  onBuildPackage,
  onViewInBuilder,
  onOpenAdmin,
}: Props) {
  const [clubs, setClubs] = useState<ClubProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await client
          .from("clubs")
          .select("*")
          .order("name", { ascending: true });
        if (cancelled) return;
        if (error) throw error;
        setClubs((data as ClubProfile[]) ?? []);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load clubs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clubs;
    return clubs.filter((c) => {
      const name = (c.name ?? "").toLowerCase();
      const loc = (c.location ?? "").toLowerCase();
      return name.includes(q) || loc.includes(q);
    });
  }, [clubs, query]);

  return (
    <div className="min-h-screen bg-stone-50">
      <Carousel slides={SLIDES} onBuildPackage={onBuildPackage} onOpenAdmin={onOpenAdmin} />
      <SearchSection
        query={query}
        setQuery={setQuery}
        filteredCount={filtered.length}
        loading={loading}
      />
      <CourseGrid
        clubs={filtered}
        loading={loading}
        error={error}
        onViewInBuilder={onViewInBuilder}
      />
      <Footer />
    </div>
  );
}

function Carousel({
  slides,
  onBuildPackage,
  onOpenAdmin,
}: {
  slides: Slide[];
  onBuildPackage: () => void;
  onOpenAdmin: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-stone-950">
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== index}
        >
          <div
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url("${slide.image}")` }}
          />
          {/* Gradient fallback + legibility scrim */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/70 via-stone-950/40 to-stone-950/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-stone-950/30" />
        </div>
      ))}

      {/* Sticky nav overlay */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-emerald-950/85 backdrop-blur-xl border-b border-emerald-900/40 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-500 ${
                scrolled
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
                  : "bg-white/10 backdrop-blur-md border border-white/30"
              }`}
            >
              <span className="font-display text-white font-bold text-lg leading-none">N</span>
            </div>
            <span className="font-display text-2xl font-medium tracking-tight text-white">
              NeoGolf
            </span>
          </div>
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onBuildPackage}
              className="text-sm text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition"
            >
              Package Builder
            </button>
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-950 bg-white hover:bg-emerald-50 px-3.5 py-2 rounded-full transition shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              Admin Portal
            </button>
          </nav>
        </div>
      </header>

      {/* Slide content */}
      <div className="relative z-10 h-full flex items-end">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 sm:pb-32">
          {slides.map((slide, i) => {
            const active = i === index;
            return (
              <div
                key={slide.id}
                className={`${
                  active ? "block" : "hidden"
                } ${slide.align === "center" ? "text-center mx-auto max-w-2xl" : "max-w-2xl"}`}
                aria-hidden={!active}
              >
                <div
                  className={`glass-cta rounded-3xl backdrop-blur-md bg-white/10 border border-white/25 p-6 sm:p-8 transition-all duration-700 ${
                    active ? "opacity-100 translate-y-0 animate-fade-in-up" : "opacity-0 translate-y-4"
                  }`}
                >
                  <p
                    className={`text-xs sm:text-sm font-medium tracking-[0.25em] uppercase text-emerald-300 mb-4 transition-all duration-700 ${
                      active ? "opacity-100 translate-y-0 animate-fade-in-up" : "opacity-0 translate-y-2"
                    }`}
                    style={{ transitionDelay: active ? "120ms" : "0ms" }}
                  >
                    {slide.eyebrow}
                  </p>
                  <h1
                    className={`font-display text-4xl sm:text-6xl lg:text-7xl font-light text-white leading-[1.05] tracking-tight transition-all duration-700 ${
                      active ? "opacity-100 translate-y-0 animate-fade-in-up" : "opacity-0 translate-y-3"
                    }`}
                    style={{ transitionDelay: active ? "260ms" : "0ms" }}
                  >
                    {slide.headline}
                  </h1>
                  <p
                    className={`mt-5 text-base sm:text-lg text-white/80 leading-relaxed max-w-xl transition-all duration-700 ${
                      active ? "opacity-100 translate-y-0 animate-fade-in-up" : "opacity-0 translate-y-2"
                    }`}
                    style={{ transitionDelay: active ? "420ms" : "0ms" }}
                  >
                    {slide.narrative}
                  </p>
                  <button
                    onClick={onBuildPackage}
                    className="group mt-8 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-7 py-3.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5"
                  >
                    {slide.cta}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dash indicators */}
      <div className="absolute bottom-6 inset-x-0 z-20 flex justify-center gap-3">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-0.5 transition-all duration-500 ${
              i === index ? "w-10 bg-white" : "w-6 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

function SearchSection({
  query,
  setQuery,
  filteredCount,
  loading,
}: {
  query: string;
  setQuery: (v: string) => void;
  filteredCount: number;
  loading: boolean;
}) {
  return (
    <section id="courses" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-10">
      <div className="bg-white rounded-2xl shadow-xl shadow-stone-900/5 border border-stone-200 p-4 sm:p-5">
        <div className="relative">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by club name or location — try “Lancashire” or “Cheshire”"
            className="w-full pl-12 pr-4 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-sm px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <Search className="w-4 h-4 text-stone-400" />
        <span className="text-stone-500">
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading partner courses…
            </span>
          ) : (
            <>
              Showing{" "}
              <span
                className="font-semibold text-stone-900 tabular-nums animate-cross-fade"
                key={filteredCount}
              >
                {filteredCount}
              </span>{" "}
              partner course{filteredCount === 1 ? "" : "s"} matching your criteria.
            </>
          )}
        </span>
      </div>
    </section>
  );
}

function CourseGrid({
  clubs,
  loading,
  error,
  onViewInBuilder,
}: {
  clubs: ClubProfile[];
  loading: boolean;
  error: string | null;
  onViewInBuilder: (tier: Tier) => void;
}) {
  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <article
              key={i}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden flex flex-col"
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
      </section>
    );
  }
  if (error) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl py-8">
          {error}
        </div>
      </section>
    );
  }
  if (clubs.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center text-stone-500 bg-white border border-stone-200 rounded-xl py-12">
          No partner courses match your search. Try a different region or club name.
        </div>
      </section>
    );
  }
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {clubs.map((club) => (
          <PreviewCard key={club.id} club={club} onViewInBuilder={onViewInBuilder} />
        ))}
      </div>
    </section>
  );
}

function PreviewCard({
  club,
  onViewInBuilder,
}: {
  club: ClubProfile;
  onViewInBuilder: (tier: Tier) => void;
}) {
  const tier = (club.tier ?? "Mid-tier") as Tier;
  const theme = TIER_THEMES[tier];
  return (
    <article className="group bg-white rounded-2xl border border-stone-200 hover:border-stone-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-900/10 transition-all duration-300 overflow-hidden flex flex-col">
      <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-stone-900 truncate">
              {club.name ?? "Unnamed club"}
            </h3>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${club.name} ${club.location}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-emerald-600 hover:underline transition-colors duration-200 cursor-pointer mt-0.5"
            >
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{club.location ?? "—"}</span>
            </a>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white ${theme.badge} flex-shrink-0`}
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-white/80`} />
            {theme.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 py-3 border-y border-stone-100">
          <Fee label="Joining fee" value={formatGBP(club.joining_fee_7day)} />
          <Fee label="Bar levy" value={formatGBP(club.clubhouse_bar_levy)} />
        </div>

        <div className="mt-4 pt-1 flex-1 flex flex-col justify-end">
          <button
            onClick={() => onViewInBuilder(tier)}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-900 hover:text-white px-4 py-2.5 rounded-xl transition group/btn"
          >
            View in Builder
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function Fee({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-stone-400">{label}</div>
      <div className="text-sm font-semibold text-stone-800 tabular-nums">{value}</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <span className="font-display text-emerald-950 font-bold text-sm leading-none">N</span>
          </div>
          <span className="font-display text-white font-medium text-lg">NeoGolf</span>
        </div>
        <p className="text-xs text-stone-500">
          One subscription. A network of premium courses across the North West.
        </p>
      </div>
    </footer>
  );
}
