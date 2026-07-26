import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ShoppingBag as ShoppingBagIcon,
  X,
  Trash2,
  CheckCircle2,
  Sparkles,
  Plus,
  Minus,
  GraduationCap,
  Mail,
  Loader2,
  ShieldCheck,
  Info,
  AlertCircle,
  Lock,
  Receipt,
  MapPin,
} from "lucide-react";
import type { ClubProfile, Tier } from "../types";
import { TIER_THEMES, formatGBP } from "../lib/tiers";
import {
  resolveClubPrice,
  computePackageBreakdown,
  INCLUDED_COURSES,
  type PricingContext,
  type PackageBreakdown,
} from "../lib/pricing";
import CheckoutModal from "./CheckoutModal";

type Props = {
  activeTier: Tier;
  selectedClubs: ClubProfile[];
  client: SupabaseClient;
  onRemove: (clubId: string) => void;
  onClear: () => void;
  onViewAccount: (membershipPassUuid: string) => void;
};

const DEMO_CODE = "123456";

export default function ShoppingBag({ activeTier, selectedClubs, client, onRemove, onClear, onViewAccount }: Props) {
  const theme = TIER_THEMES[activeTier];
  const count = selectedClubs.length;

  const [userAge, setUserAge] = useState(36);
  const [customerEmail, setCustomerEmail] = useState("");
  const [isStudent, setIsStudent] = useState(false);
  const [isStudentVerified, setIsStudentVerified] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const ctx: PricingContext = useMemo(
    () => ({ age: userAge, isStudentVerified }),
    [userAge, isStudentVerified],
  );

  const breakdown = useMemo(
    () => computePackageBreakdown(selectedClubs, ctx, activeTier),
    [selectedClubs, ctx, activeTier],
  );

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim());
  const canSubmit = count > 0 && emailValid && (!isStudent || isStudentVerified);

  return (
    <aside className="flex flex-col h-full max-h-[calc(100vh-80px)]">
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-stone-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <ShoppingBagIcon className="w-5 h-5 text-emerald-400" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-white leading-tight truncate">
              Your {theme.label} Package
            </h2>
            <p className="text-[11px] text-stone-400 leading-tight">
              {count > 0 ? `${count} club${count === 1 ? "" : "s"} selected` : "No clubs yet"}
            </p>
          </div>
        </div>
        {count > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-stone-400 hover:text-rose-400 transition flex items-center gap-1 flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pr-1 space-y-3">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <div className="w-16 h-16 rounded-full bg-stone-800/60 flex items-center justify-center mb-4">
              <ShoppingBagIcon className="w-7 h-7 text-stone-600" />
            </div>
            <p className="text-sm text-stone-400 font-medium">No clubs selected yet</p>
            <p className="text-xs text-stone-500 mt-1 max-w-[14rem]">
              Add as many {theme.label} clubs as you like to build your package.
            </p>
          </div>
        ) : (
          selectedClubs.map((club) => {
            const price = resolveClubPrice(club, ctx, userAge, isStudentVerified);
            return (
              <div
                key={club.id}
                className="group bg-stone-800/50 border border-stone-700/60 rounded-xl p-3.5 animate-slide-in-right hover:border-stone-600 transition"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-white truncate">{club.name}</h3>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${club.name} ${club.location}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stone-400 hover:text-emerald-400 hover:underline transition-colors duration-200 cursor-pointer truncate inline-flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{club.location}</span>
                    </a>
                  </div>
                  <button
                    onClick={() => onRemove(club.id)}
                    className="text-stone-500 hover:text-rose-400 transition p-1 rounded-lg hover:bg-stone-700/60 flex-shrink-0"
                    aria-label={`Remove ${club.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-stone-500">Your rate</span>
                    <span
                      key={price}
                      className="font-semibold tabular-nums text-emerald-400 animate-cross-fade"
                    >
                      {formatGBP(price)}
                    </span>
                  </div>
                  <Line label="Joining" value={formatGBP(club.joining_fee_7day)} />
                  <Line label="Bar levy" value={formatGBP(club.clubhouse_bar_levy)} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-stone-800 px-5 py-4 space-y-3 mt-auto bg-black/90">
        <CustomerControls
          age={userAge}
          setAge={(v) => {
            setUserAge(v);
            setIsStudentVerified(false);
          }}
          email={customerEmail}
          setEmail={setCustomerEmail}
          emailValid={emailValid}
          isStudent={isStudent}
          setIsStudent={(v) => {
            setIsStudent(v);
            setIsStudentVerified(false);
          }}
          isStudentVerified={isStudentVerified}
          setIsStudentVerified={setIsStudentVerified}
        />

        {count > 0 && <CleanSummary breakdown={breakdown} />}
        <button
          disabled={!canSubmit}
          onClick={() => setCheckoutOpen(true)}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-30 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-teal-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {count === 0 ? (
            "Select clubs to continue"
          ) : !emailValid ? (
            "Enter email to continue"
          ) : isStudent && !isStudentVerified ? (
            "Verify student status to continue"
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Proceed to Checkout · {formatGBP(breakdown.grandTotal)}
            </>
          )}
        </button>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        client={client}
        selectedClubs={selectedClubs}
        activeTier={activeTier}
        breakdown={breakdown}
        customerEmail={customerEmail.trim()}
        customerAge={userAge}
        isStudentVerified={isStudentVerified}
        onCompleted={onClear}
        onViewAccount={onViewAccount}
      />
    </aside>
  );
}

function CleanSummary({ breakdown }: { breakdown: PackageBreakdown }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950 via-stone-900 to-stone-900 border border-emerald-800/40 shadow-xl shadow-emerald-950/30 overflow-hidden">
      <div className="px-4 py-3 bg-emerald-900/20 border-b border-emerald-800/30 flex items-center gap-2">
        <Receipt className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
          Package Summary
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-300">Package Membership Rate</span>
          <span
            key={breakdown.packageSubscriptionTotal}
            className="text-sm font-semibold text-emerald-200 tabular-nums animate-cross-fade"
          >
            {formatGBP(breakdown.packageSubscriptionTotal)}/yr
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-300">Due Upfront Today</span>
          <span
            key={breakdown.totalStaticUpfrontFees}
            className="text-sm font-semibold text-white tabular-nums animate-cross-fade"
          >
            {formatGBP(breakdown.totalStaticUpfrontFees)}
          </span>
        </div>
        <div className="h-px bg-emerald-800/30" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-100">Total Payable</span>
          <span
            key={breakdown.grandTotal}
            className="font-display text-lg font-bold text-white tabular-nums animate-cross-fade"
          >
            {formatGBP(breakdown.grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomerControls({
  age,
  setAge,
  email,
  setEmail,
  emailValid,
  isStudent,
  setIsStudent,
  isStudentVerified,
  setIsStudentVerified,
}: {
  age: number;
  setAge: (v: number) => void;
  email: string;
  setEmail: (v: string) => void;
  emailValid: boolean;
  isStudent: boolean;
  setIsStudent: (v: boolean) => void;
  isStudentVerified: boolean;
  setIsStudentVerified: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3 bg-stone-800/40 border border-stone-700/50 rounded-xl p-3.5">
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 mb-1">
          <Mail className="w-3 h-3" />
          Email address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-stone-900/60 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition"
        />
        {email.length > 0 && !emailValid && (
          <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            Enter a valid email address
          </p>
        )}
      </div>
      <div>
        <label className="flex items-center justify-between text-xs font-medium text-stone-300 mb-1.5">
          <span>Your age</span>
          <span className="text-emerald-400 tabular-nums font-bold">{age}</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAge(Math.max(0, age - 1))}
            className="w-8 h-8 rounded-lg bg-stone-700/60 hover:bg-stone-600 text-stone-200 flex items-center justify-center transition flex-shrink-0"
            aria-label="Decrease age"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="flex-1 accent-emerald-500 h-1.5"
          />
          <button
            onClick={() => setAge(Math.min(100, age + 1))}
            className="w-8 h-8 rounded-lg bg-stone-700/60 hover:bg-stone-600 text-stone-200 flex items-center justify-center transition flex-shrink-0"
            aria-label="Increase age"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer group">
        <span className="relative inline-flex">
          <input
            type="checkbox"
            checked={isStudent}
            onChange={(e) => setIsStudent(e.target.checked)}
            className="peer sr-only"
          />
          <span className="w-9 h-5 bg-stone-700 rounded-full peer-checked:bg-emerald-500 transition-colors" />
          <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
        </span>
        <span className="text-xs text-stone-300 flex items-center gap-1.5 select-none">
          <GraduationCap className="w-3.5 h-3.5 text-stone-400" />
          Are you a full-time student?
        </span>
      </label>

      {isStudent && (
        <StudentVerification
          isStudentVerified={isStudentVerified}
          setIsStudentVerified={setIsStudentVerified}
        />
      )}
    </div>
  );
}

function StudentVerification({
  isStudentVerified,
  setIsStudentVerified,
}: {
  isStudentVerified: boolean;
  setIsStudentVerified: (v: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const emailValid = email.trim().toLowerCase().endsWith(".ac.uk");

  async function sendCode() {
    if (!emailValid) return;
    setSending(true);
    setCodeSent(false);
    setCode("");
    setCodeError(null);
    await new Promise((r) => setTimeout(r, 1000));
    setSending(false);
    setCodeSent(true);
  }

  function verifyCode() {
    if (code.trim() === DEMO_CODE) {
      setIsStudentVerified(true);
      setCodeError(null);
    } else {
      setCodeError("Incorrect code. For this demo, use 123456.");
    }
  }

  if (isStudentVerified) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/40 rounded-lg px-3 py-2 text-emerald-300 text-xs animate-fade-in-up">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">Student Status Verified</span>
        <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-2.5 animate-fade-in-up pt-1">
      <div>
        <label className="flex items-center gap-1.5 text-[11px] font-medium text-stone-400 mb-1">
          <Mail className="w-3 h-3" />
          University email (.ac.uk)
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.ac.uk"
          className="w-full bg-stone-900/60 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition"
        />
        {email.length > 0 && !emailValid && (
          <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            Must end with .ac.uk
          </p>
        )}
      </div>

      <button
        onClick={sendCode}
        disabled={!emailValid || sending}
        className="w-full bg-stone-700/60 disabled:opacity-40 hover:bg-stone-600 text-stone-100 text-xs font-medium py-2 rounded-lg transition flex items-center justify-center gap-1.5"
      >
        {sending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Sending code…
          </>
        ) : (
          "Send Verification Code"
        )}
      </button>

      {codeSent && (
        <div className="space-y-2 animate-fade-in-up">
          <div className="flex items-start gap-1.5 bg-sky-500/10 border border-sky-500/30 rounded-lg px-2.5 py-2 text-[10px] text-sky-300">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>NeoGolf Sandbox Demo: Enter 123456 to verify student status.</span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeError(null);
            }}
            placeholder="6-digit code"
            className="w-full bg-stone-900/60 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition tracking-widest text-center"
          />
          {codeError && (
            <p className="text-[10px] text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5" />
              {codeError}
            </p>
          )}
          <button
            onClick={verifyCode}
            disabled={code.trim().length === 0}
            className="w-full bg-emerald-600 disabled:opacity-40 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded-lg transition"
          >
            Verify Code
          </button>
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-stone-500">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          highlight ? "text-emerald-400" : "text-stone-100"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
