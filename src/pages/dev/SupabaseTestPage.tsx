import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPainelSupabase, isPainelSupabaseConfigured } from "@/painel/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";

function maskKey(s: string | undefined): string {
  if (!s || s.length < 12) return s ? "••••••••" : "(vazio)";
  return `${s.slice(0, 8)}…${s.slice(-6)}`;
}

type CheckState = "idle" | "running" | "ok" | "err";

export default function SupabaseTestPage() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const [restState, setRestState] = useState<CheckState>("idle");
  const [restDetail, setRestDetail] = useState<string>("");

  const [clientState, setClientState] = useState<CheckState>("idle");
  const [clientDetail, setClientDetail] = useState<string>("");

  const configured = isPainelSupabaseConfigured();

  const restUrl = useMemo(() => {
    if (!url) return "";
    const base = url.replace(/\/+$/, "");
    return `${base}/rest/v1/`;
  }, [url]);

  const runRestFetch = useCallback(async () => {
    if (!url?.trim() || !anon?.trim()) {
      setRestState("err");
      setRestDetail("Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local");
      return;
    }
    setRestState("running");
    setRestDetail("");
    try {
      const base = url.replace(/\/+$/, "");
      const res = await fetch(`${base}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          Accept: "application/json",
        },
      });
      const text = await res.text();
      const ok = res.ok || res.status === 406;
      setRestState(ok ? "ok" : "err");
      setRestDetail(
        `HTTP ${res.status}\n${text.length > 800 ? `${text.slice(0, 800)}…` : text}`,
      );
    } catch (e) {
      setRestState("err");
      setRestDetail(e instanceof Error ? e.message : String(e));
    }
  }, [url, anon]);

  const runClientQuery = useCallback(async () => {
    if (!configured) {
      setClientState("err");
      setClientDetail("Cliente Supabase não configurado.");
      return;
    }
    setClientState("running");
    setClientDetail("");
    try {
      const supabase = getPainelSupabase();
      const { data, error } = await supabase.from("painel_schools").select("id,slug").limit(3);
      if (error) {
        setClientState("err");
        setClientDetail(`${error.message}\n(code: ${error.code ?? "—"})`);
        return;
      }
      setClientState("ok");
      setClientDetail(JSON.stringify(data, null, 2) || "[] (tabela vazia ou sem linhas)");
    } catch (e) {
      setClientState("err");
      setClientDetail(e instanceof Error ? e.message : String(e));
    }
  }, [configured]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Apenas desenvolvimento</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Teste Supabase (painel)</h1>
          <p className="mt-2 text-sm text-slate-600">
            Usa o <code className="rounded bg-slate-200 px-1">.env.local</code> do Vite. Reinicia{" "}
            <code className="rounded bg-slate-200 px-1">npm run dev</code> após alterar variáveis. Esta rota não
            existe no build de produção.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variáveis no bundle Vite</CardTitle>
            <CardDescription>Valores efetivos após o último restart do dev server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-500">VITE_SUPABASE_URL — </span>
              <span className="break-all text-slate-900">{url?.trim() || "(vazio)"}</span>
            </div>
            <div>
              <span className="text-slate-500">VITE_SUPABASE_ANON_KEY — </span>
              <span className="text-slate-900">{maskKey(anon)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. REST (fetch + apikey)</CardTitle>
            <CardDescription>
              Deve responder 200 ou 406 com chave; sem chave o PostgREST devolve “No API key”.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={runRestFetch} disabled={restState === "running"}>
                {restState === "running" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A testar…
                  </>
                ) : (
                  "Testar GET /rest/v1/"
                )}
              </Button>
              {restState === "ok" && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />}
              {restState === "err" && <XCircle className="h-5 w-5 text-red-600" aria-hidden />}
            </div>
            {restUrl ? (
              <a
                href={restUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                Abrir URL no browser (sem chave = erro esperado)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {restDetail ? (
              <pre className="max-h-64 overflow-auto rounded-md border bg-white p-3 text-xs text-slate-800">
                {restDetail}
              </pre>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Cliente @supabase/supabase-js</CardTitle>
            <CardDescription>
              Lê até 3 linhas de <code className="rounded bg-slate-100 px-1">painel_schools</code> (RLS aplicada)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={runClientQuery} disabled={clientState === "running" || !configured}>
                {clientState === "running" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A testar…
                  </>
                ) : (
                  "Testar select painel_schools"
                )}
              </Button>
              {clientState === "ok" && <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />}
              {clientState === "err" && <XCircle className="h-5 w-5 text-red-600" aria-hidden />}
            </div>
            {clientDetail ? (
              <pre className="max-h-64 overflow-auto rounded-md border bg-white p-3 text-xs text-slate-800">
                {clientDetail}
              </pre>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500">
          <Link to="/" className="text-blue-600 hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
