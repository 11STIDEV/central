import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectorLinkGroup } from "@/types/setorLinks";

function cloneGroups(groups: SectorLinkGroup[]): SectorLinkGroup[] {
  return groups.map((g) => ({
    title: g.title,
    links: g.links.map((l) => ({ ...l })),
  }));
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: SectorLinkGroup[];
  saving: boolean;
  onSave: (groups: SectorLinkGroup[]) => void;
};

export function SetorLinksManageDialog({
  open,
  onOpenChange,
  groups,
  saving,
  onSave,
}: Props) {
  const [draft, setDraft] = useState<SectorLinkGroup[]>(() => cloneGroups(groups));

  useEffect(() => {
    if (open) {
      setDraft(cloneGroups(groups));
    }
  }, [open, groups]);

  function updateLink(
    groupIndex: number,
    linkIndex: number,
    field: "title" | "url",
    value: string,
  ) {
    setDraft((prev) => {
      const next = cloneGroups(prev);
      next[groupIndex].links[linkIndex] = {
        ...next[groupIndex].links[linkIndex],
        [field]: value,
      };
      return next;
    });
  }

  function removeLink(groupIndex: number, linkIndex: number) {
    setDraft((prev) => {
      const next = cloneGroups(prev);
      next[groupIndex].links.splice(linkIndex, 1);
      return next.filter((g) => g.links.length > 0);
    });
  }

  function addLink(groupIndex: number) {
    setDraft((prev) => {
      const next = cloneGroups(prev);
      if (!next[groupIndex]) return next;
      next[groupIndex].links.push({ title: "", url: "" });
      return next;
    });
  }

  function handleSave() {
    const trimmed = draft
      .map((g) => ({
        title: g.title.trim() || "Links",
        links: g.links
          .map((l) => ({ title: l.title.trim(), url: l.url.trim() }))
          .filter((l) => l.title && l.url),
      }))
      .filter((g) => g.links.length > 0);

    if (trimmed.length === 0) {
      return;
    }
    onSave(trimmed);
  }

  const totalLinks = draft.reduce((n, g) => n + g.links.length, 0);
  const canSave = totalLinks > 0 && draft.every((g) =>
    g.links.every((l) => l.title.trim() && l.url.trim()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar atalhos</DialogTitle>
          <DialogDescription>
            Adicione, edite ou remova links. URLs devem começar com http:// ou https://. As alterações
            valem para todos os utilizadores com acesso a esta página.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {draft.map((group, gi) => (
            <div key={`${group.title}-${gi}`} className="space-y-3">
              <p className="text-sm font-semibold text-foreground">{group.title}</p>
              <div className="space-y-3">
                {group.links.map((link, li) => (
                  <div
                    key={`${gi}-${li}`}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end"
                  >
                    <div className="grid flex-1 gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={link.title}
                          onChange={(e) => updateLink(gi, li, "title", e.target.value)}
                          placeholder="Nome do atalho"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input
                          value={link.url}
                          onChange={(e) => updateLink(gi, li, "url", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeLink(gi, li)}
                      aria-label="Remover link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => addLink(gi)}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar link
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !canSave}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
