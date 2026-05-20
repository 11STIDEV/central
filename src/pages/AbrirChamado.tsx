import { useState } from "react";
import { Send, AlertCircle, CheckCircle, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import { criarChamado } from "@/lib/chamados";

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
  const { usuario, googleIdToken } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    categoria: "",
    prioridade: "media" as "baixa" | "media" | "alta",
    descricao: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !googleIdToken || enviando) return;

    setEnviando(true);
    setErroEnvio(null);
    try {
      await criarChamado(googleIdToken, {
        titulo: form.titulo.trim(),
        categoria: form.categoria,
        prioridade: form.prioridade,
        descricao: form.descricao.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ titulo: "", categoria: "", prioridade: "media", descricao: "" });
      }, 3000);
    } catch (err) {
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero title="Abrir Chamado" subtitle="Solicite suporte da equipe de TI" />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {!usuario ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg backdrop-blur-sm">
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
          <div className="animate-fade-in rounded-2xl border border-border bg-card p-12 text-center shadow-lg backdrop-blur-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Chamado aberto com sucesso!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Você receberá atualizações sobre o andamento.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg backdrop-blur-sm"
          >
            {erroEnvio && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <p>{erroEnvio}</p>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">
              <AlertCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p>Preencha todos os campos para abrir seu chamado.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Título</label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Descreva brevemente o problema"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-shadow focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Categoria</label>
                <select
                  required
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground ring-offset-background focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
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
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <button
              type="submit"
              disabled={!usuario || !googleIdToken || enviando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-blue-600 px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-95 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {enviando ? "Enviando..." : "Enviar Chamado"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
