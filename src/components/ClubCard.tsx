import { useState } from "react";
import { Check, MapPin, Users, Calendar, TrendingUp, CheckCircle2, ChevronDown } from "lucide-react";
import type { ClubProfile, Tier } from "../types";
import { TIER_THEMES, formatGBP, formatNumber } from "../lib/tiers";

type Props = {
  club: ClubProfile;
  tier: Tier;
  selected: boolean;
  onToggle: (club: ClubProfile) => void;
  calculatedDistance?: number | null;
};

export default function ClubCard({ club, tier, selected, onToggle, calculatedDistance }: Props) {
  const theme = TIER_THEMES[tier];
  const adultPrice = club.price_full_7day_adult;
  const [showMap, setShowMap] = useState(false);

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden animate-fade-in-up hover:-translate-y-1 hover:shadow-xl ${
        selected
          ? `border-transparent ring-2 ${theme.ring} shadow-xl ${theme.glow} ring-offset-2 ring-offset-emerald-50`
          : "border-stone-200 hover:border-stone-300"
      }`}
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${theme.gradient.replace("from-", "from-").replace("/10", "/80").replace("/5", "/40")} ${theme.badge}`} />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${theme.accentSoft}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} />
                {theme.label}
              </span>
              {club.year && (
                <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                  <Calendar className="w-3 h-3" />
                  {club.year}
                </span>
              )}
            </div>
            <h3 className="font-display text-lg font-semibold text-stone-900 leading-tight truncate">
              {club.name ?? "Unnamed club"}
            </h3>
            {club.location && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setShowMap((v) => !v)}
                  aria-expanded={showMap}
                  className="flex items-center gap-1 text-sm text-stone-500 hover:text-emerald-600 hover:underline transition-colors duration-200 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{club.location}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${showMap ? "rotate-180" : ""}`}
                  />
                  <span className="text-[11px] text-stone-400 no-underline">{showMap ? "Hide map" : "Click to view map"}</span>
                </button>
                {showMap && (
                  <div className="w-full mt-2 rounded-lg border border-slate-200 shadow-inner overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                    <iframe
                      title={`Map of ${club.name}`}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(`${club.name} ${club.location || ""}`)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      loading="lazy"
                      allowFullScreen
                      className="w-full h-48 border-0"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <a
                      href={`https://maps.google.com/maps?q=${encodeURIComponent(`${club.name} ${club.location || ""}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border-t border-slate-200"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => onToggle(club)}
            aria-pressed={selected}
            className={`flex-shrink-0 w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
              selected
                ? `${theme.badge} border-transparent text-white`
                : "border-stone-300 text-transparent hover:border-stone-400"
            }`}
          >
            {selected ? <Check className="w-5 h-5" strokeWidth={3} /> : <Check className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-baseline gap-2 mb-4 pb-4 border-b border-stone-100">
          <span className="font-display text-2xl font-bold text-stone-900 tabular-nums">
            {formatGBP(adultPrice)}
          </span>
          <span className="text-xs text-stone-500">7-day adult membership</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <Stat
            icon={<TrendingUp className="w-3.5 h-3.5" />}
            label="Historic revenue"
            value={formatGBP(club.total_historic_revenue)}
          />
          <Stat
            icon={<Users className="w-3.5 h-3.5" />}
            label="Members"
            value={formatNumber(club.total_member_count)}
          />
          <Stat
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="5-day joining"
            value={formatGBP(club.joining_fee_5day)}
          />
          <Stat
            icon={<Calendar className="w-3.5 h-3.5" />}
            label="Bar levy"
            value={formatGBP(club.clubhouse_bar_levy)}
          />
        </div>

        <button
          onClick={() => onToggle(club)}
          className={`mt-5 w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            selected
              ? "bg-stone-900 text-white hover:bg-stone-800"
              : `${theme.accentSoft} hover:opacity-80`
          }`}
        >
          {selected ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Selected in {theme.label}
            </>
          ) : (
            `Add to ${theme.label} bag`
          )}
        </button>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-stone-400">{icon}{label}</span>
      <span className="font-semibold text-stone-800 tabular-nums">{value}</span>
    </div>
  );
}
