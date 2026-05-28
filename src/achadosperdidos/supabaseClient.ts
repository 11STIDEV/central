import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null = null;

export function isLostFoundSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_LF_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_LF_SUPABASE_ANON_KEY as string | undefined;
  return Boolean(url?.trim() && anon?.trim());
}

export function getLostFoundSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_LF_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_LF_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anon) {
    throw new Error(
      "Configure VITE_LF_SUPABASE_URL e VITE_LF_SUPABASE_ANON_KEY no .env.local e reinicie o Vite.",
    );
  }
  if (!singleton) {
    singleton = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return singleton;
}
