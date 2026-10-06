import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/auth/AuthProvider";
import {
  ccipayListarLojas,
  ccipayLojaUsuarios,
  ccipaySalvarLoja,
  ccipayExcluirLoja,
  ccipayEnviarEmailRedefinicaoOperador,
  type CcipayLoja,
} from "@/lib/ccipay";
import { parceiroSiteUrl } from "@/parceiro/publicHost";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  KeyRound,
  UserPlus,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Loader2,
  Users,
  Search,
  Plus,
  Info,
  Trash2,
  Mail,
  Send,
  Pencil,
} from "lucide-react";

type OperadorLoja = {
  login?: string | null;
  email?: string | null;
  nome: string;
  temSenha?: boolean;
};

export default function CcipayAdminLojas() {
  const { googleIdToken } = useAuth();
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);
  const [operadoresPorLoja, setOperadoresPorLoja] = useState<Record<string, OperadorLoja[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  // Formulário de Criação Integrada (Loja + Login do Parceiro)
  const [mostrarNovoModal, setMostrarNovoModal] = useState(false);
  const [nomeLoja, setNomeLoja] = useState("");
  const [descLoja, setDescLoja] = useState("");
  const [loginOp, setLoginOp] = useState("");
  const [senhaOp, setSenhaOp] = useState("");
  const [nomeOp, setNomeOp] = useState("");
  const [emailOp, setEmailOp] = useState("");
  const [salvandoNovaLoja, setSalvandoNovaLoja] = useState(false);

  // Modal para Adicionar / Redefinir / Editar Operador em Loja Existente
  const [lojaSelecionadaOp, setLojaSelecionadaOp] = useState<CcipayLoja | null>(null);
  const [extraLoginOp, setExtraLoginOp] = useState("");
  const [extraSenhaOp, setExtraSenhaOp] = useState("");
  const [extraNomeOp, setExtraNomeOp] = useState("");
  const [extraEmailOp, setExtraEmailOp] = useState("");
  const [salvandoExtraOp, setSalvandoExtraOp] = useState(false);
  const [enviandoEmailOpLogin, setEnviandoEmailOpLogin] = useState<string | null>(null);

  // Confirmação de Exclusão de Loja
  const [lojaParaExcluir, setLojaParaExcluir] = useState<CcipayLoja | null>(null);
  const [excluindoLoja, setExcluindoLoja] = useState(false);

  // Estado para copiar dados
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!googleIdToken) return;
    setCarregando(true);
    try {
      const { lojas: l } = await ccipayListarLojas(googleIdToken);
      setLojas(l);

      // Carrega os operadores de cada loja
      const mapOps: Record<string, OperadorLoja[]> = {};
      await Promise.all(
        l.map(async (loja) => {
          try {
            const { usuarios } = await ccipayLojaUsuarios(googleIdToken, loja.id, "listar");
            mapOps[loja.id] = (usuarios || []).filter((u) => u.login);
          } catch {
            mapOps[loja.id] = [];
          }
        })
      );
      setOperadoresPorLoja(mapOps);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar lojas parceiras.");
    } finally {
      setCarregando(false);
    }
  }, [googleIdToken]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Criação da loja com login do parceiro em um só fluxo
  async function handleCriarLojaComOperador(e: React.FormEvent) {
    e.preventDefault();
    if (!googleIdToken) return;

    const nomeTrim = nomeLoja.trim();
    const loginTrim = loginOp.trim();
    if (!nomeTrim) {
      toast.error("Informe o nome da loja ou estabelecimento.");
      return;
    }
    if (!loginTrim) {
      toast.error("Informe o usuário de acesso para o parceiro.");
      return;
    }
    if (!senhaOp || senhaOp.length < 6) {
      toast.error("A senha do parceiro deve ter no mínimo 6 caracteres.");
      return;
    }

    setSalvandoNovaLoja(true);
    try {
      // 1. Cria a loja parceira
      const { loja: novaLoja } = await ccipaySalvarLoja(googleIdToken, {
        nome: nomeTrim,
        descricao: descLoja.trim() || "Loja Conveniada Advance-CCI",
      });

      // 2. Vincula o operador com login e senha e email de recuperação
      await ccipayLojaUsuarios(googleIdToken, novaLoja.id, "vincular", {
        login: loginTrim,
        senha: senhaOp,
        nome: nomeOp.trim() || nomeTrim,
        email: emailOp.trim() || undefined,
      });

      toast.success(`Loja "${nomeTrim}" e login "${loginTrim}" criados com sucesso!`);

      // Copia automaticamente o template de acesso para conveniência
      const msgAcesso = `*Portal Parceiro Advance-CCI*\nLoja: ${nomeTrim}\nLink: ${parceiroSiteUrl()}\nUsuário: ${loginTrim}\nSenha: ${senhaOp}${
        emailOp.trim() ? `\nE-mail de Recuperação: ${emailOp.trim()}` : ""
      }`;
      navigator.clipboard.writeText(msgAcesso);
      toast.info("Dados de acesso copiados para a área de transferência!");

      // Limpa campos e fecha modal
      setNomeLoja("");
      setDescLoja("");
      setLoginOp("");
      setSenhaOp("");
      setNomeOp("");
      setEmailOp("");
      setMostrarNovoModal(false);

      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar loja parceira.");
    } finally {
      setSalvandoNovaLoja(false);
    }
  }

  function abrirModalEditarOperador(loja: CcipayLoja, op?: OperadorLoja) {
    setLojaSelecionadaOp(loja);
    if (op) {
      setExtraLoginOp(op.login || "");
      setExtraNomeOp(op.nome || "");
      const emailReal = op.email && !op.email.toLowerCase().endsWith("@parceiro.cci") ? op.email : "";
      setExtraEmailOp(emailReal);
      setExtraSenhaOp("");
    } else {
      setExtraLoginOp("");
      setExtraNomeOp("");
      setExtraEmailOp("");
      setExtraSenhaOp("");
    }
  }

  async function handleEnviarEmailRedefinicao(op: OperadorLoja, lojaNome: string) {
    if (!googleIdToken || !op.login) return;
    const temEmailReal = Boolean(op.email && !op.email.toLowerCase().endsWith("@parceiro.cci"));
    if (!temEmailReal) {
      toast.error(
        `O operador "${op.login}" não possui e-mail de recuperação cadastrado. Clique no botão de edição para cadastrar o e-mail.`,
      );
      return;
    }

    setEnviandoEmailOpLogin(op.login);
    try {
      const res = await ccipayEnviarEmailRedefinicaoOperador(googleIdToken, op.login);
      toast.success(`E-mail de redefinição enviado com sucesso para ${res.email}!`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar e-mail de redefinição.");
    } finally {
      setEnviandoEmailOpLogin(null);
    }
  }

  // Adicionar ou editar operador para uma loja já existente
  async function handleAdicionarOperadorExtra(e: React.FormEvent) {
    e.preventDefault();
    if (!googleIdToken || !lojaSelecionadaOp) return;

    const loginTrim = extraLoginOp.trim();
    if (!loginTrim) {
      toast.error("Informe o usuário.");
      return;
    }

    const operadorJaExiste = (operadoresPorLoja[lojaSelecionadaOp.id] || []).some(
      (o) => (o.login || "").toLowerCase() === loginTrim.toLowerCase(),
    );

    if (!operadorJaExiste && (!extraSenhaOp || extraSenhaOp.length < 6)) {
      toast.error("Para novos operadores, a senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (extraSenhaOp && extraSenhaOp.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setSalvandoExtraOp(true);
    try {
      await ccipayLojaUsuarios(googleIdToken, lojaSelecionadaOp.id, "vincular", {
        login: loginTrim,
        senha: extraSenhaOp || undefined,
        nome: extraNomeOp.trim() || loginTrim,
        email: extraEmailOp.trim() || undefined,
      });

      toast.success(`Operador "${loginTrim}" configurado para ${lojaSelecionadaOp.nome}!`);

      if (extraSenhaOp) {
        const msgAcesso = `*Acesso Parceiro Advance-CCI*\nLoja: ${lojaSelecionadaOp.nome}\nLink: ${parceiroSiteUrl()}\nUsuário: ${loginTrim}\nSenha: ${extraSenhaOp}${
          extraEmailOp.trim() ? `\nE-mail: ${extraEmailOp.trim()}` : ""
        }`;
        navigator.clipboard.writeText(msgAcesso);
        toast.info("Dados de acesso copiados para a área de transferência!");
      }

      setExtraLoginOp("");
      setExtraSenhaOp("");
      setExtraNomeOp("");
      setExtraEmailOp("");
      setLojaSelecionadaOp(null);

      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar operador.");
    } finally {
      setSalvandoExtraOp(false);
    }
  }

  async function handleExcluirLoja() {
    if (!googleIdToken || !lojaParaExcluir) return;
    setExcluindoLoja(true);
    try {
      await ccipayExcluirLoja(googleIdToken, lojaParaExcluir.id);
      toast.success(`Loja "${lojaParaExcluir.nome}" excluída com sucesso!`);
      setLojaParaExcluir(null);
      await carregar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir loja parceira.");
    } finally {
      setExcluindoLoja(false);
    }
  }

  const copiarDadosLoja = (loja: CcipayLoja, operador?: OperadorLoja) => {
    const texto = `*Portal Parceiro Advance-CCI*\nLoja: ${loja.nome}\nLink: ${parceiroSiteUrl()}${
      operador?.login ? `\nUsuário: ${operador.login}` : ""
    }`;
    navigator.clipboard.writeText(texto);
    setCopiadoId(loja.id);
    setTimeout(() => setCopiadoId(null), 2500);
    toast.success("Dados de acesso copiados!");
  };

  const lojasFiltradas = lojas.filter((l) => {
    const termo = busca.toLowerCase();
    const nome = l.nome.toLowerCase();
    const ops = (operadoresPorLoja[l.id] || []).map((o) => (o.login || "").toLowerCase());
    return nome.includes(termo) || ops.some((op) => op.includes(termo));
  });

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Lojas e Convênios Parceiros"
        subtitle="Gerenciamento de estabelecimentos credenciados e acessos ao portal parceiro."
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
        {/* Barra Superior */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/cci-pay">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Advance-CCI
            </Link>
          </Button>

          <Button onClick={() => setMostrarNovoModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Cadastrar Loja Parceira
          </Button>
        </div>

        {/* Card Explicativo com Link do Portal */}
        <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-4 sm:p-5 text-sm shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground text-base">Portal do Parceiro Credenciado</p>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Os parceiros só precisam de um login e senha para acessar o portal, registrar vendas por QR code e consultar o histórico de lançamentos. Não é necessário cadastrar catálogo de itens.
              </p>
            </div>

            <Button asChild variant="outline" size="sm" className="gap-1.5 shrink-0">
              <a href={parceiroSiteUrl()} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 text-primary" />
                Abrir Portal Parceiro
              </a>
            </Button>
          </div>
        </div>

        {/* Busca e Contagem */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por loja ou usuário..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Total: <strong>{lojas.length}</strong> loja(s) parceira(s)
          </span>
        </div>

        {/* Listagem de Lojas */}
        {carregando && lojas.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando lojas parceiras...
          </div>
        ) : lojasFiltradas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Nenhuma loja parceira encontrada. Clique em &quot;Cadastrar Loja Parceira&quot; para começar.
          </div>
        ) : (
          <div className="grid gap-4">
            {lojasFiltradas.map((loja) => {
              const ops = operadoresPorLoja[loja.id] || [];
              const opPrincipal = ops[0];

              return (
                <div
                  key={loja.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-xs transition hover:border-primary/30"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Store className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground text-base">{loja.nome}</h3>
                            <Badge
                              variant={loja.ativa !== false ? "secondary" : "destructive"}
                              className="text-[11px]"
                            >
                              {loja.ativa !== false ? "Ativa" : "Inativa"}
                            </Badge>
                          </div>
                          {loja.descricao && (
                            <p className="text-xs text-muted-foreground">{loja.descricao}</p>
                          )}
                        </div>
                      </div>

                      {/* Usuários de Acesso */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <KeyRound className="h-3.5 w-3.5 text-primary" />
                          Acesso:
                        </span>
                        {ops.length === 0 ? (
                          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/30">
                            Sem login cadastrado
                          </span>
                        ) : (
                          ops.map((op) => {
                            const temEmailReal = Boolean(
                              op.email && !op.email.toLowerCase().endsWith("@parceiro.cci"),
                            );
                            const enviandoEste = enviandoEmailOpLogin === op.login;

                            return (
                              <div
                                key={op.login ?? op.nome}
                                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs"
                              >
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="font-semibold text-primary">@{op.login}</span>
                                  {op.nome && op.nome !== op.login && (
                                    <span className="text-muted-foreground text-[11px] font-sans">
                                      ({op.nome})
                                    </span>
                                  )}
                                  {op.temSenha && (
                                    <ShieldCheck
                                      className="h-3 w-3 text-emerald-500"
                                      title="Senha cadastrada"
                                    />
                                  )}
                                </div>

                                {temEmailReal ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/60"
                                    title={`E-mail de recuperação: ${op.email}`}
                                  >
                                    <Mail className="h-3 w-3 text-sky-500" />
                                    <span className="font-sans max-w-[150px] truncate">{op.email}</span>
                                  </span>
                                ) : (
                                  <span
                                    className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-sans cursor-pointer hover:underline"
                                    onClick={() => abrirModalEditarOperador(loja, op)}
                                    title="Clique para cadastrar um e-mail de recuperação para este operador"
                                  >
                                    + Adicionar e-mail
                                  </span>
                                )}

                                <div className="flex items-center gap-0.5 border-l border-border/70 pl-1.5">
                                  {temEmailReal && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      disabled={enviandoEste}
                                      onClick={() => handleEnviarEmailRedefinicao(op, loja.nome)}
                                      className="h-6 px-1.5 text-[11px] text-sky-600 hover:text-sky-700 hover:bg-sky-500/10 gap-1 font-sans"
                                      title="Enviar e-mail para o parceiro redefinir sua senha"
                                    >
                                      {enviandoEste ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Send className="h-3 w-3" />
                                      )}
                                      <span>Resetar</span>
                                    </Button>
                                  )}

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => abrirModalEditarOperador(loja, op)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title="Editar operador / e-mail / senha"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span className="sr-only">Editar Operador</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação por Loja */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 sm:border-0 sm:pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copiarDadosLoja(loja, opPrincipal)}
                        className="gap-1.5 text-xs"
                        title="Copiar link e usuário para enviar ao parceiro"
                      >
                        {copiadoId === loja.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Acesso
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setLojaSelecionadaOp(loja);
                          setExtraLoginOp("");
                          setExtraSenhaOp("");
                          setExtraNomeOp("");
                        }}
                        className="gap-1.5 text-xs"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        {ops.length === 0 ? "Criar Login" : "+ Operador"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLojaParaExcluir(loja)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title={`Excluir loja ${loja.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir loja</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Links Adicionais */}
        <div className="pt-2 flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to="/cci-pay/admin/lancadores">Gerenciar lançadores autorizados</Link>
          </Button>
        </div>
      </div>

      {/* Modal: Cadastrar Nova Loja Parceira com Login */}
      <Dialog open={mostrarNovoModal} onOpenChange={setMostrarNovoModal}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCriarLojaComOperador}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Cadastrar Loja Parceira
              </DialogTitle>
              <DialogDescription>
                Informe o nome do estabelecimento e os dados de login para o parceiro acessar o portal e registrar vendas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-3 rounded-lg border border-border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Dados do Estabelecimento
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Nome da Loja / Convênio *
                  </label>
                  <Input
                    placeholder="Ex: Lanchonete Bom Sabor, Farmácia CCI..."
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Segmento / Descrição (opcional)
                  </label>
                  <Input
                    placeholder="Ex: Alimentação, Saúde, Material Escolar..."
                    value={descLoja}
                    onChange={(e) => setDescLoja(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4" />
                    2. Login de Acesso do Parceiro
                  </p>
                  <span className="text-[11px] text-muted-foreground">Para entrar no portal</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Usuário de Acesso (Login) *
                    </label>
                    <Input
                      placeholder="Ex: lanchonete ou contato@portalcci.com.br"
                      value={loginOp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLoginOp(val);
                        if (val.includes("@") && (!emailOp || emailOp === loginOp)) {
                          setEmailOp(val);
                        }
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Senha Provisória *
                    </label>
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={senhaOp}
                      onChange={(e) => setSenhaOp(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Nome do Responsável / Operador (opcional)
                    </label>
                    <Input
                      placeholder="Ex: Caixa 01, Maria Santos"
                      value={nomeOp}
                      onChange={(e) => setNomeOp(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground flex items-center justify-between">
                      <span>E-mail de Recuperação</span>
                      <span className="text-[10px] text-primary font-normal">Recomendado</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="contato@minhaloja.com"
                      value={emailOp}
                      onChange={(e) => setEmailOp(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  Ao salvar, o link de acesso e as credenciais serão copiados automaticamente para você enviar ao parceiro.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMostrarNovoModal(false)}
                disabled={salvandoNovaLoja}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoNovaLoja}>
                {salvandoNovaLoja ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  "Cadastrar Loja e Criar Acesso"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar / Redefinir Operador em Loja Existente */}
      <Dialog
        open={Boolean(lojaSelecionadaOp)}
        onOpenChange={(open) => !open && setLojaSelecionadaOp(null)}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdicionarOperadorExtra}>
            {(() => {
              const opExistente = (operadoresPorLoja[lojaSelecionadaOp?.id || ""] || []).find(
                (o) => (o.login || "").toLowerCase() === extraLoginOp.trim().toLowerCase(),
              );
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      {opExistente ? "Editar Operador" : "Adicionar Operador"} — {lojaSelecionadaOp?.nome}
                    </DialogTitle>
                    <DialogDescription>
                      {opExistente
                        ? "Atualize o e-mail de recuperação, nome ou defina uma nova senha para este operador."
                        : "Cadastre um novo login e vincule o e-mail de recuperação para acesso autônomo."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Usuário (Login) *
                      </label>
                      <Input
                        placeholder="Ex: lanchonete ou contato@portalcci.com.br"
                        value={extraLoginOp}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtraLoginOp(val);
                          if (val.includes("@") && (!extraEmailOp || extraEmailOp === extraLoginOp)) {
                            setExtraEmailOp(val);
                          }
                        }}
                        required
                        disabled={Boolean(opExistente && extraLoginOp)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Nome do Operador (opcional)
                      </label>
                      <Input
                        placeholder="Ex: Turno Noite, João"
                        value={extraNomeOp}
                        onChange={(e) => setExtraNomeOp(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground flex items-center justify-between">
                        <span>E-mail de Recuperação</span>
                        <span className="text-[10px] text-primary font-normal">Recomendado</span>
                      </label>
                      <Input
                        type="email"
                        placeholder="contato@minhaloja.com"
                        value={extraEmailOp}
                        onChange={(e) => setExtraEmailOp(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Usado pelo parceiro para redefinir a própria senha de forma autônoma caso perca o acesso.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        {opExistente
                          ? "Nova Senha (opcional — deixe em branco para manter a atual)"
                          : "Senha Provisória (mínimo 6 caracteres) *"}
                      </label>
                      <Input
                        type="password"
                        placeholder={opExistente ? "Deixe em branco para manter a senha atual" : "Mínimo 6 caracteres"}
                        value={extraSenhaOp}
                        onChange={(e) => setExtraSenhaOp(e.target.value)}
                        required={!opExistente}
                      />
                    </div>
                  </div>
                </>
              );
            })()}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLojaSelecionadaOp(null)}
                disabled={salvandoExtraOp}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoExtraOp}>
                {salvandoExtraOp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Operador"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação: Excluir Loja Parceira */}
      <AlertDialog
        open={Boolean(lojaParaExcluir)}
        onOpenChange={(aberto) => {
          if (!aberto && !excluindoLoja) setLojaParaExcluir(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Loja Parceira
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o convênio da loja{" "}
              <strong>&quot;{lojaParaExcluir?.nome}&quot;</strong>?
              <br />
              <br />
              Esta ação removerá o estabelecimento e todos os logins e operadores vinculados ao portal parceiro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoLoja}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleExcluirLoja();
              }}
              disabled={excluindoLoja}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
            >
              {excluindoLoja ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Sim, Excluir Loja
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
