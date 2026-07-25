import { useState, type ReactNode } from "react";
import {
  X,
  Lock,
  CreditCard,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  User,
  Phone,
  KeyRound,
  Mail,
  Calendar,
  Sparkles,
  Trophy,
  CalendarRange,
  Repeat,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClubProfile, Tier } from "../types";
import { TIER_THEMES, formatGBP } from "../lib/tiers";
import type { PackageBreakdown } from "../lib/pricing";

type PaymentSpread = "annually" | "monthly";

type Props = {
  open: boolean;
  onClose: () => void;
  client: SupabaseClient;
  selectedClubs: ClubProfile[];
  activeTier: Tier;
  breakdown: PackageBreakdown;
  customerEmail: string;
  customerAge: number;
  isStudentVerified: boolean;
  onCompleted: () => void;
  onViewAccount: (membershipPassUuid: string) => void;
};

type Step = "register" | "payment" | "processing" | "receipt" | "error";

type ReceiptData = {
  membershipPassUuid: string;
  customerName: string;
  customerEmail: string;
  customerAge: number;
  customerPhone: string;
  selectedClubIds: string[];
  tierClassification: Tier;
  paymentSpreadType: PaymentSpread;
  studentVerified: boolean;
  packageSubscriptionSubtotal: number;
  staticFeesTotal: number;
  grandTotal: number;
};

export default function CheckoutModal({
  open,
  onClose,
  client,
  selectedClubs,
  activeTier,
  breakdown,
  customerEmail,
  customerAge,
  isStudentVerified,
  onCompleted,
  onViewAccount,
}: Props) {
  const [step, setStep] = useState<Step>("register");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [paymentSpread, setPaymentSpread] = useState<PaymentSpread>("annually");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  if (!open) return null;

  const theme = TIER_THEMES[activeTier];

  function resetAndClose() {
    setStep("register");
    setFullName("");
    setPhone("");
    setPassword("");
    setPaymentSpread("annually");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setErrorMsg(null);
    setReceipt(null);
    onClose();
  }

  function validateRegister(): boolean {
    if (fullName.trim().length < 2) {
      setErrorMsg("Please enter your full name.");
      return false;
    }
    if (phone.trim().length < 6) {
      setErrorMsg("Please enter a valid phone number.");
      return false;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return false;
    }
    setErrorMsg(null);
    return true;
  }

  function validatePayment(): boolean {
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 13 || digits.length > 19) {
      setErrorMsg("Enter a valid card number.");
      return false;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setErrorMsg("Expiry must be in MM/YY format.");
      return false;
    }
    if (!/^\d{3,4}$/.test(cardCvc)) {
      setErrorMsg("Enter a valid CVC.");
      return false;
    }
    setErrorMsg(null);
    return true;
  }

  async function handlePay() {
    if (!validatePayment()) return;
    setStep("processing");
    setErrorMsg(null);

    // Simulated Stripe Checkout API handshake.
    await new Promise((r) => setTimeout(r, 1500));

    const payload = {
      customer_name: fullName.trim(),
      customer_email: customerEmail,
      customer_age: customerAge,
      customer_phone: phone.trim() || null,
      selected_club_ids: selectedClubs.map((c) => c.id),
      tier_classification: activeTier,
      payment_spread_type: paymentSpread,
      student_verified: isStudentVerified,
      package_subscription_subtotal: breakdown.packageSubscriptionTotal,
      static_fees_total: breakdown.totalStaticUpfrontFees,
      grand_total: breakdown.grandTotal,
      status: "active",
    };

    try {
      const { data, error } = await client
        .from("user_memberships")
        .insert(payload)
        .select("membership_pass_uuid, customer_name, customer_email, customer_age, customer_phone, selected_club_ids, tier_classification, payment_spread_type, student_verified, package_subscription_subtotal, static_fees_total, grand_total")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No record returned from database.");

      setReceipt({
        membershipPassUuid: data.membership_pass_uuid,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerAge: data.customer_age,
        customerPhone: data.customer_phone ?? "",
        selectedClubIds: data.selected_club_ids ?? [],
        tierClassification: (data.tier_classification as Tier) ?? activeTier,
        paymentSpreadType: (data.payment_spread_type as PaymentSpread) ?? "annually",
        studentVerified: Boolean(data.student_verified),
        packageSubscriptionSubtotal: Number(data.package_subscription_subtotal),
        staticFeesTotal: Number(data.static_fees_total),
        grandTotal: Number(data.grand_total),
      });
      setStep("receipt");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Transaction failed.");
      setStep("error");
    }
  }

  function handleViewAccount() {
    if (receipt) onViewAccount(receipt.membershipPassUuid);
    onCompleted();
    resetAndClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm animate-fade-in"
        onClick={step === "processing" ? undefined : resetAndClose}
      />
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar bg-white rounded-3xl shadow-2xl animate-scale-in">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center">
              <span className="font-display text-white font-bold text-sm leading-none">N</span>
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-stone-900 leading-tight">
                {step === "receipt"
                  ? "Membership Confirmed"
                  : step === "error"
                    ? "Payment Error"
                    : "Secure Checkout"}
              </h2>
              <p className="text-[11px] text-stone-500 leading-tight">
                {step === "register" && "Step 1 of 2 · Registration"}
                {step === "payment" && "Step 2 of 2 · Payment"}
                {step === "processing" && "Processing payment…"}
                {step === "receipt" && "Digital pass issued"}
                {step === "error" && "Please review and retry"}
              </p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              onClick={resetAndClose}
              className="text-stone-400 hover:text-stone-900 transition p-1.5 rounded-lg hover:bg-stone-100"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-6 py-6">
          {step === "register" && (
            <RegisterStep
              fullName={fullName}
              setFullName={setFullName}
              phone={phone}
              setPhone={setPhone}
              password={password}
              setPassword={setPassword}
              customerEmail={customerEmail}
              customerAge={customerAge}
              errorMsg={errorMsg}
              onNext={() => {
                if (validateRegister()) setStep("payment");
              }}
            />
          )}

          {step === "payment" && (
            <PaymentStep
              cardNumber={cardNumber}
              setCardNumber={setCardNumber}
              cardExpiry={cardExpiry}
              setCardExpiry={setCardExpiry}
              cardCvc={cardCvc}
              setCardCvc={setCardCvc}
              errorMsg={errorMsg}
              onBack={() => setStep("register")}
              onPay={handlePay}
              breakdown={breakdown}
              themeLabel={theme.label}
              paymentSpread={paymentSpread}
              setPaymentSpread={setPaymentSpread}
            />
          )}

          {step === "processing" && <ProcessingStep />}

          {step === "receipt" && receipt && (
            <ReceiptStep
              receipt={receipt}
              activeTier={activeTier}
              selectedClubs={selectedClubs}
              onViewAccount={handleViewAccount}
            />
          )}

          {step === "error" && (
            <ErrorStep
              message={errorMsg ?? "Unknown error."}
              onRetry={() => setStep("payment")}
              onCancel={resetAndClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-600 mb-1.5 flex items-center gap-1.5">
        <span className="text-stone-400">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition";

function RegisterStep({
  fullName,
  setFullName,
  phone,
  setPhone,
  password,
  setPassword,
  customerEmail,
  customerAge,
  errorMsg,
  onNext,
}: {
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  customerEmail: string;
  customerAge: number;
  errorMsg: string | null;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4 animate-fade-in-up">
      <p className="text-sm text-stone-500">
        Create your NeoGolf profile to activate your package. Your session email and age are pre-filled.
      </p>
      <Field label="Full Name" icon={<User className="w-3.5 h-3.5" />}>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Fairway"
          className={inputClass}
          autoFocus
        />
      </Field>
      <Field label="Phone Number" icon={<Phone className="w-3.5 h-3.5" />}>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+44 7700 900000"
          className={inputClass}
        />
      </Field>
      <Field label="Password" icon={<KeyRound className="w-3.5 h-3.5" />}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className={inputClass}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email (pre-filled)" icon={<Mail className="w-3.5 h-3.5" />}>
          <input
            type="email"
            value={customerEmail}
            readOnly
            className={`${inputClass} bg-stone-100 text-stone-500 cursor-not-allowed`}
          />
        </Field>
        <Field label="Age (pre-filled)" icon={<Calendar className="w-3.5 h-3.5" />}>
          <input
            type="text"
            value={String(customerAge)}
            readOnly
            className={`${inputClass} bg-stone-100 text-stone-500 cursor-not-allowed`}
          />
        </Field>
      </div>

      {errorMsg && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <button
        onClick={onNext}
        className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2"
      >
        Continue to Payment
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function PaymentStep({
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCvc,
  setCardCvc,
  errorMsg,
  onBack,
  onPay,
  breakdown,
  themeLabel,
  paymentSpread,
  setPaymentSpread,
}: {
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvc: string;
  setCardCvc: (v: string) => void;
  errorMsg: string | null;
  onBack: () => void;
  onPay: () => void;
  breakdown: PackageBreakdown;
  themeLabel: string;
  paymentSpread: PaymentSpread;
  setPaymentSpread: (v: PaymentSpread) => void;
}) {
  const monthlyAmount = breakdown.packageSubscriptionTotal / 12;
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-2 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5">
        <Lock className="w-3.5 h-3.5 text-emerald-600" />
        <span className="font-medium text-stone-700">Secured by Stripe SSL Encryption</span>
      </div>

      {/* Payment spread selector */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-3">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Subscription payment plan
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setPaymentSpread("annually")}
            className={`text-left rounded-xl border p-3 transition-all duration-200 ${
              paymentSpread === "annually"
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-stone-800">Pay Annually</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5">One upfront annual payment</p>
          </button>
          <button
            type="button"
            onClick={() => setPaymentSpread("monthly")}
            className={`text-left rounded-xl border p-3 transition-all duration-200 ${
              paymentSpread === "monthly"
                ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                : "border-stone-200 hover:border-stone-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-stone-800">Pay Monthly</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1.5">
              12 monthly direct debits of {formatGBP(monthlyAmount)}
            </p>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Card details
          </span>
          <CreditCard className="w-5 h-5 text-stone-400" />
        </div>
        <Field label="Card number" icon={<CreditCard className="w-3.5 h-3.5" />}>
          <input
            type="text"
            inputMode="numeric"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="4242 4242 4242 4242"
            className={`${inputClass} font-mono tracking-wider`}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry" icon={<Calendar className="w-3.5 h-3.5" />}>
            <input
              type="text"
              inputMode="numeric"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="CVC" icon={<Lock className="w-3.5 h-3.5" />}>
            <input
              type="text"
              inputMode="numeric"
              value={cardCvc}
              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl bg-stone-900 text-white p-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>{themeLabel} package subscription</span>
          <span className="tabular-nums">{formatGBP(breakdown.packageSubscriptionTotal)}</span>
        </div>
        {paymentSpread === "monthly" && (
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>Monthly direct debit</span>
            <span className="tabular-nums">{formatGBP(monthlyAmount)}/mo</span>
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-stone-400">
          <span>Static upfront fees</span>
          <span className="tabular-nums">{formatGBP(breakdown.totalStaticUpfrontFees)}</span>
        </div>
        <div className="h-px bg-stone-700 my-1" />
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Charged today</span>
          <span className="tabular-nums text-lg font-display">
            {formatGBP(paymentSpread === "monthly" ? breakdown.totalStaticUpfrontFees : breakdown.grandTotal)}
          </span>
        </div>
        {paymentSpread === "monthly" && (
          <p className="text-[10px] text-stone-500 pt-0.5">
            First monthly instalment of {formatGBP(monthlyAmount)} begins next month.
          </p>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition px-3 py-3 rounded-xl hover:bg-stone-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onPay}
          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          Confirm &amp; Pay · {formatGBP(paymentSpread === "monthly" ? breakdown.totalStaticUpfrontFees : breakdown.grandTotal)}
        </button>
      </div>
    </div>
  );
}

function ProcessingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fade-in-up">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-stone-900 mt-6">
        Processing payment
      </h3>
      <p className="text-sm text-stone-500 mt-1 text-center max-w-xs">
        Securely handshaking with Stripe Checkout. Please do not close this window.
      </p>
    </div>
  );
}

function ReceiptStep({
  receipt,
  activeTier,
  selectedClubs,
  onViewAccount,
}: {
  receipt: ReceiptData;
  activeTier: Tier;
  selectedClubs: ClubProfile[];
  onViewAccount: () => void;
}) {
  const tierTheme = TIER_THEMES[receipt.tierClassification ?? activeTier];
  const monthlyAmount = receipt.packageSubscriptionSubtotal / 12;
  const chargedToday =
    receipt.paymentSpreadType === "monthly"
      ? receipt.staticFeesTotal
      : receipt.grandTotal;
  const uuidShort = receipt.membershipPassUuid
    ? receipt.membershipPassUuid.toString().toUpperCase()
    : "—";

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="font-display text-xl font-bold text-stone-900 mt-3">
          Welcome to NeoGolf
        </h3>
        <p className="text-sm text-stone-500 mt-1 max-w-xs">
          Your digital golf pass is active across all {selectedClubs.length} selected
          club{selectedClubs.length === 1 ? "" : "s"}.
        </p>
      </div>

      {/* Digital golf pass */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-900 via-stone-800 to-${tierTheme.accent}-900 text-white p-5 shadow-xl`}>
        <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-${tierTheme.accent}-500/20 blur-2xl`} />
        <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-${tierTheme.accent}-400/10 blur-2xl`} />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Trophy className={`w-5 h-5 text-${tierTheme.accent}-400`} />
              <span className="font-display text-sm font-semibold tracking-wide">
                NeoGolf Digital Pass
              </span>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-${tierTheme.accent}-500/20 border border-${tierTheme.accent}-400/40 text-${tierTheme.accent}-300 text-[11px] font-semibold`}>
              <span className="relative flex w-2 h-2">
                <span className={`absolute inline-flex w-full h-full rounded-full bg-${tierTheme.accent}-400 opacity-60 animate-ping`} />
                <span className={`relative inline-flex w-2 h-2 rounded-full bg-${tierTheme.accent}-400`} />
              </span>
              {tierTheme.label}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-widest text-stone-400">
              Membership UUID
            </p>
            <p className={`font-mono text-[11px] sm:text-xs text-${tierTheme.accent}-200 break-all mt-1`}>
              {uuidShort}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Member</p>
              <p className="text-white font-medium truncate">{receipt.customerName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Clubs</p>
              <p className="text-white font-medium">{selectedClubs.length}</p>
            </div>
          </div>

          <div className={`mt-4 flex items-center gap-2 text-[11px] text-${tierTheme.accent}-200/90`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digital permissions open across your chosen golf courses.</span>
          </div>
        </div>
      </div>

      {/* Receipt summary — split by payment spread */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-stone-500">
          <span>Annual subscription</span>
          <span className="tabular-nums text-stone-800">
            {formatGBP(receipt.packageSubscriptionSubtotal)}
          </span>
        </div>
        {receipt.paymentSpreadType === "monthly" && (
          <div className="flex items-center justify-between text-emerald-700">
            <span>Monthly direct debit (12 ×)</span>
            <span className="tabular-nums">{formatGBP(monthlyAmount)}/mo</span>
          </div>
        )}
        <div className="flex items-center justify-between text-stone-500">
          <span>Static upfront fees</span>
          <span className="tabular-nums text-stone-800">{formatGBP(receipt.staticFeesTotal)}</span>
        </div>
        <div className="h-px bg-stone-200 my-1" />
        <div className="flex items-center justify-between text-sm font-semibold text-stone-900">
          <span>{receipt.paymentSpreadType === "monthly" ? "Charged today" : "Total paid"}</span>
          <span className="tabular-nums">{formatGBP(chargedToday)}</span>
        </div>
      </div>

      <button
        onClick={onViewAccount}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        View My Account
      </button>
    </div>
  );
}

function ErrorStep({
  message,
  onRetry,
  onCancel,
}: {
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-8 animate-fade-in-up">
      <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
        <X className="w-7 h-7 text-rose-600" />
      </div>
      <h3 className="font-display text-lg font-semibold text-stone-900 mt-3">
        Transaction failed
      </h3>
      <p className="text-sm text-stone-500 mt-1 max-w-xs">{message}</p>
      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={onCancel}
          className="text-sm text-stone-500 hover:text-stone-900 transition px-4 py-2.5 rounded-xl hover:bg-stone-100"
        >
          Cancel
        </button>
        <button
          onClick={onRetry}
          className="bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition"
        >
          Retry payment
        </button>
      </div>
    </div>
  );
}
