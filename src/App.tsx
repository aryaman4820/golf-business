import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import ConfigScreen from "./components/ConfigScreen";
import PackageBuilder from "./components/PackageBuilder";
import AdminPortal from "./components/AdminPortal";
import Landing from "./components/Landing";
import type { Tier } from "./types";

type View = "home" | "builder" | "admin";
import {
  clearConfig,
  createSupabaseClient,
  loadStoredConfig,
  saveConfig,
  type SupabaseConfig,
} from "./lib/supabase";

type AppState =
  | { status: "config" }
  | { status: "connecting"; config: SupabaseConfig }
  | { status: "ready"; client: SupabaseClient }
  | { status: "error"; config: SupabaseConfig; message: string };

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const stored = loadStoredConfig();
    if (stored) return { status: "connecting", config: stored };
    const envUrl = import.meta.env.VITE_SUPABASE_URL;
    const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (envUrl && envKey) {
      const envConfig = { url: envUrl, anonKey: envKey };
      saveConfig(envConfig);
      return { status: "connecting", config: envConfig };
    }
    return { status: "config" };
  });

  useEffect(() => {
    if (state.status !== "connecting") return;
    let cancelled = false;
    const { config } = state;
    const client = createSupabaseClient(config);

    (async () => {
      try {
        const { error } = await client
          .from("club_profiles_with_tiers")
          .select("id")
          .limit(1);
        if (cancelled) return;
        if (error) {
          setState({ status: "error", config, message: error.message });
        } else {
          setState({ status: "ready", client });
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Connection failed";
        setState({ status: "error", config, message: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.status === "connecting" ? state.config.url : ""]);

  if (state.status === "config") {
    return (
      <ConfigScreen
        onSubmit={(config) => setState({ status: "connecting", config })}
        onCancel={() => {}}
        testing={false}
      />
    );
  }

  if (state.status === "error") {
    return (
      <ConfigScreen
        error={state.message}
        testing={false}
        onSubmit={(config) => setState({ status: "connecting", config })}
        onCancel={() => {
          clearConfig();
          setState({ status: "config" });
        }}
      />
    );
  }

  if (state.status === "ready") {
    return <ReadyRouter client={state.client} onResetConfig={() => {
      clearConfig();
      setState({ status: "config" });
    }} />;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-stone-400 text-sm">Connecting to Supabase…</div>
    </div>
  );
}

function ReadyRouter({
  client,
  onResetConfig,
}: {
  client: SupabaseClient;
  onResetConfig: () => void;
}) {
  const [view, setView] = useState<View>("home");
  const [builderTier, setBuilderTier] = useState<Tier | null>(null);

  function goBuilder(tier: Tier | null) {
    setBuilderTier(tier);
    setView("builder");
  }

  if (view === "admin") {
    return (
      <AdminPortal
        client={client}
        onExit={() => setView("home")}
        onResetConfig={onResetConfig}
      />
    );
  }

  if (view === "builder") {
    return (
      <PackageBuilder
        client={client}
        initialTier={builderTier}
        onResetConfig={onResetConfig}
        onOpenAdmin={() => setView("admin")}
        onGoHome={() => setView("home")}
      />
    );
  }

  return (
    <Landing
      client={client}
      onBuildPackage={() => goBuilder(null)}
      onViewInBuilder={(tier) => goBuilder(tier)}
      onOpenAdmin={() => setView("admin")}
    />
  );
}
