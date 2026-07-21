import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Database,
  Table2,
  ShieldCheck,
} from "lucide-react";

type Props = {
  client: SupabaseClient;
  onExit: () => void;
  onResetConfig: () => void;
};

type Row = Record<string, string | number | null>;

const COLUMN_MAP: Record<string, string> = {
  year: "year",
  price_full_7day_adult: "price_full_7day_adult",
  price_5day_adult: "price_5day_adult",
  price_under_12: "price_under_12",
  price_junior_12_18: "price_junior_12_18",
  price_colt_21: "price_colt_21",
  price_intermediate_25: "price_intermediate_25",
  price_intermediate_28: "price_intermediate_28",
  price_intermediate_31_35: "price_intermediate_31_35",
  price_country_member: "price_country_member",
  price_student: "price_student",
  total_historic_revenue: "total_historic_revenue",
  total_member_count: "total_member_count",
};

const NUMERIC_FIELDS = new Set([
  "price_full_7day_adult",
  "price_5day_adult",
  "price_under_12",
  "price_junior_12_18",
  "price_colt_21",
  "price_intermediate_25",
  "price_intermediate_28",
  "price_intermediate_31_35",
  "price_country_member",
  "price_student",
  "total_historic_revenue",
  "total_member_count",
]);

const INT_FIELDS = new Set(["year", "total_member_count"]);

type ParseResult = {
  rows: Record<string, unknown>[];
  headers: string[];
  unmapped: string[];
  rowCount: number;
};

type Toast = { kind: "success" | "error"; message: string } | null;

export default function AdminPortal({ client, onExit, onResetConfig }: Props) {
  const [clubId, setClubId] = useState("");
  const [verifiedClubId, setVerifiedClubId] = useState<string | null>(null);
  const [clubName, setClubName] = useState("");
  const [clubLookupError, setClubLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [insertedCount, setInsertedCount] = useState<number | null>(null);
  const [insertError, setInsertError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function lookupClub() {
    const sanitizedUuid = clubId.trim().toLowerCase();
    if (!sanitizedUuid) {
      setClubLookupError("Enter a club UUID first.");
      return;
    }
    setLooking(true);
    setClubLookupError(null);
    setClubName("");
    setVerifiedClubId(null);
    try {
      const { data, error } = await client
        .from("clubs")
        .select("name, id")
        .eq("id", sanitizedUuid)
        .single();
      if (error) {
        if (error.code === "PGRST116") {
          setClubLookupError("No club found with that UUID.");
        } else {
          throw error;
        }
        return;
      }
      setClubName(data.name ?? "Unnamed club");
      setVerifiedClubId(data.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setClubLookupError(msg);
    } finally {
      setLooking(false);
    }
  }

  function handleFile(f: File) {
    setFile(f);
    setParse(null);
    setParseError(null);
    setInsertedCount(null);
    setInsertError(null);
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }
        const headers = results.meta.fields ?? [];
        const mappedRows: Record<string, unknown>[] = [];
        const unmapped: string[] = [];
        for (const raw of results.data) {
          const out: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(raw)) {
            const target = COLUMN_MAP[key.trim().toLowerCase()];
            if (!target) {
              if (!unmapped.includes(key)) unmapped.push(key);
              continue;
            }
            if (value === null || value === undefined || String(value).trim() === "") {
              out[target] = null;
              continue;
            }
            if (INT_FIELDS.has(target)) {
              const n = parseInt(String(value), 10);
              out[target] = Number.isNaN(n) ? null : n;
            } else if (NUMERIC_FIELDS.has(target)) {
              const n = parseFloat(String(value).replace(/[,£\s]/g, ""));
              out[target] = Number.isNaN(n) ? null : n;
            } else {
              out[target] = value;
            }
          }
          mappedRows.push(out);
        }
        setParse({
          rows: mappedRows,
          headers,
          unmapped,
          rowCount: mappedRows.length,
        });
      },
      error: (err) => setParseError(err.message),
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".csv")) handleFile(f);
    else if (f) setParseError("Only .csv files are supported.");
  }

  function clearFile() {
    setFile(null);
    setParse(null);
    setParseError(null);
    setInsertedCount(null);
    setInsertError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!parse || parse.rowCount === 0) return;
    if (!verifiedClubId) {
      setClubLookupError("Verify your club UUID first.");
      return;
    }
    setUploading(true);
    setInsertError(null);
    setInsertedCount(null);
    try {
      const payload = parse.rows.map((r) => ({
        club_id: verifiedClubId,
        year: r.year ?? null,
        price_full_7day_adult: r.price_full_7day_adult ?? null,
        price_5day_adult: r.price_5day_adult ?? null,
        price_under_12: r.price_under_12 ?? null,
        price_junior_12_18: r.price_junior_12_18 ?? null,
        price_colt_21: r.price_colt_21 ?? null,
        price_intermediate_25: r.price_intermediate_25 ?? null,
        price_intermediate_28: r.price_intermediate_28 ?? null,
        price_intermediate_31_35: r.price_intermediate_31_35 ?? null,
        price_country_member: r.price_country_member ?? null,
        price_student: r.price_student ?? null,
        total_historic_revenue: r.total_historic_revenue ?? null,
        total_member_count: r.total_member_count ?? null,
      }));
      const { error, count } = await client
        .from("club_pricing_demographics")
        .insert(payload)
        .select("id");
      if (error) throw error;
      const n = count ?? payload.length;
      setInsertedCount(n);
      setToast({ kind: "success", message: `Successfully uploaded ${n} demographic rows to Supabase.` });
      clearFile();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setInsertError(msg);
      setToast({ kind: "error", message: msg });
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const canUpload = !!parse && parse.rowCount > 0 && !!verifiedClubId && !uploading;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center">
              <span className="font-display text-white font-bold text-lg leading-none">N</span>
            </div>
            <div>
              <span className="font-display text-lg font-semibold tracking-tight">NeoGolf</span>
              <span className="text-stone-400 text-sm ml-1.5">Admin Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition px-3 py-2 rounded-lg hover:bg-stone-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Builder
            </button>
            <button
              onClick={onResetConfig}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 transition px-3 py-2 rounded-lg hover:bg-stone-100"
            >
              <Database className="w-4 h-4" />
              Reconfigure
            </button>
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">Club Admin Portal</h1>
              <p className="text-stone-500 text-sm mt-0.5">
                Upload yearly demographic &amp; pricing data straight into the database.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Section number={1} title="Identify your club" icon={<Database className="w-4 h-4" />}>
            <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Club UUID</label>
                <input
                  value={clubId}
                  onChange={(e) => {
                    setClubId(e.target.value);
                    setClubLookupError(null);
                    setClubName("");
                    setVerifiedClubId(null);
                  }}
                  placeholder="e.g. 8a2f...-...-..."
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 transition"
                />
              </div>
              <button
                onClick={lookupClub}
                disabled={looking || !clubId.trim()}
                className="bg-stone-900 disabled:opacity-40 hover:bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition flex items-center justify-center gap-2 h-[42px]"
              >
                {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify club"}
              </button>
            </div>
            {clubLookupError && (
              <p className="text-xs text-rose-600 mt-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {clubLookupError}
              </p>
            )}
            {clubName && (
              <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-sm text-emerald-800 animate-fade-in-up">
                <CheckCircle2 className="w-4 h-4" />
                Verified: <strong className="font-semibold">{clubName}</strong>
                <span className="text-emerald-600 text-xs ml-auto font-mono truncate max-w-[12rem]">
                  {verifiedClubId}
                </span>
              </div>
            )}
          </Section>

          <Section number={2} title="Upload your CSV file" icon={<FileSpreadsheet className="w-4 h-4" />}>
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl px-6 py-12 text-center transition-all ${
                  dragging
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-stone-300 bg-white hover:border-stone-400 hover:bg-stone-50"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <UploadCloud className="w-7 h-7 text-stone-500" />
                </div>
                <p className="font-medium text-stone-700">Drop your CSV here, or click to browse</p>
                <p className="text-xs text-stone-400 mt-1">Standard .csv files only</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 animate-fade-in-up">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-stone-800 truncate">{file.name}</p>
                      <p className="text-xs text-stone-400">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={clearFile}
                    className="text-stone-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-stone-100 transition flex-shrink-0"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {parseError && (
                  <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {parseError}
                  </div>
                )}

                {parse && (
                  <div className="mt-4 space-y-3 animate-fade-in-up">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Pill icon={<Table2 className="w-3 h-3" />} label={`${parse.rowCount} rows`} tone="stone" />
                      <Pill label={`${parse.headers.length} columns`} tone="stone" />
                      {parse.unmapped.length > 0 && (
                        <Pill label={`${parse.unmapped.length} skipped`} tone="amber" />
                      )}
                    </div>
                    {parse.unmapped.length > 0 && (
                      <p className="text-xs text-stone-400">
                        Skipped unmapped columns: {parse.unmapped.join(", ")}
                      </p>
                    )}
                    <div className="overflow-x-auto -mx-1 px-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-stone-400 border-b border-stone-100">
                            <th className="py-2 pr-3 font-medium">#</th>
                            {Object.keys(COLUMN_MAP).map((c) => (
                              <th key={c} className="py-2 px-2 font-medium whitespace-nowrap">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {parse.rows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-stone-50">
                              <td className="py-1.5 pr-3 text-stone-400 tabular-nums">{i + 1}</td>
                              {Object.keys(COLUMN_MAP).map((c) => (
                                <td key={c} className="py-1.5 px-2 tabular-nums text-stone-700 whitespace-nowrap">
                                  {row[c] === null || row[c] === undefined ? "—" : String(row[c])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parse.rowCount > 5 && (
                        <p className="text-xs text-stone-400 mt-2">
                          + {parse.rowCount - 5} more row{parse.rowCount - 5 === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          <Section number={3} title="Submit to Supabase" icon={<ArrowRight className="w-4 h-4" />}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button
                onClick={upload}
                disabled={!canUpload}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-teal-500 text-white font-medium px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Upload {parse?.rowCount ?? 0} row{parse?.rowCount === 1 ? "" : "s"}
                  </>
                )}
              </button>
              <p className="text-xs text-stone-400">
                Rows are inserted into <code className="font-mono">club_pricing_demographics</code> with your club UUID attached.
              </p>
            </div>
            {insertError && (
              <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700 flex items-start gap-2 animate-fade-in-up">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {insertError}
              </div>
            )}
            {insertedCount !== null && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 flex items-start gap-2 animate-fade-in-up">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {insertedCount} row{insertedCount === 1 ? "" : "s"} securely processed into Supabase.
              </div>
            )}
          </Section>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in-right">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white ${
              toast.kind === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {toast.kind === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  number,
  title,
  icon,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-7 h-7 rounded-lg bg-stone-900 text-white text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Pill({
  label,
  icon,
  tone,
}: {
  label: string;
  icon?: React.ReactNode;
  tone: "stone" | "amber";
}) {
  const tones = {
    stone: "bg-stone-100 text-stone-600",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${tones[tone]}`}>
      {icon}
      {label}
    </span>
  );
}
