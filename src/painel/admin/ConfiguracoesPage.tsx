import { useEffect, useState } from "react";
import { getPainelSupabase } from "@/painel/supabaseClient";
import { fetchMyProfile } from "@/painel/fetchMyProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, Monitor, Link, Loader2 } from "lucide-react";
import { schoolDisplayName } from "@/painel/schoolDisplayName";
import { toast } from "sonner";

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [form, setForm] = useState({
    name: "",
    panel_message: "",
  });

  const supabase = getPainelSupabase();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!user) return;

      const profile = await fetchMyProfile();
      if (!profile) return;
      setSchoolId(profile.school_id);

      const { data: school } = await supabase
        .from("painel_schools")
        .select("*")
        .eq("id", profile.school_id)
        .single();

      if (school) {
        setForm({
          name: schoolDisplayName(school.name) ?? school.name,
          panel_message: school.panel_message ?? "",
        });
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("painel_schools")
      .update({ name: form.name, panel_message: form.panel_message })
      .eq("id", schoolId);

    if (error) {
      toast.error("Erro ao salvar configurações.");
    } else {
      toast.success("Configurações salvas com sucesso.");
    }
    setSaving(false);
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Configurações
        </h1>
        <p className="text-slate-500 text-sm mt-1">Personalize o sistema para sua escola</p>
      </div>

      <div className="space-y-6">
        {/* School info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações da Escola</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da escola</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Grupo CCI"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem do painel</Label>
              <Textarea
                value={form.panel_message}
                onChange={(e) => setForm({ ...form, panel_message: e.target.value })}
                placeholder="Mensagem exibida no painel TV e no totem"
                rows={3}
              />
              <p className="text-slate-400 text-xs">
                Esta mensagem aparece no rodapé do painel da TV e embaixo do nome no totem.
              </p>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Salvar alterações</>
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Quick links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="w-4 h-4" />
              Links do sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  label: "Totem (tablet da entrada)",
                  path: "/senhas/totem",
                  desc: "Abra em modo quiosque no tablet",
                },
                {
                  label: "Painel TV",
                  path: "/senhas/painel",
                  desc: "Abra em fullscreen na TV do corredor",
                },
                {
                  label: "Atendente",
                  path: "/senhas/atendente",
                  desc: "Para os funcionários da secretaria",
                },
              ].map(({ label, path, desc }) => (
                <div key={path} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 text-sm">{label}</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">{origin}{path}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(path, "_blank")}
                    >
                      Abrir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

