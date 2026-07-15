import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { PageHero } from "@/components/PageHero";
import { listarKanbanUsuarios, type KanbanUsuario } from "@/lib/kanban";
import { hasRoleAccessToRoute } from "@/auth/routeAccess";
import { Users, Link2, Loader2, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SectorMeta {
  title: string;
  description: string;
}

const SECTOR_DESCRIPTIONS: Record<string, SectorMeta> = {
  biblioteca: {
    title: "Biblioteca",
    description: "Gerenciamento do acervo de livros, controle de empréstimos e devoluções, além do suporte a pesquisas acadêmicas e apoio pedagógico.",
  },
  direcao: {
    title: "Direção",
    description: "Planejamento estratégico, tomada de decisões administrativas e pedagógicas, coordenação de lideranças e representação institucional.",
  },
  disciplinar: {
    title: "Disciplinar",
    description: "Acompanhamento da conduta de alunos, controle de frequência e entrada/saída, organização do pátio e apoio à convivência escolar.",
  },
  "dp-financeiro": {
    title: "DP e Financeiro",
    description: "Gestão de recursos humanos, folha de pagamento, contratações, benefícios, contas a pagar e receber, além de conciliação financeira.",
  },
  faculdade: {
    title: "Faculdade",
    description: "Coordenação dos cursos de graduação e pós-graduação, atendimento acadêmico a alunos e professores, e registros acadêmicos do ensino superior.",
  },
  publicidade: {
    title: "Publicidade",
    description: "Comunicação institucional, assessoria de imprensa, cobertura de eventos escolares, gerenciamento de redes sociais e identidade visual.",
  },
  secretaria: {
    title: "Secretaria",
    description: "Registros acadêmicos da educação básica, processos de matrícula, emissão de históricos, boletins, declarações e atendimento geral ao público.",
  },
  "servicos-gerais": {
    title: "Serviços Gerais",
    description: "Manutenção preventiva e corretiva predial, limpeza e conservação dos ambientes escolares, jardinagem e apoio logístico de eventos.",
  },
  ti: {
    title: "TI / Setape",
    description: "Suporte técnico de hardware e software, gestão de redes de dados, segurança da informação, manutenção de servidores e auxílio em sistemas corporativos.",
  },
  "primeiros-socorros": {
    title: "Primeiros Socorros",
    description: "Atendimento ambulatorial básico a alunos e colaboradores, cuidados de saúde preventivos, triagem e primeiros socorros de ocorrências cotidianas.",
  },
  clat: {
    title: "CLAT",
    description: "Coordenação de laboratórios de ciências, apoio prático às disciplinas, preparação de experimentos e controle de insumos didáticos.",
  },
  almoxarifado: {
    title: "Almoxarifado",
    description: "Armazenamento seguro, controle de fluxo e estoque de materiais escolares e de escritório, além da distribuição interna para os setores.",
  },
};

function getKanbanPapelFromSlug(setor: string): string {
  if (setor === "servicos-gerais") return "servicosgerais";
  if (setor === "primeiros-socorros") return "primeirossocorros";
  if (setor === "ti") return "setape";
  return setor;
}

export default function SetorVisaoGeralPage() {
  const { setor = "" } = useParams<{ setor: string }>();
  const navigate = useNavigate();
  const { usuario, googleIdToken } = useAuth();

  const [usuarios, setUsuarios] = useState<KanbanUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const meta = SECTOR_DESCRIPTIONS[setor];
  const kanbanPapel = getKanbanPapelFromSlug(setor);

  // Permissões
  const privateLinksRoute = `/setores/${setor}`;
  const temAcessoLinks = !!usuario && hasRoleAccessToRoute(usuario.papeis, privateLinksRoute);

  const carregarInfo = useCallback(async () => {
    if (!googleIdToken || !meta) return;
    setLoading(true);
    setError(null);
    try {
      const u = await listarKanbanUsuarios(googleIdToken, kanbanPapel);
      setUsuarios(u);
    } catch (e) {
      console.error("Erro ao carregar visão geral do setor:", e);
      setError(e instanceof Error ? e.message : "Falha ao sincronizar dados do setor.");
    } finally {
      setLoading(false);
    }
  }, [googleIdToken, meta, kanbanPapel]);

  useEffect(() => {
    if (!meta) {
      navigate("/");
      return;
    }
    carregarInfo();
  }, [meta, carregarInfo, navigate]);

  if (!meta) return null;

  return (
    <div className="animate-fade-in pb-12">
      <PageHero title={`Visão Geral — ${meta.title}`} subtitle="Informações da equipe e links de acesso do setor." />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-8">
        {/* Descrição do Setor e Botões de Acesso */}
        <div className="w-full bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary border border-primary/20">
              <Landmark className="w-3.5 h-3.5" />
              Institucional
            </div>
            <h2 className="text-xl font-bold text-foreground">O que fazemos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
              {meta.description}
            </p>
          </div>
          
          <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-border/40">
            {temAcessoLinks ? (
              <Button asChild className="flex items-center gap-2 rounded-xl">
                <Link to={privateLinksRoute}>
                  <Link2 className="w-4 h-4" />
                  Acessar Links do Setor
                </Link>
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded-xl border border-border/30 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                Página de links internos restrita a membros do setor.
              </div>
            )}
          </div>
        </div>

        {/* Equipe do Setor */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Equipe de Colaboradores</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Não foi possível obter a lista de colaboradores deste setor.
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 italic py-4">Nenhum colaborador registrado neste setor ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {usuarios.map((u) => {
                const iniciais = u.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                return (
                  <div key={u.email} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm">
                      {iniciais}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate leading-snug">{u.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      {u.isGerente && (
                        <span className="inline-block mt-1 text-[9px] font-bold text-amber-600 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          Gerente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
