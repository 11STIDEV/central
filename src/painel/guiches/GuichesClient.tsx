import { useState } from "react";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { ServiceWindow } from "@/painel/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MonitorSpeaker } from "lucide-react";
import { toast } from "sonner";

interface GuichesClientProps {
  schoolId: string;
  serviceWindows: ServiceWindow[];
}

export default function GuichesClient({ schoolId, serviceWindows: initial }: GuichesClientProps) {
  const [windows, setWindows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceWindow | null>(null);
  const [form, setForm] = useState({ name: "", number: "" });
  const [saving, setSaving] = useState(false);
  const supabase = getPainelSupabase();

  function openNew() {
    setEditing(null);
    const nextNum = windows.length > 0 ? Math.max(...windows.map((w) => w.number)) + 1 : 1;
    setForm({ name: `Guichê ${nextNum}`, number: String(nextNum) });
    setOpen(true);
  }

  function openEdit(w: ServiceWindow) {
    setEditing(w);
    setForm({ name: w.name, number: String(w.number) });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.number) { toast.error("Preencha todos os campos."); return; }
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("painel_service_windows")
        .update({ name: form.name, number: Number(form.number) })
        .eq("id", editing.id);

      if (error) { toast.error(error.message); setSaving(false); return; }
      setWindows((prev) => prev.map((w) => w.id === editing.id ? { ...w, name: form.name, number: Number(form.number) } : w));
      toast.success("Guichê atualizado.");
    } else {
      const { data, error } = await supabase
        .from("painel_service_windows")
        .insert({ school_id: schoolId, name: form.name, number: Number(form.number) })
        .select()
        .single();

      if (error) { toast.error(error.message); setSaving(false); return; }
      setWindows((prev) => [...prev, data].sort((a, b) => a.number - b.number));
      toast.success("Guichê criado.");
    }

    setOpen(false);
    setSaving(false);
  }

  async function toggleActive(w: ServiceWindow) {
    await supabase
      .from("painel_service_windows")
      .update({ is_active: !w.is_active })
      .eq("id", w.id);

    setWindows((prev) => prev.map((sw) => sw.id === w.id ? { ...sw, is_active: !sw.is_active } : sw));
    toast.success(`Guichê ${w.is_active ? "desativado" : "ativado"}.`);
  }

  async function deleteWindow(w: ServiceWindow) {
    if (!confirm(`Deletar "${w.name}"?`)) return;
    const { error } = await supabase.from("painel_service_windows").delete().eq("id", w.id);
    if (error) { toast.error(error.message); return; }
    setWindows((prev) => prev.filter((sw) => sw.id !== w.id));
    toast.success("Guichê deletado.");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guichês</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie as mesas e guichês de atendimento</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Guichê
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Guichê" : "Novo Guichê"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Guichê 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    type="number"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    min={1}
                    className="text-center font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {windows.map((w) => (
          <Card key={w.id} className={w.is_active ? "" : "opacity-60"}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center">
                  <span className="text-primary font-black text-2xl">{w.number}</span>
                </div>
                <div>
                  <p className="font-bold text-foreground">{w.name}</p>
                  <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs mt-1">
                    {w.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(w)}>
                  <MonitorSpeaker className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteWindow(w)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {windows.length === 0 && (
          <div className="col-span-4 text-center py-12 text-muted-foreground">
            Nenhum guichê cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}

