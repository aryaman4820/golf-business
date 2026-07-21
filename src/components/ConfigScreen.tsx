import { useState } from "react";
import { Database, KeyRound, Link2, Loader2, ShieldCheck, X } from "lucide-react";
import { isValidUrl, saveConfig, type SupabaseConfig } from "../lib/supabase";

type Props = {
  onSubmit: (config: SupabaseConfig) => void;
  onCancel: () => void;
  error?: string | null;
  testing?: boolean;
};

export default function ConfigScreen({ onSubmit, onCancel, error, testing }: Props) {
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [touched, setTouched] = useState(false);

  const urlValid = isValidUrl(url);
  const keyValid = anonKey.trim().length > 20;
  const formValid = urlValid && keyValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;
    const config: SupabaseConfig = { url: url.trim(), anonKey: anonKey.trim() };
    saveConfig(config);
    onSubmit(config);
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg animate-scale-in">
        <div className="bg-stone-900/80 backdrop-blur-xl border border-stone-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-stone-800 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Database className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold tracking-tight text-white">
                  Connect Supabase
                </h1>
                <p className="text-sm text-stone-400 mt-0.5">
                  NeoGolf Package Builder needs your project credentials
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-stone-500 hover:text-stone-200 transition-colors rounded-lg p-1.5 hover:bg-stone-800"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 space-y-5">
            <Field
              id="supa-url"
              label="Project URL"
              icon={<Link2 className="w-4 h-4" />}
              hint="e.g. https://yourproject.supabase.co"
              error={touched && !urlValid ? "Enter a valid https:// URL" : undefined}
            >
              <input
                id="supa-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourproject.supabase.co"
                className="w-full bg-stone-950/60 border border-stone-700 rounded-xl px-4 py-3 pl-11 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition"
              />
            </Field>

            <Field
              id="supa-key"
              label="Anon / Public API Key"
              icon={<KeyRound className="w-4 h-4" />}
              hint="Found in Project Settings → API. The anon key is safe for the browser."
              error={touched && !keyValid ? "Key looks too short" : undefined}
            >
              <textarea
                id="supa-key"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-stone-950/60 border border-stone-700 rounded-xl px-4 py-3 pl-11 text-xs font-mono text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 transition resize-none"
              />
            </Field>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-sm text-rose-300 animate-fade-in-up">
                {error}
              </div>
            )}

            <div className="flex items-start gap-2.5 text-xs text-stone-400 bg-stone-800/40 rounded-xl px-4 py-3">
              <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
              <p>
                Credentials are stored only in your browser&apos;s localStorage and used to query the{" "}
                <code className="text-stone-300 font-mono">club_profiles_with_tiers</code> view. Nothing is sent
                anywhere else.
              </p>
            </div>

            <button
              type="submit"
              disabled={!formValid || testing}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3.5 rounded-xl transition shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing connection…
                </>
              ) : (
                "Connect & Build Packages"
              )}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-stone-500 mt-5">
          NeoGolf · Package Builder · Supabase Edition
        </p>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-200 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-3.5 text-stone-500 pointer-events-none">{icon}</span>
        {children}
      </div>
      {error ? (
        <p className="text-xs text-rose-400 mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-xs text-stone-500 mt-1.5">{hint}</p>
      ) : null}
    </div>
  );
}
