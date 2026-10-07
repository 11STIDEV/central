import { useState, useRef, useEffect, useMemo } from "react";
import { Check, ChevronDown, Globe, Lock, Search, X } from "lucide-react";
import { SETORES_CONFIG } from "@/navigation/setoresConfig";

interface SetorRestritoSelectProps {
  value: string;
  onChange: (value: string) => void;
}

// Lista oficial com todos os setores cadastrados no sistema
const TODOS_SETORES_SISTEMA = SETORES_CONFIG.map((s) => s.label).sort((a, b) =>
  a.localeCompare(b, "pt-BR")
);

export function SetorRestritoSelect({ value, onChange }: SetorRestritoSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Analisa os setores atualmente selecionados a partir do texto separado por vírgulas
  const setoresSelecionados = useMemo(() => {
    if (!value || value.trim() === "" || value.toLowerCase() === "todos os setores") {
      return [];
    }
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  const isPublicoTodos = setoresSelecionados.length === 0;

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    if (aberto) {
      document.addEventListener("mousedown", handleClickFora);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
    };
  }, [aberto]);

  // Ações de seleção
  function selecionarTodos() {
    onChange("");
  }

  function toggleSetor(setor: string) {
    if (setoresSelecionados.includes(setor)) {
      const novos = setoresSelecionados.filter((s) => s !== setor);
      onChange(novos.length === 0 ? "" : novos.join(", "));
    } else {
      const novos = [...setoresSelecionados, setor];
      onChange(novos.join(", "));
    }
  }

  function removerSetor(setor: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const novos = setoresSelecionados.filter((s) => s !== setor);
    onChange(novos.length === 0 ? "" : novos.join(", "));
  }

  const setoresFiltrados = useMemo(() => {
    if (!busca.trim()) return TODOS_SETORES_SISTEMA;
    const termo = busca.toLowerCase();
    return TODOS_SETORES_SISTEMA.filter((s) => s.toLowerCase().includes(termo));
  }, [busca]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botão de disparo do dropdown */}
      <div
        onClick={() => setAberto(!aberto)}
        className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2 transition-all ${
          aberto
            ? "border-primary ring-2 ring-primary/20 bg-background"
            : "border-input bg-background dark:border-white/10 dark:bg-white/5 hover:border-primary/50"
        }`}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {isPublicoTodos ? (
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Globe className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm font-medium text-foreground">
                Publicado em todos os setores
              </span>
              <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Público
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-primary dark:text-blue-400">
                <Lock className="h-3.5 w-3.5" />
              </span>
              {setoresSelecionados.map((setor) => (
                <span
                  key={setor}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-medium text-primary dark:text-blue-300"
                >
                  {setor}
                  <button
                    type="button"
                    onClick={(e) => removerSetor(setor, e)}
                    className="hover:bg-primary/20 rounded p-0.5 text-primary dark:text-blue-300 transition"
                    title={`Remover ${setor}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-muted-foreground pl-2">
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Menu suspenso flutuante */}
      {aberto && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-hidden rounded-2xl border border-border bg-popover shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Campo de pesquisa de setores */}
          <div className="border-b border-border p-2.5 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Pesquisar setor..."
                className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-60 p-2 space-y-1">
            {/* Opção Todos os Setores */}
            <button
              type="button"
              onClick={selecionarTodos}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                isPublicoTodos
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Globe className="h-3 w-3" />
                </span>
                <div>
                  <div className="font-semibold">Publicar em todos os setores</div>
                  <div className="text-[10px] text-muted-foreground">Disponível para qualquer colaborador</div>
                </div>
              </div>
              {isPublicoTodos && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
              )}
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-2 px-3 py-1.5">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ou selecionar setores restritos
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Lista dos setores disponíveis */}
            {setoresFiltrados.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum setor encontrado para "{busca}".
              </div>
            ) : (
              setoresFiltrados.map((setor) => {
                const selecionado = setoresSelecionados.includes(setor);
                return (
                  <button
                    key={setor}
                    type="button"
                    onClick={() => toggleSetor(setor)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                      selecionado
                        ? "bg-primary/10 text-primary font-semibold border border-primary/20 dark:text-blue-300"
                        : "text-foreground hover:bg-muted font-normal"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition ${
                          selecionado
                            ? "border-primary bg-primary text-primary-foreground dark:border-blue-500 dark:bg-blue-600 dark:text-white"
                            : "border-muted-foreground/30 bg-background"
                        }`}
                      >
                        {selecionado && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                      <span>{setor}</span>
                    </div>

                    {selecionado && (
                      <span className="text-[10px] text-primary dark:text-blue-400 font-medium">
                        Restrito
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé com atalhos */}
          <div className="border-t border-border bg-muted/20 px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">
              {isPublicoTodos
                ? "Visível para toda a instituição"
                : `${setoresSelecionados.length} setor(es) selecionado(s)`}
            </span>
            <div className="flex items-center gap-2">
              {!isPublicoTodos && (
                <button
                  type="button"
                  onClick={selecionarTodos}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Tornar público
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
