import { useState } from "react";
import { useAuth } from "@/auth/AuthProvider";
import { getPainelSupabase } from "@/painel/supabaseClient";
import type { Profile, ServiceWindow } from "@/painel/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Shield, User, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";

interface ProfileWithWindow extends Profile {
  service_window: { name: string; number: number } | null;
}

interface AtendentesClientProps {
  schoolId: string;
  attendants: ProfileWithWindow[];
  serviceWindows: ServiceWindow[];
}

export default function AtendentesClient({ schoolId, attendants: initial, serviceWindows }: AtendentesClientProps) {
  const [attendants, setAttendants] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileWithWindow | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "attendant" as "admin" | "attendant",
    service_window_id: "",
  });
  const [saving, setSaving] = useState(false);
  const { googleIdToken } = useAuth();
  const supabase = getPainelSupabase();

  function openNew() {
    setEditing(null);
    setForm({ full_name: "", email: "", password: "", role: "attendant", service_window_id: "" });
    setOpen(true);
  }

  function openEdit(a: ProfileWithWindow) {
    setEditing(a);
    setForm({
      full_name: a.full_name,
      email: "",
      password: "",
      role: a.role,
      service_window_id: a.service_window_id ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.full_name) { toast.error("Nome é obrigatório."); return; }
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("painel_profiles")
        .update({
          full_name: form.full_name,
          role: form.role,
          service_window_id: form.service_window_id || null,
        })
        .eq("id", editing.id);

      if (error) { toast.error(error.message); setSaving(false); return; }

      const sw = serviceWindows.find((w) => w.id === form.service_window_id);
      setAttendants((prev) => prev.map((a) =>
        a.id === editing.id
          ? { ...a, full_name: form.full_name, role: form.role, service_window_id: form.service_window_id || null, service_window: sw ? { name: sw.name, number: sw.number } : null }
          : a
      ));
      toast.success("Atendente atualizado.");
    } else {
      if (!form.email || !form.password) {
        toast.error("E-mail e senha são obrigatórios para novo usuário.");
        setSaving(false);
        return;
      }

      if (!googleIdToken) {
        toast.error("Sessão Google necessária para criar usuário.");
        setSaving(false);
        return;
      }

      const res = await fetch(apiUrl("/api/painel/create-user"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          role: form.role,
          service_window_id: form.service_window_id || null,
          school_id: schoolId,
        }),
      });

      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? "Erro ao criar usuário."); setSaving(false); return; }

      const sw = serviceWindows.find((w) => w.id === form.service_window_id);
      setAttendants((prev) => [...prev, { ...result.profile, service_window: sw ? { name: sw.name, number: sw.number } : null }]);
      toast.success("Usuário criado com sucesso.");
    }

    setOpen(false);
    setSaving(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Atendentes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os usuários do sistema</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Maria da Silva"
                />
              </div>
              {!editing && (
                <>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="maria@escola.edu.br"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha inicial</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: (v ?? form.role) as "admin" | "attendant" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attendant">Atendente</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Guichê padrão</Label>
                  <Select
                    value={form.service_window_id}
                    onValueChange={(v) => setForm({ ...form, service_window_id: v ?? "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {serviceWindows.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Guichê padrão</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendants.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                        {a.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{a.full_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={a.role === "admin" ? "default" : "secondary"}>
                    {a.role === "admin" ? <><Shield className="w-3 h-3 mr-1" />Admin</> : <><User className="w-3 h-3 mr-1" />Atendente</>}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground text-sm">
                    {a.service_window ? `${a.service_window.name} (${a.service_window.number})` : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {attendants.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
        <KeyRound className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-amber-700 text-sm">
          Para redefinir a senha de um usuário, acesse o painel do Supabase → Authentication → Users.
        </p>
      </div>
    </div>
  );
}

