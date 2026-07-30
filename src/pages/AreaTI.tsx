import { useState } from "react";
import { PageHero } from "@/components/PageHero";
import { BookOpen, Key, Eye, EyeOff, Copy, Search, Plus, Lock, School, Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
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

  // Estados para criação automática de turmas no Google Classroom
  const [coursesList, setCoursesList] = useState<Array<{ name: string; teacher: string; status: "pending" | "processing" | "success" | "error"; errorMsg?: string; classroomLink?: string }>>([]);
  const [isProcessingCourses, setIsProcessingCourses] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

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
                  O CSV deve conter cabeçalhos identificando o nome da turma e o nome do professor (que será adicionado no campo "seção"). Delimitadores suportados: vírgula (,) ou ponto e vírgula (;).
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
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:scale-[1.01]"
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
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Processando de forma sequencial para garantir o controle e evitar timeouts no servidor.
                    </p>
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
                        <tr
                          key={idx}
                          className={`transition-colors hover:bg-muted/10 ${
                            idx === currentProcessingIndex ? "bg-primary/5 font-medium" : ""
                          }`}
                        >
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
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-card-foreground">{course.name}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{course.teacher || "—"}</td>
                          <td className="px-6 py-4 text-right">
                            {course.status === "success" && course.classroomLink && (
                              <a
                                href={course.classroomLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary shadow-sm transition-all hover:bg-muted"
                              >
                                Ver Sala de Aula
                              </a>
                            )}
                            {course.status === "error" && course.errorMsg && (
                              <span className="inline-block max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-destructive font-medium" title={course.errorMsg}>
                                {course.errorMsg}
                              </span>
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
    </div>
  );
}
