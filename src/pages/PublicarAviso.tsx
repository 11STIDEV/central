import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle, LogIn, Megaphone, Send } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { useAuth } from "@/auth/AuthProvider";
import {
  AVISO_TIPOS,
  criarAviso,
  type AvisoSetor,
  type AvisoTipo,
} from "@/lib/avisos";
import { setoresAvisoParaUsuario } from "@/lib/avisosAccess";

export default function PublicarAviso() {
  const { usuario, googleIdToken } = useAuth();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const setoresPermitidos = useMemo(
    () => (usuario ? setoresAvisoParaUsuario(usuario.papeis) : []),
    [usuario],
  );

  const [form, setForm] = useState({
    titulo: "",
    conteudo: "",
    tipo: "aviso" as AvisoTipo,
    setor: "institucional" as AvisoSetor,
  });

  useEffect(() => {
    if (setoresPermitidos.length === 0) return;
    const atualPermitido = setoresPermitidos.some((s) => s.value === form.setor);
    if (!atualPermitido) {
      setForm((prev) => ({ ...prev, setor: setoresPermitidos[0].value }));
    }
  }, [setoresPermitidos, form.setor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !googleIdToken) return;

    const titulo = form.titulo.trim();
    const conteudo = form.conteudo.trim();
    if (!titulo || !conteudo) {
      setErro("Preencha o título e o conteúdo do aviso.");
      return;
    }

    setErro(null);
    setEnviando(true);
    try {
      await criarAviso(googleIdToken, {
        titulo,
        conteudo,
        tipo: form.tipo,
        setor: form.setor,
      });
      setSubmitted(true);
      setTimeout(() => {
        navigate("/avisos");
      }, 1800);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao publicar aviso.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Publicar aviso"
        subtitle="Publique comunicados para toda a instituição ou setores específicos. Restrito a administradores."
      />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
        {!usuario ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <LogIn className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground">Entre para publicar um aviso</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O aviso será vinculado ao seu nome e e-mail.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center rounded-lg gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Ir para o login
            </Link>
          </div>
        ) : submitted ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-card-foreground">Aviso publicado!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Redirecionando para a lista de avisos...</p>
          </div>
        ) : setoresPermitidos.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground">Acesso restrito</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Apenas administradores podem publicar avisos. Se você precisa de acesso, entre em contato com o administrador do sistema.
            </p>
            <Link
              to="/avisos"
              className="mt-6 inline-flex items-center justify-center rounded-lg border border-border px-6 py-2.5 text-sm font-medium text-foreground"
            >
              Voltar aos avisos
            </Link>
          </div>

        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg"
          >
            <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground">
              <Megaphone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p>Publicando como <strong>{usuario.nome}</strong></p>
            </div>

            {erro && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                <p>{erro}</p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Título</label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ex.: Reunião geral na próxima segunda-feira"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Setor</label>
                <select
                  required
                  value={form.setor}
                  onChange={(e) => setForm({ ...form, setor: e.target.value as AvisoSetor })}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {setoresPermitidos.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Tipo</label>
                <select
                  required
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value as AvisoTipo })}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {AVISO_TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Conteúdo</label>
              <textarea
                required
                rows={8}
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                placeholder="Descreva o aviso com clareza: data, local, público-alvo e orientações..."
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Link
                to="/avisos"
                className="inline-flex items-center justify-center rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={enviando}
                className="inline-flex items-center justify-center gap-2 rounded-xl gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {enviando ? "Publicando..." : "Publicar aviso"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
