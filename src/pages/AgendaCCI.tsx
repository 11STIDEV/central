import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CalendarDays, Laptop, Layers, MapPin, Package } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import type { ReservaAgendaCCI } from "@/lib/agendaCci";
import {
  STORAGE_KEY_AGENDA_CCI,
  carregarReservasAgenda,
  formatarYmdParaBR,
  limitesDatasReservaSemanaCorrente,
  obterReservasDoServidor,
  textoResumoAgenda,
  toMinutes,
  toYmdLocal,
} from "@/lib/agendaCci";

/** Dias do período liberado para reservas (hoje até sábado da semana corrente). */
function diasPeriodoReserva(agora = new Date()): string[] {
  const { min, max } = limitesDatasReservaSemanaCorrente(agora);
  const [y1, m1, d1] = min.split("-").map(Number);
  const [y2, m2, d2] = max.split("-").map(Number);
  const out: string[] = [];
  const cur = new Date(y1, m1 - 1, d1);
  const fim = new Date(y2, m2 - 1, d2);
  while (cur <= fim) {
    out.push(toYmdLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function tituloDia(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const base = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export default function AgendaCCI() {
  const location = useLocation();
  const { usuario, googleIdToken } = useAuth();
  const [reservas, setReservas] = useState<ReservaAgendaCCI[]>(() => carregarReservasAgenda());

  useEffect(() => {
    if (!googleIdToken || !usuario || location.pathname !== "/agenda-cci") return;
    let cancelado = false;
    (async () => {
      const r = await obterReservasDoServidor(googleIdToken);
      if (cancelado || !r) return;
      try {
        localStorage.setItem(STORAGE_KEY_AGENDA_CCI, JSON.stringify(r));
      } catch {
        /* ignore */
      }
      setReservas(r);
    })();
    return () => {
      cancelado = true;
    };
  }, [googleIdToken, usuario, location.pathname]);

  const dias = useMemo(() => diasPeriodoReserva(new Date()), []);
  const { min: dataMin, max: dataMax } = limitesDatasReservaSemanaCorrente(new Date());

  const reservasAtivas = useMemo(
    () => reservas.filter((r) => r.status === "ativa"),
    [reservas],
  );

  const porDia = useMemo(() => {
    const map = new Map<string, ReservaAgendaCCI[]>();
    for (const ymd of dias) {
      const lista = reservasAtivas
        .filter((r) => r.data === ymd)
        .sort((a, b) => toMinutes(a.inicio) - toMinutes(b.inicio));
      map.set(ymd, lista);
    }
    return map;
  }, [dias, reservasAtivas]);

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                <CalendarDays className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-primary-foreground">Agenda CCI</h1>
                <p className="mt-1 max-w-2xl text-primary-foreground/70">
                  Visão da semana: reservas ativas de Chromebooks, equipamentos e espaços. Para criar
                  ou cancelar uma reserva, use{" "}
                  <strong className="text-primary-foreground/90">Reserva de Equipamentos e Espaços</strong>.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              className="shrink-0 bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25"
            >
              <Link to="/reserva-espacos-equipamentos">Ir para reservas</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <p className="mb-6 text-sm text-muted-foreground">
          Período exibido:{" "}
          <strong>
            {formatarYmdParaBR(dataMin)} a {formatarYmdParaBR(dataMax)}
          </strong>{" "}
          (mesma janela em que novas reservas podem ser feitas).
        </p>

        <div className="space-y-8">
          {dias.map((ymd) => {
            const lista = porDia.get(ymd) ?? [];
            const hoje = toYmdLocal(new Date()) === ymd;
            return (
              <section key={ymd}>
                <h2
                  className={`mb-3 border-b border-border pb-2 text-lg font-semibold ${
                    hoje ? "text-primary" : "text-foreground"
                  }`}
                >
                  {tituloDia(ymd)}
                  {hoje && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(hoje)</span>
                  )}
                </h2>
                {lista.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                    Nenhuma reserva ativa neste dia.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {lista.map((r) => (
                      <li
                        key={r.id}
                        className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          {r.tipo === "composta" && (
                            <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          {r.tipo === "chromebook" && (
                            <Laptop className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          {r.tipo === "equipamento" && (
                            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          {r.tipo === "espaco" && (
                            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            {r.titulo && (
                              <p className="font-semibold text-card-foreground">{r.titulo}</p>
                            )}
                            <p className="font-medium text-card-foreground">
                              {r.inicio} – {r.fim}
                            </p>
                            <p className="text-sm text-muted-foreground">{textoResumoAgenda(r)}</p>
                          </div>
                        </div>
                        <div className="text-left text-sm text-muted-foreground sm:text-right">
                          <p className="font-medium text-foreground">{r.solicitanteNome}</p>
                          <p className="text-xs">{r.solicitanteEmail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
