import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Store, Loader2, KeyRound, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useParceiroAuth } from "./ParceiroAuthProvider";
import { parceiroEsqueciSenha } from "./parceiroSessionApi";

export default function ParceiroLoginPage() {
  const { operador, carregando, login } = useParceiroAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Modo Esqueci Minha Senha
  const [modoEsqueciSenha, setModoEsqueciSenha] = useState(false);
  const [identificadorRecuperacao, setIdentificadorRecuperacao] = useState("");
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const [erroRecuperacao, setErroRecuperacao] = useState<string | null>(null);
  const [sucessoRecuperacao, setSucessoRecuperacao] = useState<{
    emailMascarado: string;
    mensagem: string;
  } | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
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

  async function handleSolicitarRecuperacao(e: React.FormEvent) {
    e.preventDefault();
    setErroRecuperacao(null);
    setSucessoRecuperacao(null);

    const termo = identificadorRecuperacao.trim();
    if (!termo) {
      setErroRecuperacao("Informe seu usuário ou e-mail.");
      return;
    }

    setEnviandoRecuperacao(true);
    try {
      const res = await parceiroEsqueciSenha(termo);
      setSucessoRecuperacao({
        emailMascarado: res.emailMascarado,
        mensagem: res.mensagem,
      });
    } catch (err) {
      setErroRecuperacao(
        err instanceof Error ? err.message : "Não foi possível enviar o e-mail de recuperação.",
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
            {modoEsqueciSenha ? (
              <KeyRound className="h-7 w-7 text-primary" />
            ) : (
              <Store className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-semibold">Advance-CCI Parceiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modoEsqueciSenha ? "Recuperação de Acesso" : "Portal de vendas e extrato"}
          </p>
        </div>

        {modoEsqueciSenha ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            {sucessoRecuperacao ? (
              <div className="space-y-4 text-center py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-base">E-mail Enviado!</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Enviamos as instruções para{" "}
                    <strong className="text-foreground">{sucessoRecuperacao.emailMascarado}</strong>.
                    Verifique sua caixa de entrada e spam. O link é válido por 1 hora.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setModoEsqueciSenha(false);
                    setSucessoRecuperacao(null);
                    setErroRecuperacao(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSolicitarRecuperacao} className="space-y-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Informe o seu <strong>usuário</strong> ou <strong>e-mail de recuperação</strong> cadastrado para receber o link de redefinição de senha.
                </p>

                {erroRecuperacao && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">{erroRecuperacao}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <label className="text-xs font-medium">Usuário ou E-mail</label>
                  <div className="relative mt-1">
                    <Input
                      placeholder="ex.: cantina ou cantina@gmail.com"
                      value={identificadorRecuperacao}
                      onChange={(e) => setIdentificadorRecuperacao(e.target.value)}
                      autoComplete="username"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={enviandoRecuperacao}>
                  {enviandoRecuperacao ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando e-mail...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar Link de Recuperação
                    </>
                  )}
                </Button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModoEsqueciSenha(false);
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
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            {erro && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{erro}</AlertDescription>
              </Alert>
            )}
            <div>
              <label className="text-sm font-medium">Usuário</label>
              <Input
                className="mt-1"
                placeholder="ex.: cantina"
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
                    setModoEsqueciSenha(true);
                    setIdentificadorRecuperacao(usuario.trim());
                    setErro(null);
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
      </div>
    </div>
  );
}
