import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Store,
  Loader2,
  KeyRound,
  ArrowLeft,
  Mail,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useParceiroAuth } from "./ParceiroAuthProvider";
import {
  parceiroEsqueciSenha,
  parceiroConfirmarCodigoRedefinicao,
} from "./parceiroSessionApi";

type EtapaAuth = "login" | "solicitar_codigo" | "confirmar_codigo";

export default function ParceiroLoginPage() {
  const { operador, carregando, login } = useParceiroAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Fluxo de Recuperação com Código de 6 Dígitos
  const [etapa, setEtapa] = useState<EtapaAuth>("login");
  const [identificadorRecuperacao, setIdentificadorRecuperacao] = useState("");
  const [emailMascarado, setEmailMascarado] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [sucessoMensagem, setSucessoMensagem] = useState<string | null>(null);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (operador) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmitLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(usuario.trim(), senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleSolicitarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);

    const termo = identificadorRecuperacao.trim();
    if (!termo) {
      setErroRecuperacao("Informe seu usuário ou e-mail cadastrado.");
      return;
    }

    setEnviandoRecuperacao(true);
    try {
      const res = await parceiroEsqueciSenha(termo);
      setEmailMascarado(res.emailMascarado);
      setCodigo("");
      setNovaSenha("");
      setConfirmarSenha("");
      setEtapa("confirmar_codigo");
    } catch (err) {
      setErroRecuperacao(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar o código de verificação.",
      );
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  async function handleConfirmarCodigoERedefinir(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);

    const codLimpo = codigo.trim();
    if (codLimpo.length !== 6) {
      setErroRecuperacao("Digite o código de 6 dígitos enviado por e-mail.");
      return;
    }

    if (novaSenha.length < 6) {
      setErroRecuperacao("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErroRecuperacao("As senhas informadas não coincidem.");
      return;
    }

    setEnviandoRecuperacao(true);
    try {
      const res = await parceiroConfirmarCodigoRedefinicao({
        loginOuEmail: identificadorRecuperacao.trim(),
        codigo: codLimpo,
        novaSenha,
      });

      // Sucesso! Retorna para o login com a nova senha pronta
      if (res.login) setUsuario(res.login);
      setSenha(novaSenha);
      setSucessoMensagem("Senha alterada com sucesso! Entre agora com suas credenciais.");
      setEtapa("login");
    } catch (err) {
      setErroRecuperacao(
        err instanceof Error ? err.message : "Erro ao validar código e redefinir senha.",
      );
    } finally {
      setEnviandoRecuperacao(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            {etapa === "login" ? (
              <Store className="h-7 w-7 text-primary" />
            ) : etapa === "solicitar_codigo" ? (
              <Mail className="h-7 w-7 text-primary" />
            ) : (
              <ShieldCheck className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Advance-CCI Parceiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {etapa === "login"
              ? "Portal de vendas e extrato"
              : etapa === "solicitar_codigo"
              ? "Recuperação de Acesso"
              : "Verificação de Código"}
          </p>
        </div>

        {/* ETAPA 1: Login Normal */}
        {etapa === "login" && (
          <form
            onSubmit={handleSubmitLogin}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            {sucessoMensagem && (
              <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertDescription className="text-xs">{sucessoMensagem}</AlertDescription>
              </Alert>
            )}

            {erro && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{erro}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-sm font-medium">Usuário ou E-mail</label>
              <Input
                className="mt-1"
                placeholder="ex.: lanchonete ou contato@loja.com"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Senha</label>
                <button
                  type="button"
                  onClick={() => {
                    setEtapa("solicitar_codigo");
                    setIdentificadorRecuperacao(usuario.trim());
                    setErroRecuperacao(null);
                    setSucessoMensagem(null);
                  }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <Input
                className="mt-1"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        )}

        {/* ETAPA 2: Solicitar Código de 6 Dígitos */}
        {etapa === "solicitar_codigo" && (
          <form
            onSubmit={handleSolicitarCodigo}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Esqueceu a senha?</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Digite seu usuário ou e-mail. Enviaremos um código de 6 dígitos para você redefinir sua senha aqui mesmo.
              </p>
            </div>

            {erroRecuperacao && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{erroRecuperacao}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-xs font-medium">Usuário ou E-mail Cadastrado</label>
              <Input
                className="mt-1"
                placeholder="ex.: lanchonete ou cantina@gmail.com"
                value={identificadorRecuperacao}
                onChange={(e) => setIdentificadorRecuperacao(e.target.value)}
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={enviandoRecuperacao}>
              {enviandoRecuperacao ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando código...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar Código por E-mail
                </>
              )}
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setEtapa("login");
                  setErroRecuperacao(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar para o login
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 3: Digitar Código de 6 Dígitos e Nova Senha */}
        {etapa === "confirmar_codigo" && (
          <form
            onSubmit={handleConfirmarCodigoERedefinir}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-foreground space-y-1">
              <p className="font-semibold text-primary flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Código enviado!
              </p>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Enviamos um código de 6 dígitos para <strong>{emailMascarado}</strong> (válido por 15 minutos).
              </p>
            </div>

            {erroRecuperacao && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{erroRecuperacao}</AlertDescription>
              </Alert>
            )}

            <div>
              <label className="text-xs font-medium text-foreground">
                Código de Verificação (6 dígitos)
              </label>
              <Input
                className="mt-1 font-mono tracking-widest text-center text-lg font-bold"
                placeholder="123456"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Nova Senha</label>
              <div className="relative mt-1">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Confirmar Nova Senha</label>
              <Input
                className="mt-1"
                type={mostrarSenha ? "text" : "password"}
                placeholder="Repita a nova senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={enviandoRecuperacao || codigo.length !== 6 || novaSenha.length < 6}
            >
              {enviandoRecuperacao ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redefinindo senha...
                </>
              ) : (
                "Alterar Senha e Entrar"
              )}
            </Button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEtapa("solicitar_codigo");
                  setErroRecuperacao(null);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Alterar e-mail
              </button>

              <button
                type="button"
                onClick={handleSolicitarCodigo}
                disabled={enviandoRecuperacao}
                className="text-primary hover:underline transition-colors inline-flex items-center gap-1"
              >
                <RotateCw className="h-3 w-3" />
                Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
