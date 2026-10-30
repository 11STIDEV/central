import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/PageHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  labelFormaRepasse,
  type CcipayLoja,
  type FormaRepasseLoja,
} from "@/lib/ccipay";
import { parceiroSiteUrl } from "@/parceiro/publicHost";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  KeyRound,
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
  Banknote,
  Receipt,
  Building2,
  Zap,
  QrCode,
  CreditCard,
} from "lucide-react";

type OperadorLoja = {
  login?: string | null;
  email?: string | null;
  nome: string;
  temSenha?: boolean;
};

export default function CcipayAdminLojas() {
  const { googleIdToken, usuario } = useAuth();
  const [lojas, setLojas] = useState<CcipayLoja[]>([]);
  const [operadoresPorLoja, setOperadoresPorLoja] = useState<Record<string, OperadorLoja[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  // Formulário de Criação Integrada (Loja + Login do Parceiro)
  const [mostrarNovoModal, setMostrarNovoModal] = useState(false);
  const [nomeLoja, setNomeLoja] = useState("");
  const [descLoja, setDescLoja] = useState("");
  const [formaRepasseNova, setFormaRepasseNova] = useState<FormaRepasseLoja>("pix");
  const [dadosRepasseNova, setDadosRepasseNova] = useState("");
  const [permiteVendaSemCelularNova, setPermiteVendaSemCelularNova] = useState(false);
  const [loginOp, setLoginOp] = useState("");
  const [senhaOp, setSenhaOp] = useState("");
  const [nomeOp, setNomeOp] = useState("");
  const [emailOp, setEmailOp] = useState("");
  const [salvandoNovaLoja, setSalvandoNovaLoja] = useState(false);

  // Modal para Editar Loja Parceira
  const [lojaParaEditar, setLojaParaEditar] = useState<CcipayLoja | null>(null);
  const [editNomeLoja, setEditNomeLoja] = useState("");
  const [editDescLoja, setEditDescLoja] = useState("");
  const [editAtivaLoja, setEditAtivaLoja] = useState(true);
  const [editFormaRepasse, setEditFormaRepasse] = useState<FormaRepasseLoja>("pix");
  const [editDadosRepasse, setEditDadosRepasse] = useState("");
  const [editPermiteVendaSemCelular, setEditPermiteVendaSemCelular] = useState(false);
  const [salvandoEdicaoLoja, setSalvandoEdicaoLoja] = useState(false);

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
    if (!usuario && !googleIdToken) return;
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
  }, [googleIdToken, usuario]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Criação da loja com login do parceiro em um só fluxo
  async function handleCriarLojaComOperador(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario && !googleIdToken) return;

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
        descricao: descLoja.trim(),
        formaRepasse: formaRepasseNova,
        dadosRepasse: dadosRepasseNova.trim() || undefined,
        permiteVendaSemCelular: permiteVendaSemCelularNova,
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
      }\nForma de Repasse: ${labelFormaRepasse(formaRepasseNova)}${
        dadosRepasseNova.trim() ? ` (${dadosRepasseNova.trim()})` : ""
      }\nVenda sem celular: ${permiteVendaSemCelularNova ? "Liberada" : "Apenas QR Code"}`;
      navigator.clipboard.writeText(msgAcesso);
      toast.info("Dados de acesso copiados para a área de transferência!");

      // Limpa campos e fecha modal
      setNomeLoja("");
      setDescLoja("");
      setFormaRepasseNova("pix");
      setDadosRepasseNova("");
      setPermiteVendaSemCelularNova(false);
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

  function abrirModalEditarLoja(loja: CcipayLoja) {
    setLojaParaEditar(loja);
    setEditNomeLoja(loja.nome);
    setEditDescLoja(loja.descricao || "");
    setEditAtivaLoja(loja.ativa !== false);
    setEditFormaRepasse(loja.formaRepasse || "pix");
    setEditDadosRepasse(loja.dadosRepasse || "");
    setEditPermiteVendaSemCelular(Boolean(loja.permiteVendaSemCelular));
  }

  async function handleSalvarEdicaoLoja(e: React.FormEvent) {
    e.preventDefault();
    if ((!usuario && !googleIdToken) || !lojaParaEditar) return;
    const nomeTrim = editNomeLoja.trim();
    if (!nomeTrim) {
      toast.error("O nome da loja não pode ser vazio.");
      return;
    }
    setSalvandoEdicaoLoja(true);
    try {
      await ccipaySalvarLoja(googleIdToken, {
        id: lojaParaEditar.id,
        nome: nomeTrim,
        descricao: editDescLoja.trim(),
        ativa: editAtivaLoja,
        formaRepasse: editFormaRepasse,
        dadosRepasse: editDadosRepasse.trim() || undefined,
        permiteVendaSemCelular: editPermiteVendaSemCelular,
      });
      toast.success(`Loja "${nomeTrim}" atualizada com sucesso!`);
      setLojaParaEditar(null);
      await carregar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar dados da loja.");
    } finally {
      setSalvandoEdicaoLoja(false);
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
    if ((!usuario && !googleIdToken) || !op.login) return;
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

  // Salvar ou atualizar acesso único da loja parceira
  async function handleAdicionarOperadorExtra(e: React.FormEvent) {
    e.preventDefault();
    if ((!usuario && !googleIdToken) || !lojaSelecionadaOp) return;

    const loginTrim = extraLoginOp.trim();
    if (!loginTrim) {
      toast.error("Informe o usuário de acesso.");
      return;
    }

    const opExistente = (operadoresPorLoja[lojaSelecionadaOp.id] || [])[0];

    if (!opExistente && (!extraSenhaOp || extraSenhaOp.length < 6)) {
      toast.error("Para novos acessos, a senha deve ter no mínimo 6 caracteres.");
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

      toast.success(`Acesso de "${lojaSelecionadaOp.nome}" salvo com sucesso!`);

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
      toast.error(e instanceof Error ? e.message : "Erro ao salvar acesso.");
    } finally {
      setSalvandoExtraOp(false);
    }
  }

  async function handleExcluirLoja() {
    if ((!usuario && !googleIdToken) || !lojaParaExcluir) return;
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
                    <div className="space-y-1.5 flex-1 min-w-0">
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

                          {/* Forma de Repasse Configurada */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                            <span className="text-muted-foreground font-medium text-[11px]">Repasse:</span>
                            {loja.formaRepasse === "dinheiro" ? (
                              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-normal">
                                <Banknote className="h-3 w-3 text-emerald-500" /> Dinheiro
                              </Badge>
                            ) : loja.formaRepasse === "cheque" ? (
                              <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-normal">
                                <Receipt className="h-3 w-3 text-amber-500" /> Cheque
                              </Badge>
                            ) : loja.formaRepasse === "ted" ? (
                              <Badge variant="outline" className="gap-1 border-blue-500/30 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] font-normal">
                                <Building2 className="h-3 w-3 text-blue-500" /> TED / Transf.
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 border-teal-500/30 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 text-[11px] font-normal">
                                <Zap className="h-3 w-3 text-teal-500" /> PIX
                              </Badge>
                            )}
                            {loja.dadosRepasse && (
                              <span className="text-[11px] text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded border border-border/50 truncate max-w-[220px]" title={loja.dadosRepasse}>
                                {loja.dadosRepasse}
                              </span>
                            )}
                            {loja.permiteVendaSemCelular ? (
                              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-normal">
                                <CreditCard className="h-3 w-3 text-emerald-500" /> Sem celular liberado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 border-muted bg-muted/40 text-muted-foreground text-[11px] font-normal">
                                <QrCode className="h-3 w-3 text-muted-foreground" /> Apenas QR Code
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Usuário de Acesso Único */}
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <KeyRound className="h-3.5 w-3.5 text-primary" />
                          Acesso:
                        </span>
                        {!opPrincipal ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-500/30">
                              Sem login cadastrado
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => abrirModalEditarOperador(loja)}
                              className="h-6 px-2 text-[11px] gap-1"
                            >
                              <KeyRound className="h-3 w-3" />
                              Cadastrar Acesso
                            </Button>
                          </div>
                        ) : (
                          (() => {
                            const temEmailReal = Boolean(
                              opPrincipal.email && !opPrincipal.email.toLowerCase().endsWith("@parceiro.cci"),
                            );
                            const enviandoEste = enviandoEmailOpLogin === opPrincipal.login;

                            return (
                              <div
                                key={opPrincipal.login ?? opPrincipal.nome}
                                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs"
                              >
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="font-semibold text-primary">@{opPrincipal.login}</span>
                                  {opPrincipal.nome && opPrincipal.nome !== opPrincipal.login && (
                                    <span className="text-muted-foreground text-[11px] font-sans">
                                      ({opPrincipal.nome})
                                    </span>
                                  )}
                                  {opPrincipal.temSenha && (
                                    <ShieldCheck
                                      className="h-3 w-3 text-emerald-500"
                                      title="Senha cadastrada"
                                    />
                                  )}
                                </div>

                                {temEmailReal ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/60"
                                    title={`E-mail de recuperação: ${opPrincipal.email}`}
                                  >
                                    <Mail className="h-3 w-3 text-sky-500" />
                                    <span className="font-sans max-w-[150px] truncate">{opPrincipal.email}</span>
                                  </span>
                                ) : (
                                  <span
                                    className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-sans cursor-pointer hover:underline"
                                    onClick={() => abrirModalEditarOperador(loja, opPrincipal)}
                                    title="Clique para cadastrar um e-mail de recuperação"
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
                                      onClick={() => handleEnviarEmailRedefinicao(opPrincipal, loja.nome)}
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
                                    onClick={() => abrirModalEditarOperador(loja, opPrincipal)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                    title="Editar acesso / e-mail / senha"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span className="sr-only">Editar Acesso</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação por Loja */}
                    <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 border-t border-border/60 pt-3 sm:border-0 sm:pt-0 sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirModalEditarLoja(loja)}
                        className="gap-1.5 text-xs h-8 justify-center sm:justify-start"
                        title={`Editar dados cadastrais e forma de repasse de ${loja.nome}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar Loja
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copiarDadosLoja(loja, opPrincipal)}
                        className="gap-1.5 text-xs h-8 justify-center sm:justify-start"
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

                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => abrirModalEditarOperador(loja, opPrincipal)}
                          className="gap-1.5 text-xs h-8"
                          title={opPrincipal ? "Editar dados de acesso do parceiro" : "Cadastrar dados de acesso do parceiro"}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          {opPrincipal ? "Acesso" : "Criar Acesso"}
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Cadastrar Nova Loja Parceira com Login */}
      <Dialog open={mostrarNovoModal} onOpenChange={setMostrarNovoModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleCriarLojaComOperador} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0 pr-12 text-left">
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Cadastrar Loja Parceira
              </DialogTitle>
              <DialogDescription>
                Informe o nome do estabelecimento e os dados de login para o parceiro acessar o portal e registrar vendas.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-3 rounded-lg border border-border bg-card p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Dados do Estabelecimento
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="novo-nome-loja" className="text-xs font-medium text-foreground">
                    Nome da Loja / Convênio *
                  </Label>
                  <Input
                    id="novo-nome-loja"
                    placeholder="Ex: Lanchonete Bom Sabor, Farmácia CCI..."
                    value={nomeLoja}
                    onChange={(e) => setNomeLoja(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="novo-desc-loja" className="text-xs font-medium text-foreground">
                    Segmento / Descrição (opcional)
                  </Label>
                  <Input
                    id="novo-desc-loja"
                    placeholder="Ex: Alimentação, Saúde, Material Escolar..."
                    value={descLoja}
                    onChange={(e) => setDescLoja(e.target.value)}
                  />
                </div>
              </div>

              {/* Bloco de Repasse Financeiro */}
              <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-primary" />
                    2. Repasse Financeiro à Loja
                  </span>
                  <span className="text-[11px] text-muted-foreground">Forma de pagamento padrão</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="novo-forma-repasse" className="text-xs font-medium text-foreground">
                      Forma de Repasse *
                    </Label>
                    <select
                      id="novo-forma-repasse"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      value={formaRepasseNova}
                      onChange={(e) => setFormaRepasseNova(e.target.value as FormaRepasseLoja)}
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cheque">Cheque</option>
                      <option value="ted">TED / Transferência</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="novo-dados-repasse" className="text-xs font-medium text-foreground">
                      {formaRepasseNova === "pix"
                        ? "Chave PIX da Loja (opcional)"
                        : formaRepasseNova === "cheque"
                        ? "Nominal do Cheque (opcional)"
                        : formaRepasseNova === "dinheiro"
                        ? "Instruções Dinheiro (opcional)"
                        : "Banco / Agência / Conta"}
                    </Label>
                    <Input
                      id="novo-dados-repasse"
                      placeholder={
                        formaRepasseNova === "pix"
                          ? "Ex: CNPJ, telefone, e-mail..."
                          : formaRepasseNova === "cheque"
                          ? "Ex: Nominal à Razão Social..."
                          : formaRepasseNova === "dinheiro"
                          ? "Ex: Pagar em espécie no balcão"
                          : "Ex: BB, Ag 1234, CC 5678"
                      }
                      value={dadosRepasseNova}
                      onChange={(e) => setDadosRepasseNova(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-border/50">
                    <div className="flex items-start space-x-3 rounded-md border border-border/80 bg-background/50 p-3">
                      <Checkbox
                        id="novo-permite-sem-celular"
                        checked={permiteVendaSemCelularNova}
                        onCheckedChange={(checked) => setPermiteVendaSemCelularNova(Boolean(checked))}
                      />
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor="novo-permite-sem-celular"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Permitir venda sem celular (busca por Matrícula / CPF)
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Recomendado apenas para lanchonetes/cantinas internas da escola. Lojas externas (farmácias, restaurantes) devem operar exclusivamente via QR Code.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4" />
                    3. Login de Acesso do Parceiro
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

            <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t bg-muted/20 shrink-0">
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

      {/* Modal: Editar Loja Parceira */}
      <Dialog
        open={Boolean(lojaParaEditar)}
        onOpenChange={(open) => !open && setLojaParaEditar(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSalvarEdicaoLoja} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0 pr-12 text-left">
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Editar Loja Parceira
              </DialogTitle>
              <DialogDescription>
                Atualize o cadastro, status e os dados financeiros de repasse da loja parceira.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-nome-loja" className="text-xs font-medium text-foreground">
                  Nome da Loja / Convênio *
                </Label>
                <Input
                  id="edit-nome-loja"
                  value={editNomeLoja}
                  onChange={(e) => setEditNomeLoja(e.target.value)}
                  placeholder="Ex: Lanchonete Bom Sabor"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-desc-loja" className="text-xs font-medium text-foreground">
                    Segmento / Descrição (opcional)
                  </Label>
                  <Input
                    id="edit-desc-loja"
                    value={editDescLoja}
                    onChange={(e) => setEditDescLoja(e.target.value)}
                    placeholder="Ex: Alimentação, Farmácia..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-status-loja" className="text-xs font-medium text-foreground">
                    Status da Loja
                  </Label>
                  <select
                    id="edit-status-loja"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                    value={editAtivaLoja ? "ativa" : "inativa"}
                    onChange={(e) => setEditAtivaLoja(e.target.value === "ativa")}
                  >
                    <option value="ativa">Ativa (Habilitada)</option>
                    <option value="inativa">Inativa (Bloqueada)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Banknote className="h-4 w-4 text-primary" />
                    Repasse Financeiro à Loja
                  </span>
                  <span className="text-[11px] text-muted-foreground">Forma de pagamento padrão</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-forma-repasse" className="text-xs font-medium text-foreground">
                      Forma de Repasse *
                    </Label>
                    <select
                      id="edit-forma-repasse"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                      value={editFormaRepasse}
                      onChange={(e) => setEditFormaRepasse(e.target.value as FormaRepasseLoja)}
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cheque">Cheque</option>
                      <option value="ted">TED / Transferência</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-dados-repasse" className="text-xs font-medium text-foreground">
                      {editFormaRepasse === "pix"
                        ? "Chave PIX da Loja (opcional)"
                        : editFormaRepasse === "cheque"
                        ? "Nominal do Cheque (opcional)"
                        : editFormaRepasse === "dinheiro"
                        ? "Instruções (opcional)"
                        : "Dados Bancários (opcional)"}
                    </Label>
                    <Input
                      id="edit-dados-repasse"
                      placeholder={
                        editFormaRepasse === "pix"
                          ? "Ex: CNPJ, celular, e-mail..."
                          : editFormaRepasse === "cheque"
                          ? "Ex: Nominal à Razão Social..."
                          : editFormaRepasse === "dinheiro"
                          ? "Ex: Pagar em espécie no balcão"
                          : "Ex: BB Ag 1234 CC 5678"
                      }
                      value={editDadosRepasse}
                      onChange={(e) => setEditDadosRepasse(e.target.value)}
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2 border-t border-border/50">
                    <div className="flex items-start space-x-3 rounded-md border border-border/80 bg-background/50 p-3">
                      <Checkbox
                        id="edit-permite-sem-celular"
                        checked={editPermiteVendaSemCelular}
                        onCheckedChange={(checked) => setEditPermiteVendaSemCelular(Boolean(checked))}
                      />
                      <div className="space-y-1 leading-none">
                        <Label
                          htmlFor="edit-permite-sem-celular"
                          className="text-xs font-semibold text-foreground cursor-pointer"
                        >
                          Permitir venda sem celular (busca por Matrícula / CPF)
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Recomendado apenas para lanchonetes/cantinas internas da escola. Lojas externas (farmácias, restaurantes) devem operar exclusivamente via QR Code.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLojaParaEditar(null)}
                disabled={salvandoEdicaoLoja}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvandoEdicaoLoja}>
                {salvandoEdicaoLoja ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar ou Definir Acesso da Loja Parceira */}
      <Dialog
        open={Boolean(lojaSelecionadaOp)}
        onOpenChange={(open) => !open && setLojaSelecionadaOp(null)}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleAdicionarOperadorExtra} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {(() => {
              const opExistente = (operadoresPorLoja[lojaSelecionadaOp?.id || ""] || [])[0];
              const jaTemAcesso = Boolean(opExistente?.login);
              return (
                <>
                  <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0 pr-12 text-left">
                    <DialogTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      {jaTemAcesso ? "Editar Acesso do Parceiro" : "Definir Acesso do Parceiro"} — {lojaSelecionadaOp?.nome}
                    </DialogTitle>
                    <DialogDescription>
                      {jaTemAcesso
                        ? "Atualize o login, e-mail de recuperação ou defina uma nova senha para a loja parceira."
                        : "Cadastre o login e vincule o e-mail de recuperação para acesso da loja ao portal."}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Nome do Responsável (opcional)
                      </label>
                      <Input
                        placeholder="Ex: Maria Santos, Gerência"
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
                        Usado pelo parceiro para redefinir a própria senha com código de 6 dígitos no portal.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        {jaTemAcesso
                          ? "Nova Senha (opcional — deixe em branco para manter a atual)"
                          : "Senha Provisória (mínimo 6 caracteres) *"}
                      </label>
                      <Input
                        type="password"
                        placeholder={jaTemAcesso ? "Deixe em branco para manter a senha atual" : "Mínimo 6 caracteres"}
                        value={extraSenhaOp}
                        onChange={(e) => setExtraSenhaOp(e.target.value)}
                        required={!jaTemAcesso}
                      />
                    </div>
                  </div>
                </>
              );
            })()}

            <DialogFooter className="gap-2 sm:gap-0 px-6 py-4 border-t bg-muted/20 shrink-0">
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
                  "Salvar Acesso"
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
