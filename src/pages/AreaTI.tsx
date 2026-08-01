import { useState, useEffect, useRef } from "react";
import { PageHero } from "@/components/PageHero";
import { BookOpen, Key, Eye, EyeOff, Copy, Search, Plus, Lock, School, Upload, CheckCircle2, XCircle, Loader2, Users, RefreshCw, AlertCircle, Check, FileText, ChevronDown, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { apiUrl } from "@/lib/apiBase";

const tutoriaisInternos = [
  {
    id: 1,
    titulo: "Procedimento de backup do servidor",
    conteudo: "1. Acessar o servidor via SSH\n2. Executar o script /opt/backup/run.sh\n3. Verificar logs em /var/log/backup\n4. Confirmar integridade no Zabbix",
    autor: "João Santos",
    data: "25/02/2026",
  },
  {
    id: 2,
    titulo: "Reset de senha do Active Directory",
    conteudo: "1. Abrir ADUC (Active Directory Users and Computers)\n2. Localizar o usuário\n3. Clicar com botão direito > Reset Password\n4. Marcar 'User must change password at next logon'",
    autor: "Rafael Nunes",
    data: "23/02/2026",
  },
  {
    id: 3,
    titulo: "Configuração do Firewall - Regras padrão",
    conteudo: "Portas liberadas padrão:\n- 80, 443 (HTTP/HTTPS)\n- 3389 (RDP interno)\n- 5432 (PostgreSQL)\nSempre documentar novas regras no wiki interno.",
    autor: "João Santos",
    data: "20/02/2026",
  },
];

const senhasCompartilhadas = [
  { id: 1, servico: "Servidor de Backup", usuario: "admin_backup", senha: "Bkp@2026#Srv!", categoria: "Servidores" },
  { id: 2, servico: "Painel Hosting", usuario: "hosting_admin", senha: "H0st!ng$ecure", categoria: "Web" },
  { id: 3, servico: "Switch Core", usuario: "admin", senha: "Sw!tch#Core99", categoria: "Rede" },
  { id: 4, servico: "Antivírus Console", usuario: "av_admin", senha: "AV@Mng2026!", categoria: "Segurança" },
  { id: 5, servico: "Wi-Fi Corporativo (WPA)", usuario: "N/A", senha: "Corp@WiFi#2026", categoria: "Rede" },
];

export default function AreaTI() {
  const { googleIdToken } = useAuth();
  const [tab, setTab] = useState<"tutoriais" | "senhas" | "classroom">("tutoriais");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedTutorial, setSelectedTutorial] = useState<number | null>(null);

  // Sub-aba do Classroom: "ischolar" | "manual" | "grade"
  const [classroomSubTab, setClassroomSubTab] = useState<"ischolar" | "manual" | "grade">("ischolar");

  // Estados para Grade Horária Excel
  const gradeFileRef = useRef<HTMLInputElement>(null);
  const [gradeStep, setGradeStep] = useState<"upload" | "matching" | "criando" | "resultado">("upload");
  const [gradeIsUploading, setGradeIsUploading] = useState(false);
  const [gradeIsMatching, setGradeIsMatching] = useState(false);
  const [gradeIsCriando, setGradeIsCriando] = useState(false);
  const [gradePares, setGradePares] = useState<any[]>([]);
  const [gradeResultado, setGradeResultado] = useState<any | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [gradePeriodo, setGradePeriodo] = useState("2026.2");
  // Turma iScholar selecionada manualmente por par (para casos sem match automático)
  const [gradeManualSelects, setGradeManualSelects] = useState<Record<number, any>>({});

  // Estados para criação por CSV legado
  const [coursesList, setCoursesList] = useState<Array<{ name: string; teacher: string; status: "pending" | "processing" | "success" | "error"; errorMsg?: string; classroomLink?: string }>>([]);
  const [isProcessingCourses, setIsProcessingCourses] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Estados para Ensalamento Automático iScholar
  const [selectedUnidade, setSelectedUnidade] = useState<"Todas as Unidades" | "Faculdade CCI" | "TecsCCI Escola Técnica">("Todas as Unidades");
  const [turmasIscholar, setTurmasIscholar] = useState<Array<{ id_turma: string; nome_turma: string; curso: string; periodo_letivo: string; unidade: string }>>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [disciplinasTurma, setDisciplinasTurma] = useState<Array<{ id_disciplina: string; nome_disciplina: string; codigo_disciplina: string; periodo_letivo: string; id_professor?: string; nome_professor?: string; email_professor?: string }>>([]);
  const [alunosTurma, setAlunosTurma] = useState<Array<{ id_aluno: string; nome_aluno: string; email: string }>>([]);
  const [mapeamentos, setMapeamentos] = useState<Record<string, any>>({});
  
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isLoadingDisciplinas, setIsLoadingDisciplinas] = useState(false);
  const [isCreatingSalas, setIsCreatingSalas] = useState(false);
  const [isEnsalando, setIsEnsalando] = useState(false);
  const [relatorioEnsalamento, setRelatorioEnsalamento] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsgIscholar, setErrorMsgIscholar] = useState<string | null>(null);
  const [debugResults, setDebugResults] = useState<any | null>(null);
  const [isDebuging, setIsDebuging] = useState(false);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    
    const firstLine = lines[0];
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolons > commas ? ';' : ',';
    
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    const nameIdx = headers.findIndex(h => h.includes('turma') || h.includes('class') || h.includes('nome'));
    const teacherIdx = headers.findIndex(h => h.includes('professor') || h.includes('teacher') || h.includes('secao') || h.includes('seção'));
    
    const finalNameIdx = nameIdx !== -1 ? nameIdx : 0;
    const finalTeacherIdx = teacherIdx !== -1 ? teacherIdx : 1;
    
    const parsedData: typeof coursesList = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;
      
      const name = cols[finalNameIdx] || '';
      const teacher = cols[finalTeacherIdx] || '';
      
      if (name) {
        parsedData.push({
          name,
          teacher,
          status: "pending"
        });
      }
    }
    return parsedData;
  };

  const handleFile = (file: File) => {
    if (file && file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setCoursesList(parsed);
      };
      reader.readAsText(file, 'UTF-8');
    } else {
      alert("Por favor, selecione um arquivo CSV válido.");
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const startCreation = async () => {
    if (coursesList.length === 0) return;
    if (!googleIdToken) {
      alert("Atenção: É necessário estar autenticado com uma conta do Google para criar turmas no Google Classroom. Por favor, faça login usando o botão do Google no topo da página.");
      return;
    }
    setIsProcessingCourses(true);
    
    const updated = [...coursesList];
    
    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === "success") continue;
      
      setCurrentProcessingIndex(i);
      updated[i] = { ...updated[i], status: "processing" };
      setCoursesList([...updated]);
      
      try {
        const response = await fetch(apiUrl("/api/ti/google-classroom/create-course"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken: googleIdToken,
            name: updated[i].name,
            teacher: updated[i].teacher
          })
        });
        
        const resJson = await response.json();
        
        if (response.ok) {
          updated[i] = {
            ...updated[i],
            status: "success",
            classroomLink: resJson.alternateLink
          };
        } else {
          updated[i] = {
            ...updated[i],
            status: "error",
            errorMsg: resJson.error || "Erro desconhecido na API do Google"
          };
        }
      } catch (err: any) {
        updated[i] = {
          ...updated[i],
          status: "error",
          errorMsg: err.message || "Erro de rede"
        };
      }
      
      setCoursesList([...updated]);
    }
    
    setIsProcessingCourses(false);
    setCurrentProcessingIndex(null);
  };

  const downloadTemplateExcel = () => {
    const link = document.createElement("a");
    link.href = "/modelo_classroom.xlsx";
    link.download = "modelo_classroom.xlsx";
    link.click();
  };

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      if (!text || !text.trim()) {
        return { ok: res.ok, json: { error: `Resposta vazia do servidor (HTTP ${res.status}).` } };
      }
      try {
        const json = JSON.parse(text);
        return { ok: res.ok, json };
      } catch (e) {
        return { ok: false, json: { error: `Erro no formato de resposta: ${text.slice(0, 150)}` } };
      }
    } catch (e: any) {
      return { ok: false, json: { error: e.message || "Falha na conexão de rede." } };
    }
  };

  const executarDiagnosticoIscholar = async () => {
    setIsDebuging(true);
    setDebugResults(null);
    try {
      const { ok, json } = await safeFetchJson(apiUrl("/api/ti/ischolar/debug-turmas"));
      setDebugResults(json);
    } catch (e: any) {
      setDebugResults({ error: e.message });
    } finally {
      setIsDebuging(false);
    }
  };

  const carregarTurmasIscholar = async () => {
    setIsLoadingTurmas(true);
    setErrorMsgIscholar(null);
    try {
      const { ok, json } = await safeFetchJson(apiUrl("/api/ti/ischolar/turmas"));
      if (ok && json.ok) {
        setTurmasIscholar(json.turmas || []);
      } else {
        setErrorMsgIscholar(json.error || "Falha ao buscar turmas no iScholar.");
      }
    } catch (e: any) {
      setErrorMsgIscholar(e.message || "Erro de conexão ao carregar turmas.");
    } finally {
      setIsLoadingTurmas(false);
    }
  };

  const selecionarTurma = async (idTurma: string) => {
    setSelectedTurmaId(idTurma);
    setDisciplinasTurma([]);
    setAlunosTurma([]);
    setRelatorioEnsalamento(null);
    setStatusMsg(null);
    if (!idTurma) return;

    setIsLoadingDisciplinas(true);
    setErrorMsgIscholar(null);
    try {
      const turmaAtual = turmasIscholar.find(t => t.id_turma === idTurma);
      const idUnidade = turmaAtual?.id_unidade || "";
      const urlDisc = apiUrl(`/api/ti/ischolar/turmas/${idTurma}/disciplinas${idUnidade ? `?idUnidade=${encodeURIComponent(idUnidade)}` : ""}`);

      const [resDisc, resAlu] = await Promise.all([
        safeFetchJson(urlDisc),
        safeFetchJson(apiUrl(`/api/ti/ischolar/turmas/${idTurma}/alunos`))
      ]);

      if (resDisc.ok && resDisc.json.ok) {
        const discArray = resDisc.json.disciplinas || [];
        console.log("[DEBUG-AreaTI] Disciplinas recebidas do backend:", JSON.stringify(discArray.slice(0, 3), null, 2));
        setDisciplinasTurma(discArray);
        if (resDisc.json.mapeamentos) {
          setMapeamentos(resDisc.json.mapeamentos);
        }
      } else if (resDisc.json.error) {
        setErrorMsgIscholar(resDisc.json.error);
      }

      if (resAlu.ok && resAlu.json.ok) {
        setAlunosTurma(resAlu.json.alunos || []);
      }
    } catch (e: any) {
      setErrorMsgIscholar(e.message || "Erro ao carregar detalhes da turma.");
    } finally {
      setIsLoadingDisciplinas(false);
    }
  };

  const handleCriarSalasDisciplinas = async () => {
    if (!selectedTurmaId || disciplinasTurma.length === 0) return;
    if (!googleIdToken) {
      alert("Atenção: É necessário estar autenticado com uma conta do Google para criar salas no Google Classroom.");
      return;
    }
    setIsCreatingSalas(true);
    setStatusMsg("Criando salas das disciplinas no Google Classroom...");
    setErrorMsgIscholar(null);

    const turmaAtual = turmasIscholar.find(t => t.id_turma === selectedTurmaId);
    const periodoLetivo = turmaAtual?.periodo_letivo || "2026.1";

    try {
      const { ok, json } = await safeFetchJson(apiUrl("/api/ti/google-classroom/criar-salas-disciplinas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          idTurma: selectedTurmaId,
          periodoLetivo: periodoLetivo,
          disciplinas: disciplinasTurma
        })
      });
      if (ok && json.ok) {
        setMapeamentos(json.mapeamentos || {});
        const criadas = json.criadas || [];
        const sucessos = criadas.filter((c: any) => c.status === "sucesso");
        const erros = criadas.filter((c: any) => c.status === "erro");

        if (erros.length > 0) {
          const detalhe = erros.map((e: any) => `${e.nome_disciplina}: ${e.erro || 'Falha'}`).join(" | ");
          setErrorMsgIscholar(`Atenção: ${sucessos.length} salas criadas, mas ${erros.length} apresentaram erro: ${detalhe}`);
        } else {
          setStatusMsg(`Sucesso! ${sucessos.length} salas criadas e mapeadas no Google Classroom!`);
        }
      } else {
        setErrorMsgIscholar(json.error || "Erro ao criar salas no Google Classroom.");
      }
    } catch (e: any) {
      setErrorMsgIscholar(e.message || "Erro de rede ao criar salas.");
    } finally {
      setIsCreatingSalas(false);
    }
  };

  const handleEnsalarAlunosTurma = async () => {
    if (!selectedTurmaId) return;
    if (!googleIdToken) {
      alert("Atenção: É necessário estar autenticado com uma conta do Google para ensalar os alunos.");
      return;
    }

    setIsEnsalando(true);
    setStatusMsg("Matriculando alunos nas salas de aula do Google Classroom...");
    setErrorMsgIscholar(null);
    setRelatorioEnsalamento(null);

    try {
      const { ok, json } = await safeFetchJson(apiUrl("/api/ti/google-classroom/ensalar-turma"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: googleIdToken,
          idTurma: selectedTurmaId
        })
      });
      if (ok && json.ok) {
        setRelatorioEnsalamento(json.relatorio);
        setStatusMsg("Ensalamento concluído com sucesso!");
      } else {
        setErrorMsgIscholar(json.error || "Erro ao realizar o ensalamento.");
      }
    } catch (e: any) {
      setErrorMsgIscholar(e.message || "Erro de comunicação no ensalamento.");
    } finally {
      setIsEnsalando(false);
    }
  };

  useEffect(() => {
    if (tab === "classroom" && classroomSubTab === "ischolar" && turmasIscholar.length === 0) {
      carregarTurmasIscholar();
    }
  }, [tab, classroomSubTab]);

  // ── Grade Horária handlers ──────────────────────────────
  const handleGradeUpload = async (file: File) => {
    if (!googleIdToken) {
      setGradeError("Você precisa estar autenticado com o Google antes de continuar.");
      return;
    }
    setGradeError(null);
    setGradeIsUploading(true);
    setGradeStep("upload");
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      formData.append("idToken", googleIdToken);
      const res = await fetch(apiUrl("/api/ti/grade/parse-excel"), { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Erro ao processar o arquivo.");

      // Após parse, faz matching automático
      setGradeIsMatching(true);
      const resMatch = await fetch(apiUrl("/api/ti/grade/match-turmas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken, turmasExcel: json.turmas }),
      });
      const jsonMatch = await resMatch.json();
      if (!resMatch.ok || !jsonMatch.ok) throw new Error(jsonMatch.error || "Erro ao fazer matching.");

      setGradePares(jsonMatch.pares || []);
      setGradeManualSelects({});
      setGradeStep("matching");
    } catch (e: any) {
      setGradeError(e.message || "Erro inesperado.");
    } finally {
      setGradeIsUploading(false);
      setGradeIsMatching(false);
    }
  };

  const handleCriarSalasGrade = async () => {
    if (!googleIdToken) {
      setGradeError("Autenticação Google necessária.");
      return;
    }
    setGradeError(null);
    setGradeIsCriando(true);
    setGradeStep("criando");
    try {
      // Mescla matches automáticos com seleções manuais
      const paresConfirmados = gradePares.map((par: any, idx: number) => ({
        turmaExcel: par.turmaExcel,
        turmaIscholar: gradeManualSelects[idx] !== undefined ? gradeManualSelects[idx] : par.turmaIscholar,
      }));

      const res = await fetch(apiUrl("/api/ti/grade/criar-salas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: googleIdToken, paresConfirmados, periodoLetivo: gradePeriodo }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Erro ao criar salas.");
      setGradeResultado(json);
      setGradeStep("resultado");
    } catch (e: any) {
      setGradeError(e.message || "Erro inesperado.");
      setGradeStep("matching");
    } finally {
      setGradeIsCriando(false);
    }
  };

  const resetGrade = () => {
    setGradeStep("upload");
    setGradePares([]);
    setGradeResultado(null);
    setGradeError(null);
    setGradeManualSelects({});
    if (gradeFileRef.current) gradeFileRef.current.value = "";
  };


  const togglePassword = (id: number) => {
    const next = new Set(visiblePasswords);
    next.has(id) ? next.delete(id) : next.add(id);
    setVisiblePasswords(next);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const tutorial = tutoriaisInternos.find((t) => t.id === selectedTutorial);

  return (
    <div className="animate-fade-in">
      <PageHero title="Área Interna TI" subtitle="Acesso restrito à equipe de Tecnologia" />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Restricted notice */}
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
          <Lock className="h-4 w-4 text-warning" />
          <p className="text-sm text-warning">Conteúdo confidencial — acesso restrito à equipe de TI.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => { setTab("tutoriais"); setSelectedTutorial(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "tutoriais" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Tutoriais Internos
          </button>
          <button
            onClick={() => { setTab("senhas"); setSelectedTutorial(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "senhas" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Key className="h-4 w-4" />
            Senhas Compartilhadas
          </button>
          <button
            onClick={() => { setTab("classroom"); setSelectedTutorial(null); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "classroom" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <School className="h-4 w-4" />
            Criar Turmas Classroom
          </button>
        </div>

        {tab === "tutoriais" && !selectedTutorial && (
          <div className="space-y-3">
            {tutoriaisInternos.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTutorial(t.id)}
                className="flex w-full items-center gap-4 rounded-xl border border-border bg-card px-6 py-4 text-left shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-card-foreground">{t.titulo}</p>
                  <p className="text-xs text-muted-foreground">{t.autor} · {t.data}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "tutoriais" && tutorial && (
          <div className="animate-fade-in">
            <button onClick={() => setSelectedTutorial(null)} className="mb-4 text-sm text-primary hover:underline">
              ← Voltar
            </button>
            <div className="rounded-xl border border-border bg-card p-8 shadow-card">
              <h2 className="text-xl font-bold text-card-foreground">{tutorial.titulo}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{tutorial.autor} · {tutorial.data}</p>
              <div className="mt-6 whitespace-pre-line rounded-lg bg-muted p-4 font-mono text-sm text-card-foreground">
                {tutorial.conteudo}
              </div>
            </div>
          </div>
        )}

        {tab === "senhas" && (
          <div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar serviço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serviço</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuário</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {senhasCompartilhadas
                    .filter((s) => s.servico.toLowerCase().includes(search.toLowerCase()) || s.categoria.toLowerCase().includes(search.toLowerCase()))
                    .map((s, i) => (
                      <tr key={s.id} className={`transition-colors hover:bg-muted/30 ${i !== senhasCompartilhadas.length - 1 ? "border-b border-border" : ""}`}>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-card-foreground">{s.servico}</p>
                          <p className="text-xs text-muted-foreground">{s.categoria}</p>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-card-foreground">{s.usuario}</td>
                        <td className="px-6 py-4 font-mono text-sm text-card-foreground">
                          {visiblePasswords.has(s.id) ? s.senha : "••••••••••"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => togglePassword(s.id)}
                              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title={visiblePasswords.has(s.id) ? "Ocultar" : "Mostrar"}
                            >
                              {visiblePasswords.has(s.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(s.senha)}
                              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              title="Copiar"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "classroom" && (
          <div className="space-y-6 animate-fade-in">
            {/* Sub-navegação dentro do Classroom */}
            <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
              <button
                onClick={() => setClassroomSubTab("ischolar")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  classroomSubTab === "ischolar"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <School className="h-4 w-4" />
                Ensalamento Automático (iScholar)
              </button>
              <button
                onClick={() => setClassroomSubTab("grade")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  classroomSubTab === "grade"
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Grade Horária (Excel)
              </button>
              <button
                onClick={() => setClassroomSubTab("manual")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  classroomSubTab === "manual"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-card border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Upload className="h-4 w-4" />
                Criação por Planilha CSV (Manual)
              </button>
            </div>

            {!googleIdToken && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200 text-sm flex items-center gap-3 shadow-sm">
                <Lock className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Autenticação do Google requerida</p>
                  <p className="text-xs opacity-90">
                    Você não está autenticado com uma conta do Google. Faça login no canto superior direito do site antes de executar as ações do Classroom.
                  </p>
                </div>
              </div>
            )}

            {/* ABAS DO ISCHOLAR */}
            {classroomSubTab === "ischolar" && (
              <div className="space-y-6">
                {/* Filtro de Unidade Escolar */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-card-foreground">1. Selecionar Unidade Escolar & Turma</h3>
                      <p className="text-xs text-muted-foreground">
                        Escopo exclusivo para a Faculdade CCI e TecsCCI Escola Técnica.
                      </p>
                    </div>

                    {/* Selector de Unidade */}
                    <div className="flex rounded-lg border border-border bg-muted p-1 gap-1">
                      <button
                        onClick={() => { setSelectedUnidade("Todas as Unidades" as any); setSelectedTurmaId(""); setDisciplinasTurma([]); setAlunosTurma([]); }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                          selectedUnidade === ("Todas as Unidades" as any) ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Todas as Unidades
                      </button>
                      <button
                        onClick={() => { setSelectedUnidade("Faculdade CCI"); setSelectedTurmaId(""); setDisciplinasTurma([]); setAlunosTurma([]); }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                          selectedUnidade === "Faculdade CCI" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Faculdade CCI
                      </button>
                      <button
                        onClick={() => { setSelectedUnidade("TecsCCI Escola Técnica"); setSelectedTurmaId(""); setDisciplinasTurma([]); setAlunosTurma([]); }}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                          selectedUnidade === "TecsCCI Escola Técnica" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        TecsCCI Escola Técnica
                      </button>
                    </div>
                  </div>

                  {/* Seletor de Turmas do iScholar & Campo de Busca por ID Direto */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="flex-1">
                      <select
                        value={selectedTurmaId}
                        onChange={(e) => selecionarTurma(e.target.value)}
                        disabled={isLoadingTurmas}
                        className="w-full rounded-lg border border-input bg-card py-2.5 px-3 text-sm font-medium text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
                      >
                        <option value="">
                          -- Selecione uma turma ({selectedUnidade === ("Todas as Unidades" as any) ? turmasIscholar.length : turmasIscholar.filter(t => t.unidade === selectedUnidade).length} encontrada(s)) --
                        </option>
                        {(selectedUnidade === ("Todas as Unidades" as any) ? turmasIscholar : turmasIscholar.filter(t => t.unidade === selectedUnidade))
                          .map((t) => (
                            <option key={t.id_turma} value={t.id_turma}>
                              {t.nome_turma} {t.curso ? `(${t.curso})` : ""} — Período: {t.periodo_letivo} (ID: {t.id_turma})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digitar ID da Turma..."
                        value={selectedTurmaId}
                        onChange={(e) => setSelectedTurmaId(e.target.value)}
                        className="w-36 rounded-lg border border-input bg-card py-2 px-3 text-sm font-mono text-card-foreground focus:border-primary focus:outline-none"
                      />
                      <button
                        onClick={() => selecionarTurma(selectedTurmaId)}
                        disabled={!selectedTurmaId || isLoadingDisciplinas}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        Buscar ID
                      </button>
                      <button
                        onClick={carregarTurmasIscholar}
                        disabled={isLoadingTurmas}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground shadow-sm hover:bg-muted disabled:opacity-50"
                        title="Atualizar lista do iScholar"
                      >
                        {isLoadingTurmas ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Atualizar Lista
                      </button>
                      <button
                        onClick={executarDiagnosticoIscholar}
                        disabled={isDebuging}
                        className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-sm hover:bg-amber-500/20 disabled:opacity-50"
                        title="Diagnosticar endpoints da API do iScholar"
                      >
                        {isDebuging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Diagnosticar API
                      </button>
                    </div>
                  </div>

                  {debugResults && (
                    <div className="rounded-lg border border-border bg-muted/60 p-4 text-xs space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-card-foreground">Resultado do Diagnóstico iScholar API</h4>
                        <button onClick={() => setDebugResults(null)} className="text-[11px] text-muted-foreground hover:underline">Fechar</button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Credenciais: Código Escola: {debugResults.credenciaisConfiguradas?.codigoEscola || "—"} | Token: {debugResults.credenciaisConfiguradas?.tokenPresente ? "OK" : "Ausente"}
                      </p>
                      <div className="max-h-[220px] overflow-y-auto space-y-2 font-mono">
                        {debugResults.resultados?.map((res: any, idx: number) => (
                          <div key={idx} className="rounded border border-border bg-card p-2 text-[11px]">
                            <p className="font-bold text-card-foreground">{res.method} {res.url}</p>
                            <p className={res.status === 200 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                              Status HTTP: {res.status} {res.statusText || ""} | Tam. Corpo: {res.bodyLength} bytes
                            </p>
                            {res.jsonSnippet && (
                              <pre className="mt-1 overflow-x-auto text-[10px] text-muted-foreground bg-muted p-1 rounded max-h-24">
                                {typeof res.jsonSnippet === "object" ? JSON.stringify(res.jsonSnippet, null, 2) : String(res.jsonSnippet)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {errorMsgIscholar && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsgIscholar}</span>
                    </div>
                  )}

                  {statusMsg && (
                    <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs font-medium text-success flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{statusMsg}</span>
                    </div>
                  )}
                </div>

                {/* PAINEL DE DISCIPLINAS E ALUNOS */}
                {selectedTurmaId && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CARD DISCIPLINAS */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-card flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-base font-bold text-card-foreground">Disciplinas da Turma</h4>
                            <p className="text-xs text-muted-foreground">Padrão: Nome da Disciplina - Período Letivo</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            {disciplinasTurma.length} Disciplina(s)
                          </span>
                        </div>

                        {isLoadingDisciplinas ? (
                          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            Buscando disciplinas no iScholar...
                          </div>
                        ) : disciplinasTurma.length === 0 ? (
                          <p className="py-6 text-center text-xs text-muted-foreground italic">
                            Nenhuma disciplina encontrada para esta turma.
                          </p>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                            {disciplinasTurma.map((d) => {
                              const chave = `${selectedTurmaId}_${d.id_disciplina}`;
                              const mapItem = mapeamentos[chave];
                              const turmaAtual = turmasIscholar.find(t => t.id_turma === selectedTurmaId);
                              
                              const formatarStr = (val: any): string => {
                                if (!val) return "";
                                if (typeof val === "string") return val.trim();
                                if (typeof val === "number") return String(val).trim();
                                if (typeof val === "object") {
                                  const inner = val.disciplina_nome || val.nome_disciplina || val.nome || val.periodo_letivo || val.periodo || val.descricao || val.ano_letivo || val.disciplina || val.titulo || "";
                                  if (inner && typeof inner === "object") return formatarStr(inner);
                                  return String(inner || "").trim();
                                }
                                return String(val).trim();
                              };

                              const nomeLimpo = formatarStr(d.nome_disciplina) || "Disciplina";
                              const periodoStr = formatarStr(turmaAtual?.periodo_letivo) || formatarStr(d.periodo_letivo) || '2026.1';
                              const nomePadrao = `${nomeLimpo} - ${periodoStr}`;

                              return (
                                <div key={d.id_disciplina} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
                                  <div>
                                    <p className="font-semibold text-card-foreground">{nomePadrao}</p>
                                    {(() => {
                                      const nomeDocenteExibicao = d.nome_professor || (d.id_professor ? `Docente (ID: ${d.id_professor})` : "Pendente / Não informado");
                                      return (
                                        <p className="text-[11px] text-muted-foreground">
                                          ID: {d.id_disciplina}
                                          <span className="ml-1.5 font-medium text-foreground">
                                            • Docente: {nomeDocenteExibicao} {d.email_professor ? `(${d.email_professor})` : ""}
                                          </span>
                                        </p>
                                      );
                                    })()}
                                  </div>

                                  {mapItem ? (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                                        <Check className="h-3 w-3" />
                                        {mapItem.reaproveitada ? "Compartilhada" : "Criada"}
                                      </span>
                                      {mapItem.alternateLink && (
                                        <a
                                          href={mapItem.alternateLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[11px] font-medium text-primary hover:underline"
                                        >
                                          Ver
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                      Pendente
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleCriarSalasDisciplinas}
                        disabled={isCreatingSalas || isLoadingDisciplinas || disciplinasTurma.length === 0}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isCreatingSalas ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Criando Salas no Classroom...
                          </>
                        ) : (
                          <>
                            <School className="h-4 w-4" />
                            1. Criar Salas das Disciplinas no Classroom
                          </>
                        )}
                      </button>
                    </div>

                    {/* CARD ALUNOS E ENSALAMENTO */}
                    <div className="rounded-xl border border-border bg-card p-6 shadow-card flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-base font-bold text-card-foreground">Alunos Matriculados</h4>
                            <p className="text-xs text-muted-foreground">Alunos a serem ensalados nas disciplinas</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            {alunosTurma.length} Aluno(s)
                          </span>
                        </div>

                        {isLoadingDisciplinas ? (
                          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            Carregando alunos...
                          </div>
                        ) : alunosTurma.length === 0 ? (
                          <p className="py-6 text-center text-xs text-muted-foreground italic">
                            Nenhum aluno encontrado nesta turma.
                          </p>
                        ) : (
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                            {alunosTurma.map((a) => (
                              <div key={a.id_aluno} className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
                                <div>
                                  <p className="font-semibold text-card-foreground">{a.nome_aluno}</p>
                                  <p className="text-[11px] font-mono text-muted-foreground">{a.email}</p>
                                </div>
                                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleEnsalarAlunosTurma}
                        disabled={isEnsalando || isLoadingDisciplinas || alunosTurma.length === 0}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isEnsalando ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Ensalando Alunos...
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4" />
                            2. Ensalar Alunos Automático
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* RELATÓRIO DE ENSALAMENTO */}
                {relatorioEnsalamento && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4 animate-fade-in">
                    <h4 className="text-base font-bold text-card-foreground">Relatório de Ensalamento Automático</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs text-muted-foreground font-semibold">Total Alunos</p>
                        <p className="text-xl font-bold text-card-foreground">{relatorioEnsalamento.totalAlunos}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 p-3">
                        <p className="text-xs font-semibold">Inseridos</p>
                        <p className="text-xl font-bold text-emerald-600">{relatorioEnsalamento.sucessos}</p>
                      </div>
                      <div className="rounded-lg bg-blue-500/10 text-blue-900 dark:text-blue-300 p-3">
                        <p className="text-xs font-semibold">Já Existiam</p>
                        <p className="text-xl font-bold text-blue-600">{relatorioEnsalamento.jaMatriculados}</p>
                      </div>
                      <div className="rounded-lg bg-destructive/10 text-destructive p-3">
                        <p className="text-xs font-semibold">Falhas</p>
                        <p className="text-xl font-bold text-destructive">{relatorioEnsalamento.falhas}</p>
                      </div>
                    </div>

                    <div className="max-h-[250px] overflow-y-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-left font-semibold text-muted-foreground">
                            <th className="px-4 py-2">Aluno</th>
                            <th className="px-4 py-2">E-mail</th>
                            <th className="px-4 py-2">Sala de Aula</th>
                            <th className="px-4 py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {relatorioEnsalamento.detalhes?.map((item: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-4 py-2 font-medium text-card-foreground">{item.aluno}</td>
                              <td className="px-4 py-2 font-mono text-muted-foreground">{item.email}</td>
                              <td className="px-4 py-2 text-card-foreground">{item.sala}</td>
                              <td className="px-4 py-2">
                                {item.status === "matriculado" && (
                                  <span className="text-emerald-600 font-semibold">Inscrito</span>
                                )}
                                {item.status === "ja_existia" && (
                                  <span className="text-blue-600 font-semibold">Já estava na sala</span>
                                )}
                                {item.status === "erro" && (
                                  <span className="text-destructive font-semibold" title={item.erro}>Erro: {item.erro}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA GRADE HORÁRIA */}
            {classroomSubTab === "grade" && (
              <div className="space-y-6 animate-fade-in">

                {/* Erro global */}
                {gradeError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-700 dark:text-red-300 text-sm">
                    <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{gradeError}</span>
                  </div>
                )}

                {/* STEP 1: Upload */}
                {gradeStep === "upload" && (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-5">
                    <div>
                      <h3 className="text-base font-bold text-card-foreground flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                        Criar Salas via Grade Horária
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Faça upload do Excel da grade horária semestral. O sistema irá extrair as turmas e disciplinas e fazer a correspondência automática com o iScholar.
                      </p>
                    </div>

                    {/* Campo de período */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-card-foreground whitespace-nowrap">Período Letivo:</label>
                      <input
                        type="text"
                        value={gradePeriodo}
                        onChange={e => setGradePeriodo(e.target.value)}
                        placeholder="Ex: 2026.2"
                        className="w-32 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                    </div>

                    {/* Drop zone */}
                    <label
                      htmlFor="grade-excel-upload"
                      className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-emerald-400/60 bg-emerald-50/30 dark:bg-emerald-950/20 p-10 cursor-pointer transition-all hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30"
                    >
                      {gradeIsUploading || gradeIsMatching ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {gradeIsMatching ? "Fazendo correspondência com o iScholar..." : "Processando arquivo Excel..."}
                          </p>
                        </div>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-12 w-12 text-emerald-500" />
                          <div className="text-center">
                            <p className="text-sm font-semibold text-card-foreground">Clique para selecionar o arquivo Excel</p>
                            <p className="text-xs text-muted-foreground mt-1">ou arraste e solte aqui · Formato: .xlsx ou .xls</p>
                          </div>
                        </>
                      )}
                      <input
                        id="grade-excel-upload"
                        ref={gradeFileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        disabled={gradeIsUploading || gradeIsMatching}
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) handleGradeUpload(f);
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* STEP 2: Tabela de correspondências */}
                {gradeStep === "matching" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className="text-base font-bold text-card-foreground">Confirmar Correspondências</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Verifique os pares identificados automaticamente. Turmas sem correspondência precisam de seleção manual.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={resetGrade}
                            className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Recomeçar
                          </button>
                          <button
                            onClick={handleCriarSalasGrade}
                            disabled={gradeIsCriando}
                            className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-semibold shadow transition-colors"
                          >
                            {gradeIsCriando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Criar Salas no Classroom
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Resumo */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-card-foreground">{gradePares.length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Turmas no Excel</p>
                      </div>
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-emerald-600">{gradePares.filter((p: any) => (gradeManualSelects[gradePares.indexOf(p)] ?? p.turmaIscholar) !== null).length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Com correspondência</p>
                      </div>
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm text-center">
                        <p className="text-2xl font-bold text-amber-600">{gradePares.filter((p: any, i: number) => (gradeManualSelects[i] ?? p.turmaIscholar) === null).length}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sem correspondência</p>
                      </div>
                    </div>

                    {/* Tabela de pares */}
                    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turma no Excel</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turma no iScholar</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disciplinas</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gradePares.map((par: any, idx: number) => {
                              const ischolarAtual = gradeManualSelects[idx] !== undefined ? gradeManualSelects[idx] : par.turmaIscholar;
                              const matched = ischolarAtual !== null;
                              return (
                                <tr key={idx} className={`border-b border-border last:border-0 transition-colors ${!matched ? "bg-amber-50/30 dark:bg-amber-950/10" : "hover:bg-muted/20"}`}>
                                  <td className="px-4 py-3">
                                    <p className="font-medium text-card-foreground">{par.turmaExcel.nomeTurma}</p>
                                    <p className="text-xs text-muted-foreground">{par.turmaExcel.curso} · Período {par.turmaExcel.periodo}</p>
                                  </td>
                                  <td className="px-4 py-3">
                                    {par.turmasCandidatas && par.turmasCandidatas.length > 0 ? (
                                      <select
                                        value={ischolarAtual ? ischolarAtual.id_turma : ""}
                                        onChange={e => {
                                          const val = e.target.value;
                                          if (val === "") {
                                            setGradeManualSelects(prev => ({ ...prev, [idx]: null }));
                                          } else {
                                            const found = par.turmasCandidatas.find((c: any) => String(c.id_turma) === val);
                                            setGradeManualSelects(prev => ({ ...prev, [idx]: found || null }));
                                          }
                                        }}
                                        className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-ring/20"
                                      >
                                        <option value="">— Sem correspondência —</option>
                                        {par.turmasCandidatas.map((c: any) => (
                                          <option key={c.id_turma} value={c.id_turma}>
                                            [{c.score}pts] {c.nome_turma || c.nome} ({c.periodo_letivo})
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">Nenhuma candidata encontrada</span>
                                    )}
                                    {ischolarAtual && (
                                      <p className="text-xs text-emerald-600 mt-0.5 font-medium">ID: {ischolarAtual.id_turma}</p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {(par.turmaExcel.disciplinas || []).slice(0, 5).map((d: any, di: number) => (
                                        <span key={di} className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{d.nome}</span>
                                      ))}
                                      {(par.turmaExcel.disciplinas || []).length > 5 && (
                                        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">+{(par.turmaExcel.disciplinas || []).length - 5} mais</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {matched ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-xs font-semibold">
                                        <Check className="h-3 w-3" /> Correspondida
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-1 text-xs font-semibold">
                                        <AlertCircle className="h-3 w-3" /> Sem match
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Criando */}
                {gradeStep === "criando" && (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-16 shadow-card">
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
                    <p className="text-base font-semibold text-card-foreground">Criando salas no Google Classroom...</p>
                    <p className="text-xs text-muted-foreground">Isso pode levar alguns minutos. Não feche esta página.</p>
                  </div>
                )}

                {/* STEP 4: Resultado */}
                {gradeStep === "resultado" && gradeResultado && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-card">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Salas criadas com sucesso!
                          </h3>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-card-foreground font-semibold">{gradeResultado.resumo?.totalCriadas ?? 0} <span className="font-normal text-muted-foreground">novas salas</span></span>
                            <span className="text-card-foreground font-semibold">{gradeResultado.resumo?.totalReaproveitadas ?? 0} <span className="font-normal text-muted-foreground">reaproveitadas</span></span>
                            {(gradeResultado.resumo?.totalErros ?? 0) > 0 && (
                              <span className="text-red-600 font-semibold">{gradeResultado.resumo.totalErros} <span className="font-normal">erros</span></span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={resetGrade}
                          className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold shadow transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" /> Novo Upload
                        </button>
                      </div>
                    </div>

                    {/* Resultado por turma */}
                    <div className="space-y-3">
                      {(gradeResultado.resultadosPorTurma || []).map((turma: any, ti: number) => (
                        <div key={ti} className={`rounded-xl border p-4 shadow-sm ${turma.status === "sem_correspondencia" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-card-foreground">{turma.nomeTurma}</p>
                            {turma.status === "sem_correspondencia" ? (
                              <span className="text-xs text-amber-600 font-medium">⚠ Sem correspondência no iScholar</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">ID iScholar: {turma.idTurmaIscholar}</span>
                            )}
                          </div>
                          {turma.disciplinas && turma.disciplinas.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {turma.disciplinas.map((d: any, di: number) => (
                                <span
                                  key={di}
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                                    d.status === "erro" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                                    d.reaproveitada ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                                    "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                  }`}
                                  title={d.alternateLink || d.erro || ""}
                                >
                                  {d.status === "erro" ? <XCircle className="h-3 w-3" /> : d.reaproveitada ? <RefreshCw className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                                  {d.nome_disciplina}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA MANUAL (CSV LEGADO) */}
            {classroomSubTab === "manual" && (
              <div className="space-y-6">
                {coursesList.length === 0 ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all ${
                      dragActive ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-sm font-semibold text-card-foreground">
                      Selecione ou arraste o arquivo CSV das turmas
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground text-center max-w-md">
                      O CSV deve conter cabeçalhos identificando o nome da turma e o nome do professor.
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                      <button
                        onClick={() => document.getElementById("csv-file-input")?.click()}
                        className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
                      >
                        Selecionar Arquivo
                      </button>
                      <button
                        onClick={downloadTemplateExcel}
                        className="rounded-lg border border-border bg-card px-5 py-2 text-sm font-semibold text-card-foreground shadow-sm transition-all hover:bg-muted"
                      >
                        Baixar Modelo Excel (.xlsx)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-card-foreground">Turmas Carregadas</h3>
                        <p className="text-xs text-muted-foreground">
                          Revise a lista abaixo antes de iniciar o processo de criação automática.
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          disabled={isProcessingCourses}
                          onClick={() => setCoursesList([])}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted disabled:opacity-50"
                        >
                          Limpar / Voltar
                        </button>
                        <button
                          disabled={isProcessingCourses || coursesList.length === 0}
                          onClick={startCreation}
                          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isProcessingCourses ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Criando Turmas...
                            </>
                          ) : (
                            "Iniciar Criação"
                          )}
                        </button>
                      </div>
                    </div>

                    {isProcessingCourses && (
                      <div className="mb-6 rounded-lg bg-muted p-4 border border-border">
                        <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Progresso de Criação</span>
                          <span className="text-card-foreground">
                            {coursesList.filter(c => c.status === "success" || c.status === "error").length} de {coursesList.length} ({coursesList.length > 0 ? Math.round((coursesList.filter(c => c.status === "success" || c.status === "error").length / coursesList.length) * 100) : 0}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${coursesList.length > 0 ? Math.round((coursesList.filter(c => c.status === "success" || c.status === "error").length / coursesList.length) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-h-[450px] overflow-y-auto rounded-lg border border-border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Nome da Turma</th>
                            <th className="px-6 py-3">Professor (Seção)</th>
                            <th className="px-6 py-3 text-right">Ação / Detalhe</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {coursesList.map((course, idx) => (
                            <tr key={idx} className={idx === currentProcessingIndex ? "bg-primary/5 font-medium" : ""}>
                              <td className="whitespace-nowrap px-6 py-4">
                                {course.status === "pending" && (
                                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                    Pendente
                                  </span>
                                )}
                                {course.status === "processing" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Criando
                                  </span>
                                )}
                                {course.status === "success" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Sucesso
                                  </span>
                                )}
                                {course.status === "error" && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
                                    <XCircle className="h-3 w-3" />
                                    Erro
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-semibold text-card-foreground">{course.name}</td>
                              <td className="px-6 py-4 text-sm text-muted-foreground">{course.teacher || "—"}</td>
                              <td className="px-6 py-4 text-right">
                                {course.status === "success" && course.classroomLink && (
                                  <a
                                    href={course.classroomLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-muted"
                                  >
                                    Ver Sala de Aula
                                  </a>
                                )}
                                {course.status === "error" && course.errorMsg && (
                                  <span className="text-xs text-destructive font-medium">{course.errorMsg}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
