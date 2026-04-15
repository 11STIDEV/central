import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { useAuth } from "@/auth/AuthProvider";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";

/**
 * Estado da sincronização Google (Central) → sessão Supabase do painel.
 * Totem/Painel TV não precisam disso; atendente/admin devem esperar `status === "ready"` com sessão.
 */
export type PainelSupabaseAuthState =
  | { status: "auth_loading" }
  | { status: "no_config" }
  | { status: "no_token" }
  | { status: "syncing" }
  | { status: "ready"; session: Session | null; syncError: string | null };

const PainelSupabaseAuthContext = createContext<PainelSupabaseAuthState | null>(null);

export function PainelSupabaseAuthProvider({ children }: { children: ReactNode }) {
  const { googleIdToken, usuario, carregando } = useAuth();
  const [state, setState] = useState<PainelSupabaseAuthState>({ status: "auth_loading" });

  useEffect(() => {
    if (!isPainelSupabaseConfigured()) {
      setState({ status: "no_config" });
      return;
    }

    if (carregando) {
      setState({ status: "auth_loading" });
      return;
    }

    if (!googleIdToken || !usuario) {
      void getPainelSupabase()
        .auth.signOut()
        .catch(() => {
          /* ignore */
        });
      setState({ status: "no_token" });
      return;
    }

    const supabase = getPainelSupabase();
    let cancelled = false;

    const sync = async () => {
      setState({ status: "syncing" });
      try {
        const { error: signErr } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: googleIdToken,
        });
        if (cancelled) return;
        if (signErr && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.warn(
            "[painel] signInWithIdToken:",
            signErr.message,
            "— Confira Google provider no Supabase e o mesmo Client ID OAuth.",
          );
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        setState({
          status: "ready",
          session,
          syncError: session?.user
            ? null
            : signErr?.message ?? "Sem sessão no Supabase após o login com Google.",
        });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "ready",
            session: null,
            syncError: e instanceof Error ? e.message : "Erro ao sincronizar com o Supabase.",
          });
        }
      }
    };

    void sync();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState({
        status: "ready",
        session,
        syncError: session?.user ? null : "Sessão do painel inativa.",
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [carregando, googleIdToken, usuario]);

  return (
    <PainelSupabaseAuthContext.Provider value={state}>{children}</PainelSupabaseAuthContext.Provider>
  );
}

export function usePainelSupabaseAuth(): PainelSupabaseAuthState {
  const ctx = useContext(PainelSupabaseAuthContext);
  if (!ctx) {
    throw new Error("usePainelSupabaseAuth deve ser usado dentro de PainelSupabaseAuthProvider.");
  }
  return ctx;
}
