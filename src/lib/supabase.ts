import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const STORAGE_KEY = "neogolf_supabase_config";

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function loadStoredConfig(): SupabaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupabaseConfig>;
    if (parsed.url && parsed.anonKey) {
      return { url: parsed.url, anonKey: parsed.anonKey };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  const normalizedUrl = config.url.trim().replace(/\/$/, "");
  return createClient(normalizedUrl, config.anonKey.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
