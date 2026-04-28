import { useState } from "react";
import type { Queue } from "@/painel/types/database";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

interface FilasClientProps {
  schoolId: string;
  queues: Queue[];
}

export default function FilasClient({ schoolId, queues: initialQueues }: FilasClientProps) {
  const [queues, setQueues] = useState(initialQueues);
  const [open, setOpen] = useState(false);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [form, setForm] = useState({ name: "", prefix: "", description: "", priority_order: "0" });
  const [saving, setSaving] = useState(false);
  const supabase = getPainelSupabase();

  function openNew() {
    setEditingQueue(null);
    setForm({ name: "", prefix: "", description: "", priority_order: String(queues.length + 1) });
    setOpen(true);
  }

  function openEdit(queue: Queue) {
    setEditingQueue(queue);
    setForm({
      name: queue.name,
      prefix: queue.prefix,
      description: queue.description ?? "",
      priority_order: String(queue.priority_order),
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.prefix) {
      toast.error("Nome e prefixo são obrigatórios.");
      return;
    }
    setSaving(true);

    if (editingQueue) {
      const prefix = String(form.prefix).trim().slice(0, 1).toUpperCase();
      if (!prefix) {
        toast.error("Prefixo inválido.");
        setSaving(false);
        return;
      }
      const { data, error } = await supabase
        .from("painel_queues")
        .update({
          name: form.name.trim(),
          prefix,
          description: form.description.trim() || null,
          priority_order: Number(form.priority_order),
        })
        .eq("id", editingQueue.id)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      if (data) {
        setQueues((prev) => prev.map((q) => (q.id === editingQueue.id ? (data as Queue) : q)));
      }
      toast.success("Fila atualizada.");
    } else {
      const prefix = String(form.prefix).trim().slice(0, 1).toUpperCase();
      if (!prefix) {
        toast.error("Prefixo é obrigatório (1 letra).");
        setSaving(false);
        return;
      }
      const { data, error } = await supabase
        .from("painel_queues")
        .insert({
          school_id: schoolId,
          name: form.name.trim(),
          prefix,
          description: form.description.trim() || null,
          priority_order: Number(form.priority_order),
        })
        .select()
        .single();

      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      if (data) setQueues((prev) => [...prev, data as Queue]);
      toast.success("Fila criada.");
    }

    setOpen(false);
    setSaving(false);
  }

  async function toggleActive(queue: Queue) {
    const { error } = await supabase
      .from("painel_queues")
      .update({ is_active: !queue.is_active })
      .eq("id", queue.id);

    if (error) {
      toast.error(error.message);
      return;
    }
    setQueues((prev) => prev.map((q) => (q.id === queue.id ? { ...q, is_active: !q.is_active } : q)));
    toast.success(`Fila ${queue.is_active ? "desativada" : "ativada"}.`);
  }

  async function deleteQueue(queue: Queue) {
    if (!confirm(`Deletar a fila "${queue.name}"? Isso apagará todas as senhas associadas.`)) return;

    const { error } = await supabase.from("painel_queues").delete().eq("id", queue.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setQueues((prev) => prev.filter((q) => q.id !== queue.id));
    toast.success("Fila deletada.");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filas de Atendimento</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os tipos de atendimento disponíveis</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Fila
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingQueue ? "Editar Fila" : "Nova Fila"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome da fila</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Matrícula"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prefixo</Label>
                  <Input
                    value={form.prefix}
                    onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase().slice(0, 1) })}
                    placeholder="M"
                    maxLength={1}
                    className="text-center font-bold text-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição exibida no totem"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem de prioridade</Label>
                <Input
                  type="number"
                  value={form.priority_order}
                  onChange={(e) => setForm({ ...form, priority_order: e.target.value })}
                  min={0}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {queues.map((queue) => (
          <Card key={queue.id} className={queue.is_active ? "" : "opacity-60"}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center">
                    <span className="text-primary font-black text-lg">{queue.prefix}</span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{queue.name}</CardTitle>
                    <Badge variant={queue.is_active ? "default" : "secondary"} className="text-xs mt-1">
                      {queue.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {queue.description && <p className="text-muted-foreground text-sm mb-4">{queue.description}</p>}
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(queue)}>
                  <Pencil className="w-3 h-3 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(queue)}>
                  {queue.is_active ? (
                    <>
                      <ToggleRight className="w-3 h-3 mr-1" /> Desativar
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-3 h-3 mr-1" /> Ativar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteQueue(queue)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {queues.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            <p>Nenhuma fila cadastrada. Clique em &quot;Nova Fila&quot; para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
