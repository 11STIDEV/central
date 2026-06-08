import { useCallback, useEffect, useState } from "react";
import { ArrowUpDown, CircleDollarSign, Link2, Lock, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";
import { isRotaBloqueadaParaUsuario } from "@/auth/routesTemporarilyBlocked";
import { SetorLinksManageDialog } from "@/components/setores/SetorLinksManageDialog";
import { SetorLinksSortableGrid } from "@/components/setores/SetorLinksSortableGrid";
import { Button } from "@/components/ui/button";
import {
  PORTAL_COLABORADOR_DEFAULT_GROUPS,
  PORTAL_COLABORADOR_LINK_KEY,
} from "@/lib/portalColaboradorDefaults";
import { fetchSetorLinks, saveSetorLinks } from "@/lib/setorLinksApi";
import type { SectorLinkGroup } from "@/types/setorLinks";

/** Card fixo do sistema — não entra no JSON editável. */
const PORTAL_VALE_ADIANTAMENTO = {
  title: "Solicitar Vale-Adiantamento",
  description: "Pedido de vale para o financeiro",
  url: "/vale-adiantamento",
} as const;

function cloneGroups(groups: SectorLinkGroup[]): SectorLinkGroup[] {
  return groups.map((g) => ({
    title: g.title,
    links: g.links.map((l) => ({ ...l })),
  }));
}

function countEditableLinks(groups: SectorLinkGroup[]): number {
  return groups.reduce((total, group) => total + group.links.length, 0);
}

function flattenLinks(groups: SectorLinkGroup[]) {
  return groups.flatMap((g) => g.links);
}

export function PortalColaboradorLinksSection() {
  const { usuario, googleIdToken } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const isAdmin = usuario?.papeis.includes("admin") ?? false;

  const [groups, setGroups] = useState<SectorLinkGroup[]>(() =>
    cloneGroups(PORTAL_COLABORADOR_DEFAULT_GROUPS),
  );
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);
  const [groupsBeforeArrange, setGroupsBeforeArrange] = useState<SectorLinkGroup[] | null>(null);
  const [saving, setSaving] = useState(false);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    const result = await fetchSetorLinks(PORTAL_COLABORADOR_LINK_KEY);
    if (result.ok && result.groups) {
      setGroups(result.groups);
    } else {
      setGroups(cloneGroups(PORTAL_COLABORADOR_DEFAULT_GROUPS));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  async function persistGroups(
    nextGroups: SectorLinkGroup[],
    opts?: { closeManage?: boolean; exitArrange?: boolean },
  ) {
    if (!googleIdToken) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setSaving(true);
    const result = await saveSetorLinks(PORTAL_COLABORADOR_LINK_KEY, googleIdToken, nextGroups);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setGroups(result.groups);
    if (opts?.closeManage) setManageOpen(false);
    if (opts?.exitArrange) {
      setArrangeMode(false);
      setGroupsBeforeArrange(null);
    }
    toast.success("Links atualizados para todos os colaboradores.");
  }

  function handleSaveFromDialog(nextGroups: SectorLinkGroup[]) {
    void persistGroups(nextGroups, { closeManage: true });
  }

  function startArrangeMode() {
    setGroupsBeforeArrange(cloneGroups(groups));
    setArrangeMode(true);
  }

  function cancelArrangeMode() {
    if (groupsBeforeArrange) {
      setGroups(groupsBeforeArrange);
    }
    setGroupsBeforeArrange(null);
    setArrangeMode(false);
  }

  function saveArrangeOrder() {
    void persistGroups(groups, { exitArrange: true });
  }

  function reorderLinks(links: SectorLinkGroup["links"]) {
    setGroups((prev) => {
      if (prev.length === 0) {
        return [{ title: "Links", links }];
      }
      const [first, ...rest] = prev;
      return [{ ...first, links }, ...rest];
    });
  }

  const editableLinks = flattenLinks(groups);
  const editableCount = countEditableLinks(groups);
  const totalCards = 1 + editableCount;

  const podeAbrirVale = canAccessRoute(papeis, PORTAL_VALE_ADIANTAMENTO.url, usuario?.email);
  const valeBloqueado = isRotaBloqueadaParaUsuario(papeis, PORTAL_VALE_ADIANTAMENTO.url);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Serviços ao colaborador
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma opção para acessar o recurso externo ou interno.
            {loading ? " Carregando atalhos…" : null}
          </p>
          {isAdmin ? (
            <p className="mt-2 text-xs text-muted-foreground">
              O card <strong className="font-medium text-foreground">Vale-Adiantamento</strong> é fixo
              do sistema e não pode ser alterado aqui.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && !arrangeMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManageOpen(true)}
                disabled={loading}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Gerenciar atalhos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startArrangeMode}
                disabled={loading || editableCount === 0}
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Organizar ordem
              </Button>
            </>
          ) : null}
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            {totalCards} {totalCards === 1 ? "serviço" : "serviços"}
          </span>
        </div>
      </div>

      <SetorLinksManageDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        groups={groups}
        saving={saving}
        onSave={(g) => void handleSaveFromDialog(g)}
        description="Adicione, edite ou remova formulários externos (http/https). O Vale-Adiantamento não aparece aqui — é configurado apenas no código."
      />

      {arrangeMode ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            Arraste pelo ícone <span className="font-medium">≡</span> nos formulários editáveis. O
            Vale-Adiantamento permanece sempre primeiro.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={cancelArrangeMode} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={saveArrangeOrder} disabled={saving}>
              {saving ? "Salvando…" : "Salvar ordem"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {podeAbrirVale ? (
          <Link
            to={PORTAL_VALE_ADIANTAMENTO.url}
            className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden />
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-base font-semibold leading-snug text-card-foreground">
                {PORTAL_VALE_ADIANTAMENTO.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">{PORTAL_VALE_ADIANTAMENTO.description}</p>
            </div>
          </Link>
        ) : (
          <button
            type="button"
            disabled={valeBloqueado}
            aria-disabled={valeBloqueado}
            title={valeBloqueado ? "Em breve — funcionalidade em revisão" : undefined}
            className={`group flex min-h-[132px] flex-col justify-between rounded-xl border p-5 text-left ${
              valeBloqueado
                ? "cursor-not-allowed border-dashed border-border bg-muted/30 opacity-80"
                : "border-border bg-card shadow-card"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <CircleDollarSign className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              {valeBloqueado ? (
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
            </div>
            <div className="mt-5">
              <h3 className="text-base font-semibold leading-snug text-card-foreground">
                {PORTAL_VALE_ADIANTAMENTO.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">{PORTAL_VALE_ADIANTAMENTO.description}</p>
              {valeBloqueado ? (
                <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
                  Em breve
                </p>
              ) : null}
            </div>
          </button>
        )}

        {arrangeMode ? (
          <div className="col-span-full">
            <SetorLinksSortableGrid
              groupTitle="portal-colaborador"
              links={editableLinks}
              arrangeMode
              onReorder={reorderLinks}
            />
          </div>
        ) : (
          editableLinks.map((link) => (
            <a
              key={`${link.url}-${link.title}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-[132px] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Link2 className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <div className="mt-5">
                <h3 className="text-base font-semibold leading-snug text-card-foreground">{link.title}</h3>
                <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{link.url}</p>
              </div>
            </a>
          ))
        )}
      </div>
    </section>
  );
}
