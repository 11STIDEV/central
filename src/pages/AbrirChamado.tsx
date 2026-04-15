import { useState } from "react";
import { Send, AlertCircle, CheckCircle, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import { adicionarChamado, papelPrincipalUsuario } from "@/lib/chamados";
import type { Chamado } from "@/lib/chamados";

const categories = [
  "Hardware",
  "Software",
  "Rede / Internet",
  "E-mail",
  "Impressora",
  "Telefonia",
  "Acesso / Permissão",
  "Outro",
];

const priorities = [
  { value: "baixa", label: "Baixa", color: "bg-success" },
  { value: "media", label: "Média", color: "bg-warning" },
  { value: "alta", label: "Alta", color: "bg-destructive" },
];

export default function AbrirChamado() {
  const { usuario } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    categoria: "",
    prioridade: "media" as "baixa" | "media" | "alta",
    descricao: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario) return;

    const novo: Chamado = {
      id: `CHM-${Date.now()}`,
      titulo: form.titulo.trim(),
      solicitante: usuario.nome,
      solicitanteEmail: usuario.email,
      papelAbertura: papelPrincipalUsuario(usuario.papeis),
      categoria: form.categoria,
      prioridade: form.prioridade,
      status: "aberto",
      data: new Date().toLocaleDateString("pt-BR"),
      descricao: form.descricao.trim(),
      acompanhamentos: [],
      tarefas: [],
    };
    adicionarChamado(novo);

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ titulo: "", categoria: "", prioridade: "media", descricao: "" });
    }, 3000);
  };

  return (
    <div className="animate-fade-in">
      <PageHero title="Abrir Chamado" subtitle="Solicite suporte da equipe de TI" />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {!usuario ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <LogIn className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground">Entre para abrir um chamado</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O chamado será vinculado ao seu e-mail e ao seu perfil para acompanhamento na gestão.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center rounded-lg gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ir para o login
            </Link>
          </div>
        ) : submitted ? (
          <div className="animate-fade-in rounded-2xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-xl shadow-slate-900/5 backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Chamado aberto com sucesso!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Você receberá atualizações sobre o andamento.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-900/5 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 rounded-xl border border-sky-200/60 bg-sky-50/80 px-4 py-3 text-sky-900">
              <AlertCircle className="h-4 w-4 shrink-0 text-sky-600" />
              <p className="text-sm">Preencha todos os campos para abrir seu chamado.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Título</label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Descreva brevemente o problema"
                className="w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Categoria</label>
                <select
                  required
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                >
                  <option value="">Selecione...</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Prioridade</label>
                <div className="flex gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, prioridade: p.value })}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                        form.prioridade === p.value
                          ? "border-primary bg-primary/5 text-primary shadow-sm"
                          : "border-slate-200/90 text-muted-foreground hover:border-primary/25"
                      }`}
                    >
                      <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${p.color}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Descrição detalhada</label>
              <textarea
                required
                rows={5}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                className="w-full rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              />
            </div>

            <button
              type="submit"
              disabled={!usuario}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Enviar Chamado
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
