import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  parceiroValidarTokenRedefinicao,
  parceiroRedefinirSenha,
} from "./parceiroSessionApi";

export default function ParceiroRedefinirSenhaPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [dadosOperador, setDadosOperador] = useState<{
    login: string;
    nome: string;
    lojaNome: string;
  } | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function checarToken() {
      if (!token.trim()) {
        setVerificando(false);
        setTokenValido(false);
        setErro("Nenhum token de redefinição fornecido.");
        return;
      }
      try {
        const res = await parceiroValidarTokenRedefinicao(token.trim());
        if (!cancelado) {
          setDadosOperador({
            login: res.login,
            nome: res.nome,
            lojaNome: res.lojaNome,
          });
          setTokenValido(true);
        }
      } catch (e) {
        if (!cancelado) {
          setTokenValido(false);
          setErro(
            e instanceof Error
              ? e.message
              : "Este link de redefinição expirou ou é inválido.",
          );
        }
      } finally {
        if (!cancelado) setVerificando(false);
      }
    }

    void checarToken();
    return () => {
      cancelado = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas informadas não coincidem.");
      return;
    }

    setEnviando(true);
    try {
      await parceiroRedefinirSenha(token.trim(), novaSenha);
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao redefinir senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Redefinição de Senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Portal Parceiro Advance-CCI
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {verificando ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
            </div>
          ) : sucesso ? (
            <div className="space-y-5 text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Senha alterada com sucesso!</h3>
                <p className="text-sm text-muted-foreground">
                  Você já pode acessar o Portal do Parceiro utilizando a sua nova senha.
                </p>
              </div>
              <Button
                onClick={() => navigate("/login")}
                className="w-full"
              >
                Ir para o Login
              </Button>
            </div>
          ) : !tokenValido ? (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Link inválido ou expirado</AlertTitle>
                <AlertDescription className="mt-1">
                  {erro || "O token de recuperação não é mais válido. Por motivos de segurança, os links expiram após 1 hora."}
                </AlertDescription>
              </Alert>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="default"
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao Login e solicitar novo link
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {dadosOperador && (
                <div className="rounded-lg bg-muted/60 p-3.5 border border-border/60 text-xs space-y-1.5 mb-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Store className="h-3.5 w-3.5" />
                    <span>{dadosOperador.lojaNome}</span>
                  </div>
                  <div className="text-foreground">
                    Usuário: <span className="font-semibold">{dadosOperador.nome}</span> (
                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                      {dadosOperador.login}
                    </code>
                    )
                  </div>
                </div>
              )}

              {erro && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{erro}</AlertDescription>
                </Alert>
              )}

              <div>
                <label className="text-sm font-medium">Nova Senha</label>
                <div className="relative mt-1">
                  <Input
                    type={mostrarSenha ? "text" : "password"}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    autoComplete="new-password"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Confirmar Nova Senha</label>
                <Input
                  className="mt-1"
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={enviando || novaSenha.length < 6}
              >
                {enviando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Nova Senha"
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Voltar para o login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
