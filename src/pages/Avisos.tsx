import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertCircle, Megaphone, PenLine, Search } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import {
  AVISO_TIPOS,
  labelSetorAviso,
  labelTipoAviso,
  listarAvisos,
} from "@/lib/avisos";
import { setoresAvisoParaUsuario } from "@/lib/avisosAccess";
import type { Aviso, AvisoSetor, AvisoTipo } from "@/lib/avisos";

const tipoBadgeClass: Record<AvisoTipo, string> = {
  aviso: "bg-secondary/80 text-secondary-foreground",
  informativo: "bg-primary/10 text-primary",
  urgente: "bg-destructive/10 text-destructive",
  tutorial: "bg-success/10 text-success",
  atualizacao: "bg-warning/10 text-warning",
};

export default function Avisos() {
  const { usuario, googleIdToken } = useAuth();
  const setoresFiltro = useMemo(
    () => (usuario ? setoresAvisoParaUsuario(usuario.papeis) : []),
    [usuario],
  );
  const location = useLocation();
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filtroSetor, setFiltroSetor] = useState<AvisoSetor | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<AvisoTipo | "todos">("todos");

  const recarregar = useCallback(async () => {
    if (!googleIdToken) {
      setAvisos([]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErroCarregar(null);
    try {
      const lista = await listarAvisos(googleIdToken);
      setAvisos(lista);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : "Erro ao carregar avisos.");
      setAvisos([]);
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    if (location.pathname === "/avisos") {
      void recarregar();
    }
  }, [location.pathname, location.key, recarregar]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return avisos.filter((a) => {
      const matchSetor = filtroSetor === "todos" || a.setor === filtroSetor;
      const matchTipo = filtroTipo === "todos" || a.tipo === filtroTipo;
      const matchSearch =
        !q ||
        a.titulo.toLowerCase().includes(q) ||
        a.conteudo.toLowerCase().includes(q) ||
        a.autor.toLowerCase().includes(q) ||
        labelSetorAviso(a.setor).toLowerCase().includes(q);
      return matchSetor && matchTipo && matchSearch;
    });
  }, [avisos, search, filtroSetor, filtroTipo]);

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Avisos"
        subtitle="Comunicados da Direção e dos setores do Grupo CCI"
      />

      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        {usuario?.papeis.includes("admin") && (
          <div className="mb-6 flex justify-end">
            <Link
              to="/avisos/publicar"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PenLine className="h-4 w-4" />
              Publicar aviso
            </Link>
          </div>
        )}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar avisos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <select
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value as AvisoSetor | "todos")}
            className="rounded-xl border border-input bg-card px-4 py-3 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="todos">Todos os setores</option>
            {setoresFiltro.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as AvisoTipo | "todos")}
            className="rounded-xl border border-input bg-card px-4 py-3 text-sm text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="todos">Todos os tipos</option>
            {AVISO_TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {erroCarregar && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            <p>{erroCarregar}</p>
          </div>
        )}

        {carregando ? (
          <div className="rounded-xl border border-border bg-card px-6 py-14 text-center text-sm text-muted-foreground">
            Carregando avisos...
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filtrados.map((aviso) => (
                <article
                  key={aviso.id}
                  className="rounded-xl border border-border bg-card p-6 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Megaphone className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-card-foreground">{aviso.titulo}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {labelSetorAviso(aviso.setor)} · {aviso.autor} · {aviso.data}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${tipoBadgeClass[aviso.tipo]}`}
                    >
                      {labelTipoAviso(aviso.tipo)}
                    </span>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-card-foreground">
                    {aviso.conteudo}
                  </p>
                </article>
              ))}
            </div>

            {filtrados.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
                <Megaphone className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  {avisos.length === 0
                    ? "Ainda não há avisos publicados."
                    : "Nenhum aviso corresponde aos filtros selecionados."}
                </p>
                {avisos.length === 0 && usuario?.papeis.includes("admin") ? (
                  <Link
                    to="/avisos/publicar"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <PenLine className="h-4 w-4" />
                    Publicar o primeiro aviso
                  </Link>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
