import { useState } from "react";
import { Send, AlertCircle, CheckCircle, LogIn, Video, ChevronDown, ChevronUp } from "lucide-react";
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
  "Filmagem de Câmera",
  "Outro",
];

const priorities = [
  { value: "baixa", label: "Baixa", color: "bg-success" },
  { value: "media", label: "Média", color: "bg-warning" },
  { value: "alta", label: "Alta", color: "bg-destructive" },
];

const inputClass =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-shadow focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const SECTORS = [
  { value: "setape", label: "TI / Setape" },
  { value: "secretaria", label: "Secretaria" },
  { value: "dp", label: "DP / Financeiro" },
  { value: "direcao", label: "Direção" },
  { value: "disciplinar", label: "Disciplinar" },
  { value: "biblioteca", label: "Biblioteca" },
  { value: "servicosgerais", label: "Serviços Gerais" },
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "primeirossocorros", label: "Primeiros Socorros" },
  { value: "clat", label: "CLAT" },
  { value: "publicidade", label: "Publicidade" },
];

export default function AbrirChamado() {
  const { usuario, googleIdToken } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [termosAbertos, setTermosAbertos] = useState(false);
  const [setoresMenuAberto, setSetoresMenuAberto] = useState(false);

  const [form, setForm] = useState({
    titulo: "",
    setorDestino: ["setape"] as string[],
    categoria: "",
    prioridade: "media" as "baixa" | "media" | "alta",
    descricao: "",
    // Campos de filmagem
    solicitaFilmagem: false,
    filmagemData: "",
    filmagemHoraInicio: "",
    filmagemHoraFim: "",
    filmagemTermosAceitos: false,
  });

  const isFilmagem = form.solicitaFilmagem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !googleIdToken || enviando) return;

    // Validação extra para filmagem
    if (isFilmagem) {
      if (!form.filmagemData || !form.filmagemHoraInicio || !form.filmagemHoraFim) {
        setErroEnvio("Para solicitação de filmagem, preencha a data, hora de início e hora final.");
        return;
      }
      if (form.filmagemHoraInicio >= form.filmagemHoraFim) {
        setErroEnvio("A hora de início deve ser anterior à hora final da filmagem.");
        return;
      }
      if (!form.filmagemTermosAceitos) {
        setErroEnvio("É obrigatório aceitar os termos de responsabilidade para solicitações de filmagem.");
        return;
      }
    }

    setEnviando(true);
    setErroEnvio(null);
    try {
      await criarChamado(googleIdToken, {
        titulo: form.titulo.trim(),
        setorDestino: form.setorDestino,
        categoria: form.categoria,
        prioridade: form.prioridade,
        descricao: form.descricao.trim(),
        ...(isFilmagem && {
          solicitaFilmagem: true,
          filmagemData: form.filmagemData,
          filmagemHoraInicio: form.filmagemHoraInicio,
          filmagemHoraFim: form.filmagemHoraFim,
          filmagemTermosAceitos: form.filmagemTermosAceitos,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({
          titulo: "",
          setorDestino: ["setape"],
          categoria: "",
          prioridade: "media",
          descricao: "",
          solicitaFilmagem: false,
          filmagemData: "",
          filmagemHoraInicio: "",
          filmagemHoraFim: "",
          filmagemTermosAceitos: false,
        });
      }, 3000);
    } catch (err) {
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível abrir o chamado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHero title="Abrir Chamado" subtitle="Solicite suporte dos setores da instituição" />

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

            {/* Solicitação */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Solicitação</label>
              <input
                type="text"
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Descreva brevemente a sua solicitação"
                className={inputClass}
              />
            </div>

            {/* Setor Destinatário */}
            <div className="relative">
              <label className="mb-1.5 block text-sm font-semibold text-foreground">Setor(es) Destinatário(s) *</label>
              
              {/* Botão do Menu Suspenso */}
              <button
                type="button"
                onClick={() => setSetoresMenuAberto(!setoresMenuAberto)}
                className="flex w-full items-center justify-between rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all hover:bg-muted/20"
              >
                <span className="truncate text-left font-medium">
                  {form.setorDestino.length === 0
                    ? "Selecione o(s) setor(es)..."
                    : form.setorDestino
                        .map((val) => SECTORS.find((s) => s.value === val)?.label || val)
                        .join(" & ")}
                </span>
                {setoresMenuAberto ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Backdrop transparente para capturar cliques fora e fechar */}
              {setoresMenuAberto && (
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setSetoresMenuAberto(false)}
                />
              )}

              {/* Menu Suspenso Popover */}
              {setoresMenuAberto && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-xl animate-fade-in space-y-0.5">
                  {SECTORS.map((s) => {
                    const selected = form.setorDestino.includes(s.value);
                    return (
                      <label
                        key={s.value}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${
                          selected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => {
                            let nextDests = [...form.setorDestino];
                            if (e.target.checked) {
                              nextDests.push(s.value);
                            } else {
                              nextDests = nextDests.filter((x) => x !== s.value);
                            }
                            if (nextDests.length === 0) {
                              // Garantir que pelo menos um setor esteja selecionado
                              return;
                            }
                            const hasSetape = nextDests.includes("setape");
                            setForm({
                              ...form,
                              setorDestino: nextDests,
                              ...(!hasSetape && {
                                solicitaFilmagem: false,
                                filmagemData: "",
                                filmagemHoraInicio: "",
                                filmagemHoraFim: "",
                                filmagemTermosAceitos: false,
                              }),
                            });
                          }}
                          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        />
                        <span className="text-xs">{s.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Categoria + Prioridade */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Categoria</label>
                <select
                  required
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className={inputClass}
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
                      onClick={() => setForm({ ...form, prioridade: p.value as typeof form.prioridade })}
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

            {/* Descrição */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Descrição detalhada</label>
              <textarea
                required
                rows={5}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descreva o problema com o máximo de detalhes possível..."
                className={inputClass}
              />
            </div>

            {/* ── Toggle de Filmagem ── */}
            {form.setorDestino.includes("setape") && (
              <>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="relative">
                      <input
                        id="solicita-filmagem"
                        type="checkbox"
                        checked={form.solicitaFilmagem}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            solicitaFilmagem: e.target.checked,
                            // Limpa os campos ao desmarcar
                            ...(e.target.checked === false && {
                              filmagemData: "",
                              filmagemHoraInicio: "",
                              filmagemHoraFim: "",
                              filmagemTermosAceitos: false,
                            }),
                          })
                        }
                        className="sr-only"
                      />
                      <div
                        className={`h-6 w-11 rounded-full transition-colors ${
                          form.solicitaFilmagem ? "bg-primary" : "bg-input"
                        }`}
                      />
                      <div
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          form.solicitaFilmagem ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" aria-hidden />
                      <span className="text-sm font-medium text-foreground">
                        Este chamado é para acesso a filmagens de câmera
                      </span>
                    </div>
                  </label>
                </div>

                {/* ── Campos de Filmagem (aparece ao marcar o toggle) ── */}
                {isFilmagem && (
                  <div className="animate-fade-in space-y-5 rounded-xl border border-primary/30 bg-primary/5 p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      <Video className="h-4 w-4" aria-hidden />
                      Detalhes da filmagem solicitada
                    </div>

                    {/* Data */}
                    <div>
                      <label htmlFor="filmagem-data" className="mb-1.5 block text-sm font-medium text-foreground">
                        Data da filmagem
                      </label>
                      <input
                        id="filmagem-data"
                        type="date"
                        required={isFilmagem}
                        value={form.filmagemData}
                        onChange={(e) => setForm({ ...form, filmagemData: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    {/* Hora início + Hora fim */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="filmagem-hora-inicio" className="mb-1.5 block text-sm font-medium text-foreground">
                          Hora de início
                        </label>
                        <input
                          id="filmagem-hora-inicio"
                          type="time"
                          required={isFilmagem}
                          value={form.filmagemHoraInicio}
                          onChange={(e) => setForm({ ...form, filmagemHoraInicio: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="filmagem-hora-fim" className="mb-1.5 block text-sm font-medium text-foreground">
                          Hora final
                        </label>
                        <input
                          id="filmagem-hora-fim"
                          type="time"
                          required={isFilmagem}
                          value={form.filmagemHoraFim}
                          onChange={(e) => setForm({ ...form, filmagemHoraFim: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Termos de responsabilidade */}
                    <div className="rounded-xl border border-border bg-card">
                      <button
                        type="button"
                        onClick={() => setTermosAbertos((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                      >
                        <span>Termos de responsabilidade para acesso a filmagens</span>
                        {termosAbertos ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>

                      {termosAbertos && (
                        <div className="border-t border-border px-4 py-4 text-sm leading-relaxed text-muted-foreground">
                          {/* ── Conteúdo dos termos ── */}
                          <p className="italic text-muted-foreground/70">
                            Os termos de responsabilidade serão adicionados aqui em breve.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Checkbox de aceite */}
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        id="filmagem-termos"
                        type="checkbox"
                        required={isFilmagem}
                        checked={form.filmagemTermosAceitos}
                        onChange={(e) => setForm({ ...form, filmagemTermosAceitos: e.target.checked })}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                      />
                      <span className="text-sm text-foreground">
                        Li e aceito os{" "}
                        <button
                          type="button"
                          onClick={() => setTermosAbertos(true)}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          termos de responsabilidade
                        </button>{" "}
                        para acesso às filmagens de câmera.
                      </span>
                    </label>
                  </div>
                )}
              </>
            )}

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
