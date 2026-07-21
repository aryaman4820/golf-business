import type { Tier } from "../types";

export type TierTheme = {
  label: Tier;
  short: string;
  range: string;
  accent: string;
  accentSoft: string;
  text: string;
  border: string;
  ring: string;
  gradient: string;
  badge: string;
  glow: string;
  dot: string;
};

export const TIER_THEMES: Record<Tier, TierTheme> = {
  Budget: {
    label: "Budget",
    short: "Value picks",
    range: "Up to £700",
    accent: "emerald",
    accentSoft: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
    border: "border-emerald-200",
    ring: "ring-emerald-400",
    gradient: "from-emerald-500/10 to-teal-500/5",
    badge: "bg-emerald-500",
    glow: "shadow-emerald-500/20",
    dot: "bg-emerald-500",
  },
  "Mid-tier": {
    label: "Mid-tier",
    short: "Balanced play",
    range: "£701 – £1,200",
    accent: "sky",
    accentSoft: "bg-sky-100 text-sky-700",
    text: "text-sky-700",
    border: "border-sky-200",
    ring: "ring-sky-400",
    gradient: "from-sky-500/10 to-cyan-500/5",
    badge: "bg-sky-500",
    glow: "shadow-sky-500/20",
    dot: "bg-sky-500",
  },
  Premium: {
    label: "Premium",
    short: "Refined clubs",
    range: "£1,201 – £2,000",
    accent: "amber",
    accentSoft: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
    border: "border-amber-200",
    ring: "ring-amber-400",
    gradient: "from-amber-500/10 to-orange-500/5",
    badge: "bg-amber-500",
    glow: "shadow-amber-500/20",
    dot: "bg-amber-500",
  },
  Luxury: {
    label: "Luxury",
    short: "The pinnacle",
    range: "£2,000 and above",
    accent: "rose",
    accentSoft: "bg-rose-100 text-rose-700",
    text: "text-rose-700",
    border: "border-rose-200",
    ring: "ring-rose-400",
    gradient: "from-rose-500/10 to-pink-500/5",
    badge: "bg-rose-500",
    glow: "shadow-rose-500/20",
    dot: "bg-rose-500",
  },
};

export function formatGBP(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB").format(Number(value));
}
