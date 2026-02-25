import { useState } from "react";
import { Send, AlertCircle, CheckCircle } from "lucide-react";

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
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    titulo: "",
    categoria: "",
    prioridade: "media",
    descricao: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ titulo: "", categoria: "", prioridade: "media", descricao: "" });
    }, 3000);
  };

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-primary-foreground">Abrir Chamado</h1>
          <p className="mt-2 text-primary-foreground/70">Solicite suporte da equipe de TI</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-8">
        {submitted ? (
          <div className="animate-fade-in rounded-xl border border-border bg-card p-12 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Chamado aberto com sucesso!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Você receberá atualizações sobre o andamento.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-8 shadow-card">
            <div className="flex items-center gap-2 rounded-lg bg-info/10 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-info" />
              <p className="text-sm text-info">Preencha todos os campos para abrir seu chamado.</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Título</label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Descreva brevemente o problema"
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">Categoria</label>
                <select
                  required
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Selecione...</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-card-foreground">Prioridade</label>
                <div className="flex gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, prioridade: p.value })}
                      className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                        form.prioridade === p.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
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
              <label className="mb-1.5 block text-sm font-medium text-card-foreground">Descrição detalhada</label>
              <textarea
                required
                rows={5}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
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
