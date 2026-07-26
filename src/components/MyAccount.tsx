import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Trophy,
  ShieldCheck,
  MapPin,
  Loader2,
  AlertCircle,
  CreditCard,
  CalendarRange,
  Repeat,
  GraduationCap,
  Layers,
  PoundSterling,
  Award,
  ArrowRight,
} from "lucide-react";
import type { ClubProfile, Tier } from "../types";
import { TIER_THEMES, formatGBP } from "../lib/tiers";
import { INCLUDED_COURSES } from "../lib/pricing";

type Props = {
  client: SupabaseClient;
  membershipPassUuid: string;
  onGoHome: () => void;
  onBuildPackage: () => void;
};

type MembershipRow = {
  membership_pass_uuid: string;
  customer_name: string;
  customer_email: string;
  customer_age: number;
  customer_phone: string | null;
  selected_club_ids: string[];
  tier_classification: Tier | null;
  payment_spread_type: "annually" | "monthly" | null;
  student_verified: boolean | null;
  package_subscription_subtotal: number;
  static_fees_total: number;
  grand_total: number;
  status: string;
  created_at: string;
};

export default function MyAccount({ client, membershipPassUuid, onGoHome, onBuildPackage }: Props) {
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [clubs, setClubs] = useState<ClubProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!membershipPassUuid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: memError } = await client
          .from("user_memberships")
          .select(
            "membership_pass_uuid, customer_name, customer_email, customer_age, customer_phone, selected_club_ids, tier_classification, payment_spread_type, student_verified, package_subscription_subtotal, static_fees_total, grand_total, status, created_at",
          )
          .eq("membership_pass_uuid", membershipPassUuid)
          .maybeSingle();

        if (cancelled) return;
        if (memError) throw memError;
        if (!data) {
          setError("We couldn't find your membership record.");
          return;
        }

        const row = data as MembershipRow;
        setMembership(row);

        const clubIds = row.selected_club_ids ?? [];
        if (clubIds.length > 0) {
          const { data: clubData, error: clubError } = await client
            .from("clubs")
            .select("*")
            .in("id", clubIds);
          if (cancelled) return;
          if (clubError) throw clubError;
          const fetched = (clubData as ClubProfile[]) ?? [];
          const byId = new Map(fetched.map((c) => [c.id, c]));
          setClubs(clubIds.map((id) => byId.get(id)).filter(Boolean) as ClubProfile[]);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load your account.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, membershipPassUuid]);

  if (!membershipPassUuid) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <span className="font-display text-white font-bold text-lg leading-none">N</span>
              </div>
              <span className="font-display text-xl font-medium tracking-tight text-stone-900">
                My Account
              </span>
            </div>
            <button
              onClick={onGoHome}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 px-3.5 py-2 rounded-lg hover:bg-stone-100 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </button>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center animate-fade-in-up">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Award className="w-9 h-9 text-emerald-600" />
              </div>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-light text-stone-900 leading-tight">
              You haven't activated a NeoGolf Membership yet.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-stone-500 leading-relaxed max-w-md mx-auto">
              Bundle multi-course playing rights across the North West's premium golf network. One subscription, unlimited fairways — build your custom package and unlock your digital club pass today.
            </p>
            <button
              onClick={onBuildPackage}
              className="group mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium px-7 py-3.5 rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5"
            >
              Build Your Package Now
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error || !membership) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-stone-900">
            {error ?? "Membership not found"}
          </h2>
          <button
            onClick={onGoHome}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 px-4 py-2.5 rounded-xl transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const tier: Tier = membership.tier_classification ?? "Mid-tier";
  const theme = TIER_THEMES[tier];
  const spread = membership.payment_spread_type ?? "annually";
  const monthlyAmount = membership.package_subscription_subtotal / 12;
  const clubCount = clubs.length;
  const extraCourseCount = Math.max(0, clubCount - INCLUDED_COURSES);
  const extraCourseFeePer: Record<Tier, number> = {
    Budget: 50,
    "Mid-tier": 100,
    Premium: 200,
    Luxury: 400,
  };
  const totalExtraCourseFees = extraCourseCount * extraCourseFeePer[tier];
  const slotsFilled = Math.min(clubCount, INCLUDED_COURSES);
  const studentVerified = Boolean(membership.student_verified);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <span className="font-display text-white font-bold text-lg leading-none">N</span>
            </div>
            <span className="font-display text-xl font-medium tracking-tight text-stone-900">
              My Account
            </span>
          </div>
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 px-3.5 py-2 rounded-lg hover:bg-stone-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Greeting */}
        <div className="animate-fade-in-up">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
            Welcome back
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-light text-stone-900 mt-1">
            {membership.customer_name}
          </h1>
          <p className="text-sm text-stone-500 mt-1.5">
            Your NeoGolf membership is active. Here's everything about your digital access pass.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Digital Club Pass */}
          <section className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
            <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">
              Digital Club Pass
            </h2>
            <DigitalPass
              membership={membership}
              tier={tier}
              theme={theme}
              clubCount={clubCount}
              studentVerified={studentVerified}
            />
          </section>

          {/* Member details */}
          <section className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: "160ms" }}>
            <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">
              Member details
            </h2>
            <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3.5 shadow-sm">
              <DetailRow label="Member ID" value={membership.membership_pass_uuid.toUpperCase()} mono />
              <DetailRow label="Email" value={membership.customer_email} />
              {membership.customer_phone && (
                <DetailRow label="Phone" value={membership.customer_phone} />
              )}
              <DetailRow label="Age bracket" value={`${membership.customer_age} years`} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">Student status</span>
                {studentVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    .ac.uk verified
                  </span>
                ) : (
                  <span className="text-xs font-medium text-stone-400">Standard</span>
                )}
              </div>
              <DetailRow label="Member since" value={new Date(membership.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
            </div>
          </section>
        </div>

        {/* Financial & Bundle Management Hub */}
        <section className="animate-fade-in-up" style={{ animationDelay: "240ms" }}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">
            Financial &amp; bundle management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Payment spread breakdown */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                {spread === "monthly" ? (
                  <Repeat className="w-4 h-4 text-emerald-600" />
                ) : (
                  <CalendarRange className="w-4 h-4 text-emerald-600" />
                )}
                <h3 className="font-display text-sm font-semibold text-stone-900">
                  {spread === "monthly" ? "Monthly Direct Debit" : "Annual Payment"}
                </h3>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Annual subscription</span>
                  <span className="tabular-nums font-medium text-stone-800">
                    {formatGBP(membership.package_subscription_subtotal)}
                  </span>
                </div>
                {spread === "monthly" && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Monthly instalment (12 ×)</span>
                    <span className="tabular-nums font-semibold text-emerald-700">
                      {formatGBP(monthlyAmount)}/mo
                    </span>
                  </div>
                )}
                {extraCourseCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">
                      Surcharge ({extraCourseCount} extra × {formatGBP(extraCourseFeePer[tier])})
                    </span>
                    <span className="tabular-nums font-medium text-amber-700">
                      +{formatGBP(totalExtraCourseFees)}
                    </span>
                  </div>
                )}
              </div>

              <div className="h-px bg-stone-100 my-3.5" />

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-stone-400">Due Upfront Today</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Joining fees + bar levies
                  </p>
                </div>
                <span className="tabular-nums font-medium text-stone-800">
                  {formatGBP(membership.static_fees_total)}
                </span>
              </div>

              <div className="mt-3.5 bg-stone-900 text-white rounded-xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-medium">Grand total settled</span>
                <span className="tabular-nums font-display text-lg">
                  {formatGBP(membership.grand_total)}
                </span>
              </div>
            </div>

            {/* Slot & surcharge tracker */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="font-display text-sm font-semibold text-stone-900">
                  Bundle capacity
                </h3>
              </div>

              {/* Slot badge */}
              <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold ${theme.accentSoft}`}>
                <span className={`w-2 h-2 rounded-full ${theme.dot}`} />
                Included Courses: {slotsFilled} of {INCLUDED_COURSES} slots filled
              </div>

              {/* Slot visualization */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {Array.from({ length: INCLUDED_COURSES }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-colors ${
                      i < slotsFilled ? theme.badge : "bg-stone-100"
                    }`}
                  />
                ))}
              </div>

              {extraCourseCount > 0 ? (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <PoundSterling className="w-3.5 h-3.5" />
                    Bundle expanded beyond standard
                  </p>
                  <p className="text-xs text-amber-700 mt-1.5">
                    You added {extraCourseCount} course{extraCourseCount === 1 ? "" : "s"} beyond
                    the {INCLUDED_COURSE_COUNT_WORD} included slots, incurring a flat surcharge of{" "}
                    <span className="font-semibold">+{formatGBP(extraCourseFeePer[tier])}</span>{" "}
                    per extra course.
                  </p>
                  <p className="text-sm font-semibold text-amber-900 mt-2 tabular-nums">
                    Total surcharge: +{formatGBP(totalExtraCourseFees)}
                  </p>
                </div>
              ) : (
                <p className="mt-5 text-xs text-stone-400">
                  You're within your standard {INCLUDED_COURSE_COUNT_WORD}-course allowance. No
                  expansion surcharges apply.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Active Course Roster */}
        <section className="animate-fade-in-up" style={{ animationDelay: "320ms" }}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-stone-400 mb-3">
            Active course roster
          </h2>
          {clubs.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-sm text-stone-400">
              No course records linked to this membership.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clubs.map((club) => (
                <RosterCard key={club.id} club={club} theme={theme} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const INCLUDED_COURSE_COUNT_WORD = "four";

function DigitalPass({
  membership,
  tier,
  theme,
  clubCount,
  studentVerified,
}: {
  membership: MembershipRow;
  tier: Tier;
  theme: (typeof TIER_THEMES)[Tier];
  clubCount: number;
  studentVerified: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white p-6 sm:p-7 shadow-2xl ${theme.glow}`}>
      <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full bg-${theme.accent}-500/20 blur-3xl`} />
      <div className={`absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-${theme.accent}-400/10 blur-3xl`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${theme.accent}-400 to-${theme.accent}-600 flex items-center justify-center`}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold tracking-wide">NeoGolf</p>
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Digital Club Pass</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-${theme.accent}-500/20 border border-${theme.accent}-400/40 text-${theme.accent}-300 text-[11px] font-semibold`}>
            <span className="relative flex w-2 h-2">
              <span className={`absolute inline-flex w-full h-full rounded-full bg-${theme.accent}-400 opacity-60 animate-ping`} />
              <span className={`relative inline-flex w-2 h-2 rounded-full bg-${theme.accent}-400`} />
            </span>
            {theme.label}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-[10px] uppercase tracking-widest text-stone-400">Member ID</p>
          <p className={`font-mono text-xs sm:text-sm text-${theme.accent}-200 break-all mt-1`}>
            {membership.membership_pass_uuid.toUpperCase()}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Member</p>
            <p className="text-white font-medium truncate mt-0.5">{membership.customer_name}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Courses</p>
            <p className="text-white font-medium mt-0.5">{clubCount}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-400">Status</p>
            <p className="text-white font-medium mt-0.5 capitalize">{membership.status}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className={`flex items-center gap-2 text-[11px] text-${theme.accent}-200/90`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital playing rights active</span>
          </div>
          {studentVerified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-full px-2 py-0.5">
              <GraduationCap className="w-3 h-3" />
              Student
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-stone-400 shrink-0">{label}</span>
      <span className={`text-xs text-stone-800 text-right break-all ${mono ? "font-mono" : "font-medium"}`}>
        {value}
      </span>
    </div>
  );
}

function RosterCard({ club, theme }: { club: ClubProfile; theme: (typeof TIER_THEMES)[Tier] }) {
  return (
    <article className="group bg-white rounded-2xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all duration-300 overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${theme.gradient}`} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-display text-sm font-semibold text-stone-900 leading-tight">
            {club.name ?? "Unnamed club"}
          </h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shrink-0"
            style={{ backgroundColor: "rgb(16 185 129)" }}>
            <ShieldCheck className="w-2.5 h-2.5" />
            Active
          </span>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${club.name} ${club.location}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-emerald-600 transition-colors"
        >
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{club.location ?? "—"}</span>
        </a>
      </div>
    </article>
  );
}
