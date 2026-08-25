import { useState, useMemo, useCallback, useEffect } from "react";
import { PageHero } from "@/components/PageHero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Search,
  Download,
  Clock,
  Building2,
  Info,
  FileText,
  Trophy,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  Briefcase,
  Trash2
} from "lucide-react";

export interface AtestadoItem {
  id: string;
  funcionario: string;
  empresa: string;
  cpfMatricula: string;
  setor: string;
  cargo: string;
  dataInicio: string;
  diasAfastamento: number;
  dataFim: string;
  cid: string;
  status: "Homologado" | "Em Análise" | "Encaminhado INSS" | "Rejeitado";
  observacao?: string;
}

const LOCAL_STORAGE_KEY = "dp_atestados_data_cache_v1";

const MOCK_ATESTADOS: AtestadoItem[] = [
  // Almoxarifado
  {
    id: "AT-1001",
    funcionario: "Jaira Pereira Fernandes",
    empresa: "SERVIBRAGA SERVICOS LTDA",
    cpfMatricula: "123.456.789-01",
    setor: "Almoxarifado",
    cargo: "Auxiliar de Almoxarifado",
    dataInicio: "2026-08-01",
    diasAfastamento: 103,
    dataFim: "2026-11-12",
    cid: "M54.5 - Dor lombar baixa",
    status: "Homologado",
  },
  {
    id: "AT-1002",
    funcionario: "Junnya Mara de Matos Dantas",
    empresa: "Terceiros CCI",
    cpfMatricula: "234.567.890-12",
    setor: "Almoxarifado",
    cargo: "Auxiliar",
    dataInicio: "2026-08-05",
    diasAfastamento: 32,
    dataFim: "2026-09-06",
    cid: "F41 - Ansiedade",
    status: "Homologado",
  },
  {
    id: "AT-1003",
    funcionario: "Kayllane Batista de Lima Gomes",
    empresa: "SERVIBRAGA SERVICOS LTDA",
    cpfMatricula: "345.678.901-23",
    setor: "Almoxarifado",
    cargo: "Auxiliar",
    dataInicio: "2026-08-10",
    diasAfastamento: 27,
    dataFim: "2026-09-06",
    cid: "J11 - Gripe",
    status: "Homologado",
  },

  // Professores do 5º ao 8º ano
  {
    id: "AT-1004",
    funcionario: "Adriano Linhares da Silva",
    empresa: "SERVIBRAGA SERVICOS LTDA",
    cpfMatricula: "456.789.012-34",
    setor: "Professores do 5º ao 8º ano",
    cargo: "Professor",
    dataInicio: "2026-08-10",
    diasAfastamento: 14,
    dataFim: "2026-08-24",
    cid: "R49.0 - Rouquidão",
    status: "Homologado",
  },
  {
    id: "AT-1005",
    funcionario: "Allan Ribeiro da Silva",
    empresa: "SERVISENIOR SERVICOS LTDA",
    cpfMatricula: "567.890.123-45",
    setor: "Professores do 5º ao 8º ano",
    cargo: "Professor",
    dataInicio: "2026-08-05",
    diasAfastamento: 7,
    dataFim: "2026-08-12",
    cid: "Z00 - Consulta",
    status: "Homologado",
  }
];

// Parser de linhas CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  const delimiter = line.includes(';') && !line.includes('","') ? ';' : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(cell => cell.replace(/^["']|["']$/g, '').trim());
}

// Detecção inteligente de colunas
function autoDetectColumns(headers: string[], firstRow: string[]) {
  const normHeaders = headers.map(h => h.toLowerCase().normalize("NFD").replace(/\p{M}/gu, ""));
  
  let colEmpresa = -1;
  let colNome = -1;
  let colSetor = -1;
  let colDias = -1;

  normHeaders.forEach((h, idx) => {
    if (h.includes("empresa") || h.includes("razao") || h.includes("terceiro") || h.includes("fornecedor") || h.includes("cnpj")) {
      colEmpresa = idx;
    }
    if (h.includes("colaborador") || h.includes("funcionario") || h.includes("nome do funcionario") || h.includes("nome do colaborador") || h.includes("pessoa")) {
      colNome = idx;
    } else if (h.includes("nome") && colNome === -1 && !h.includes("empresa")) {
      colNome = idx;
    }
    if (h.includes("setor") || h.includes("departamento") || h.includes("dep") || h.includes("area") || h.includes("unidade")) {
      colSetor = idx;
    }
    if (h.includes("dias") || h.includes("afastamento") || h.includes("qtd") || h.includes("duracao") || h.includes("quantidade")) {
      colDias = idx;
    }
  });

  if (colNome === -1 || colNome === colEmpresa) {
    if (firstRow.length > 1) {
      const val0 = (firstRow[0] || "").toUpperCase();
      if (val0.includes("LTDA") || val0.includes("SERVICO") || val0.includes("S/A") || val0.includes("EIRELI")) {
        colEmpresa = 0;
        colNome = 1;
      } else {
        colNome = 0;
      }
    } else {
      colNome = 0;
    }
  }

  if (colSetor === -1) colSetor = firstRow.length > 2 ? 2 : 1;
  if (colDias === -1) colDias = firstRow.length > 3 ? 3 : 2;

  return {
    colEmpresa: colEmpresa !== -1 ? colEmpresa : 0,
    colNome: colNome !== -1 ? colNome : 1,
    colSetor: colSetor !== -1 ? colSetor : 2,
    colDias: colDias !== -1 ? colDias : 3
  };
}

export default function DashboardAtestadosPage() {
  const [atestados, setAtestados] = useState<AtestadoItem[]>(MOCK_ATESTADOS);
  const [rawCSVHeaders, setRawCSVHeaders] = useState<string[]>([]);
  const [rawCSVRows, setRawCSVRows] = useState<string[][]>([]);

  const [visualizacao, setVisualizacao] = useState<"lista" | "cards">("lista");

  const [mapping, setMapping] = useState({
    colEmpresa: 0,
    colNome: 1,
    colSetor: 2,
    colDias: 3
  });

  const [mostrarConfigurador, setMostrarConfigurador] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");
  
  const [carregandoSync, setCarregandoSync] = useState(false);
  const [menssagemSync, setMenssagemSync] = useState<{ tipo: "sucesso" | "erro" | "info"; texto: string } | null>(null);

  // 1. CARREGAR DADOS PERSISTIDOS NO STARTUP (localStorage + Server)
  useEffect(() => {
    // Tenta carregar do localStorage do navegador
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.atestados && parsed.atestados.length > 0) {
          setAtestados(parsed.atestados);
          if (parsed.headers) setRawCSVHeaders(parsed.headers);
          if (parsed.rows) setRawCSVRows(parsed.rows);
          if (parsed.mapping) setMapping(parsed.mapping);
          return;
        }
      }
    } catch (e) {
      console.warn("Erro ao ler localStorage de atestados:", e);
    }

    // Se não tiver local, busca do servidor
    void carregarDoServidor();
  }, []);

  const carregarDoServidor = async () => {
    try {
      const res = await fetch("/api/dp-financeiro/atestados");
      const data = await res.json();
      if (data.success && Array.isArray(data.rows) && data.rows.length > 0) {
        const headers = data.headers || data.rows[0].map((h: any) => String(h || ''));
        const rows = data.headers ? data.rows : data.rows.slice(1);

        setRawCSVHeaders(headers);
        setRawCSVRows(rows);

        const detected = autoDetectColumns(headers, rows[0] || []);
        setMapping(detected);
        reprocessarCSV(rows, detected, false);
      }
    } catch {
      // usa mock padrão
    }
  };

  // Persistir dados no servidor e localStorage
  const salvarPersistencia = (novosAtestados: AtestadoItem[], rows: string[][], headers: string[], mapObj: typeof mapping) => {
    // 1. Salvar no localStorage do navegador
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          atestados: novosAtestados,
          rows,
          headers,
          mapping: mapObj,
          savedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.warn("Erro ao salvar no localStorage:", e);
    }

    // 2. Salvar no backend (para outros computadores/usuários)
    fetch("/api/dp-financeiro/atestados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, headers, title: "Planilha Importada de Atestados" })
    }).catch(err => console.warn("Erro ao persistir no servidor:", err));
  };

  // Limpar dados salvos
  const limparDadosSalvos = async () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setAtestados(MOCK_ATESTADOS);
    setRawCSVHeaders([]);
    setRawCSVRows([]);
    setMostrarConfigurador(false);
    
    try {
      await fetch("/api/dp-financeiro/atestados", { method: "DELETE" });
    } catch {
      // ignore
    }

    setMenssagemSync({
      tipo: "info",
      texto: "Dados importados limpos. Exibindo dados padrão."
    });
  };

  // Reprocessar CSV
  const reprocessarCSV = (rows: string[][], mapObj: typeof mapping, persistir = true) => {
    const processados: AtestadoItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || cols.length === 0) continue;

      const empresaVal = cols[mapObj.colEmpresa] || "";
      const nomeVal = cols[mapObj.colNome] || cols[0] || "";
      const setorVal = cols[mapObj.colSetor] || "Setor Geral";
      const diasVal = parseInt(cols[mapObj.colDias] || "1") || 1;

      if (!nomeVal || nomeVal.toLowerCase().includes("colaborador") || nomeVal.toLowerCase().includes("nome")) continue;

      processados.push({
        id: `IMP-${i}`,
        funcionario: nomeVal,
        empresa: empresaVal !== nomeVal ? empresaVal : "",
        cpfMatricula: "-",
        setor: setorVal,
        cargo: "-",
        dataInicio: cols[4] || new Date().toISOString().split("T")[0],
        diasAfastamento: diasVal,
        dataFim: "-",
        cid: cols[5] || "Atestado Médico",
        status: "Homologado",
      });
    }

    if (processados.length > 0) {
      setAtestados(processados);
      if (persistir) {
        salvarPersistencia(processados, rows, rawCSVHeaders, mapObj);
      }
      setMenssagemSync({
        tipo: "sucesso",
        texto: `${processados.length} registros importados e SALVOS com sucesso! Os dados continuarão salvos mesmo ao navegar entre páginas.`
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) return;

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1).map(line => parseCSVLine(line));

      setRawCSVHeaders(headers);
      setRawCSVRows(dataRows);

      const detected = autoDetectColumns(headers, dataRows[0] || []);
      setMapping(detected);
      setMostrarConfigurador(true);

      reprocessarCSV(dataRows, detected, true);
    };

    reader.readAsText(file, "UTF-8");
  };

  const handleMappingChange = (field: keyof typeof mapping, valStr: string) => {
    const val = parseInt(valStr);
    const updated = { ...mapping, [field]: val };
    setMapping(updated);
    if (rawCSVRows.length > 0) {
      reprocessarCSV(rawCSVRows, updated, true);
    }
  };

  const sincronizarGoogleSheets = useCallback(async () => {
    setCarregandoSync(true);
    setMenssagemSync(null);
    try {
      const res = await fetch("/api/dp-financeiro/atestados");
      const data = await res.json();
      
      if (data.success && Array.isArray(data.rows) && data.rows.length > 1) {
        const headers = data.headers || data.rows[0].map((h: any) => String(h || ''));
        const dataRows = data.headers ? data.rows : data.rows.slice(1);

        setRawCSVHeaders(headers);
        setRawCSVRows(dataRows);

        const detected = autoDetectColumns(headers, dataRows[0] || []);
        setMapping(detected);

        reprocessarCSV(dataRows, detected, true);
      } else {
        setMenssagemSync({
          tipo: "info",
          texto: data.message || "Compartilhe a planilha no Google Sheets com o e-mail: central-connect-ou@vinculandoou.iam.gserviceaccount.com."
        });
      }
    } catch {
      setMenssagemSync({
        tipo: "erro",
        texto: "Erro ao conectar ao servidor backend."
      });
    } finally {
      setCarregandoSync(false);
    }
  }, []);

  const atestadosFiltrados = useMemo(() => {
    return atestados.filter(item => {
      const termo = busca.toLowerCase();
      const matchBusca =
        !busca ||
        item.funcionario.toLowerCase().includes(termo) ||
        (item.empresa && item.empresa.toLowerCase().includes(termo)) ||
        item.setor.toLowerCase().includes(termo);

      const matchSetor = filtroSetor === "todos" || item.setor === filtroSetor;

      return matchBusca && matchSetor;
    });
  }, [atestados, busca, filtroSetor]);

  const setoresUnicos = useMemo(() => {
    const s = new Set(atestados.map(a => a.setor));
    return Array.from(s).filter(Boolean).sort();
  }, [atestados]);

  // 🏆 RANKING TOP 3 POR SETOR (ORDENADO POR DIAS DE AFASTAMENTO)
  const rankingTop3PorSetor = useMemo(() => {
    const sectorMap = new Map<string, Map<string, { funcionario: string; empresa: string; count: number; totalDias: number }>>();

    atestadosFiltrados.forEach((item) => {
      const sector = item.setor || "Geral";
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, new Map());
      }
      const empMap = sectorMap.get(sector)!;
      const current = empMap.get(item.funcionario) || {
        funcionario: item.funcionario,
        empresa: item.empresa,
        count: 0,
        totalDias: 0,
      };
      current.count += 1;
      current.totalDias += item.diasAfastamento;
      empMap.set(item.funcionario, current);
    });

    const result: Array<{
      setor: string;
      totalAtestadosSetor: number;
      totalDiasSetor: number;
      ranking: Array<{
        funcionario: string;
        empresa: string;
        count: number;
        totalDias: number;
      }>;
    }> = [];

    sectorMap.forEach((empMap, setor) => {
      const list = Array.from(empMap.values()).sort((a, b) => {
        if (b.totalDias !== a.totalDias) return b.totalDias - a.totalDias;
        return b.count - a.count;
      });

      const totalAtestadosSetor = list.reduce((acc, curr) => acc + curr.count, 0);
      const totalDiasSetor = list.reduce((acc, curr) => acc + curr.totalDias, 0);

      result.push({
        setor,
        totalAtestadosSetor,
        totalDiasSetor,
        ranking: list.slice(0, 3), // Top 3
      });
    });

    return result.sort((a, b) => a.setor.localeCompare(b.setor));
  }, [atestadosFiltrados]);

  const metricas = useMemo(() => {
    const total = atestadosFiltrados.length;
    const totalDias = atestadosFiltrados.reduce((acc, curr) => acc + curr.diasAfastamento, 0);
    return { total, totalDias };
  }, [atestadosFiltrados]);

  const exportarCSV = () => {
    const headers = ["ID", "Funcionário", "Empresa", "Setor", "Dias", "Data Início"];
    const rows = atestadosFiltrados.map(a => [
      a.id,
      `"${a.funcionario}"`,
      `"${a.empresa}"`,
      `"${a.setor}"`,
      a.diasAfastamento,
      a.dataInicio
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ranking_atestados_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in pb-16">
      <PageHero
        title="Dashboard de Atestados — Dias de Afastamento por Setor"
        subtitle="Identificação rápida dos colaboradores com maior número de dias de afastamento em cada setor."
        eyebrow="Setor DP & Financeiro · Central Connect"
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        
        {/* Barra Principal de Upload & Persistência */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                Planilha de Atestados DP
                {rawCSVRows.length > 0 && (
                  <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    Dados Salvos
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {rawCSVRows.length > 0 ? `${rawCSVRows.length} linhas persistidas` : "Dados demonstrativos"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 rounded-lg bg-muted border border-border/60">
              <Button
                variant={visualizacao === "lista" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVisualizacao("lista")}
                className="h-7 text-xs gap-1.5 px-3"
              >
                <LayoutList className="h-3.5 w-3.5" />
                Visão em Lista
              </Button>
              <Button
                variant={visualizacao === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVisualizacao("cards")}
                className="h-7 text-xs gap-1.5 px-3"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Visão em Cards
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={sincronizarGoogleSheets}
              disabled={carregandoSync}
              className="gap-2 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${carregandoSync ? "animate-spin text-primary" : ""}`} />
              {carregandoSync ? "Sincronizando..." : "Sincronizar Sheets"}
            </Button>

            <label htmlFor="csv-upload" className="cursor-pointer">
              <Button variant="default" size="sm" asChild className="gap-2 text-xs font-semibold">
                <span>
                  <Upload className="h-4 w-4" />
                  Importar CSV da Planilha
                </span>
              </Button>
              <input id="csv-upload" type="file" accept=".csv, .txt, .xlsx" className="hidden" onChange={handleFileUpload} />
            </label>

            {rawCSVHeaders.length > 0 && (
              <>
                <Button
                  variant={mostrarConfigurador ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setMostrarConfigurador(!mostrarConfigurador)}
                  className="gap-1.5 text-xs"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Ajustar Colunas
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparDadosSalvos}
                  className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-500/10"
                  title="Limpar dados salvos e restaurar padrão"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar Salvos
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Notificação */}
        {menssagemSync && (
          <Alert className={menssagemSync.tipo === "sucesso" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300" : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300"}>
            <Info className="h-4 w-4" />
            <AlertTitle>{menssagemSync.tipo === "sucesso" ? "Sucesso" : "Aviso"}</AlertTitle>
            <AlertDescription className="text-sm">{menssagemSync.texto}</AlertDescription>
          </Alert>
        )}

        {/* Ajustador de Colunas */}
        {mostrarConfigurador && rawCSVHeaders.length > 0 && (
          <Card className="border-primary/40 bg-primary/5 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                <SlidersHorizontal className="h-4 w-4" />
                Mapeamento das Colunas da Planilha
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione qual coluna do seu arquivo corresponde a cada campo:
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">👤 Nome do Funcionário</label>
                <Select value={mapping.colNome.toString()} onValueChange={(val) => handleMappingChange("colNome", val)}>
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawCSVHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Coluna {i + 1}: {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">🏢 Empresa / Terceiro</label>
                <Select value={mapping.colEmpresa.toString()} onValueChange={(val) => handleMappingChange("colEmpresa", val)}>
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawCSVHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Coluna {i + 1}: {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">📁 Setor / Departamento</label>
                <Select value={mapping.colSetor.toString()} onValueChange={(val) => handleMappingChange("colSetor", val)}>
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawCSVHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Coluna {i + 1}: {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">⏱️ Dias de Afastamento</label>
                <Select value={mapping.colDias.toString()} onValueChange={(val) => handleMappingChange("colDias", val)}>
                  <SelectTrigger className="text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawCSVHeaders.map((h, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        Coluna {i + 1}: {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por Nome do Funcionário ou Setor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 text-sm bg-background"
            />
          </div>

          <div className="w-full sm:w-64">
            <Select value={filtroSetor} onValueChange={setFiltroSetor}>
              <SelectTrigger className="text-sm bg-background">
                <SelectValue placeholder="Filtrar por Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Setores ({setoresUnicos.length})</SelectItem>
                {setoresUnicos.map((setor) => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="sm" onClick={exportarCSV} className="gap-2 text-xs w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Resumo Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Total de Registros</span>
              <span className="text-xl font-bold text-foreground">{metricas.total} atestados</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Total de Dias</span>
              <span className="text-xl font-bold text-amber-600">{metricas.totalDias} dias acum.</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-card border border-border/60 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block font-medium">Setores no Ranking</span>
              <span className="text-xl font-bold text-foreground">{rankingTop3PorSetor.length} setores</span>
            </div>
          </div>
        </div>

        {/* 🏆 SEÇÃO PRINCIPAL: TOP 3 PESSOAS POR SETOR */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 text-amber-500" />
              As 3 Pessoas com Mais Dias de Afastamento por Setor
            </h2>
            <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
              {visualizacao === "lista" ? "Visão em Lista (Recomendada)" : "Visão em Cards"}
            </Badge>
          </div>

          {/* VISÃO EM LISTA */}
          {visualizacao === "lista" ? (
            <div className="space-y-4">
              {rankingTop3PorSetor.length > 0 ? (
                rankingTop3PorSetor.map((grupo) => (
                  <Card key={grupo.setor} className="border-border/70 shadow-xs overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b border-border/50 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-base font-bold text-foreground">
                            {grupo.setor}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="text-xs bg-background font-semibold">
                          Total no Setor: {grupo.totalDiasSetor} dias acum.
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">
                      <Table>
                        <TableBody>
                          {grupo.ranking.map((pessoa, idx) => {
                            const medalhaBg =
                              idx === 0
                                ? "bg-amber-500 text-white font-bold"
                                : idx === 1
                                ? "bg-slate-400 text-white font-bold"
                                : "bg-amber-700 text-white font-bold";

                            const medalhaLabel = idx === 0 ? "1º Lugar" : idx === 1 ? "2º Lugar" : "3º Lugar";

                            return (
                              <TableRow key={pessoa.funcionario + idx} className="hover:bg-muted/20">
                                <TableCell className="w-28 py-3.5 pl-5">
                                  <Badge className={`${medalhaBg} text-xs px-2.5 py-1 justify-center w-full`}>
                                    {medalhaLabel}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-3.5">
                                  <div className="text-base font-bold text-foreground">
                                    {pessoa.funcionario}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3.5 text-xs text-muted-foreground">
                                  {pessoa.empresa ? (
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      {pessoa.empresa}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell className="py-3.5 text-right pr-5">
                                  <span className="text-lg font-extrabold text-primary block">
                                    {pessoa.totalDias} {pessoa.totalDias === 1 ? "dia" : "dias"}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-12 text-center text-muted-foreground bg-card border border-border/60 rounded-xl">
                  Nenhum setor encontrado para a busca realizada.
                </div>
              )}
            </div>
          ) : (
            /* VISÃO EM CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rankingTop3PorSetor.map((grupo) => (
                <Card key={grupo.setor} className="border-border/70 shadow-xs hover:border-primary/40 transition-all overflow-hidden">
                  <CardHeader className="pb-3 pt-4 px-5 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base font-bold text-foreground flex items-center gap-2 leading-tight">
                        <Building2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{grupo.setor}</span>
                      </CardTitle>
                      <Badge variant="outline" className="text-xs font-semibold bg-background shrink-0">
                        {grupo.totalDiasSetor} dias acum.
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {grupo.ranking.map((pessoa, idx) => {
                      const medalhaBg =
                        idx === 0
                          ? "bg-amber-500 text-white font-bold"
                          : idx === 1
                          ? "bg-slate-400 text-white font-bold"
                          : "bg-amber-700 text-white font-bold";

                      const medalhaTexto = idx === 0 ? "1º" : idx === 1 ? "2º" : "3º";

                      return (
                        <div
                          key={pessoa.funcionario + idx}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border/60 hover:border-primary/30 transition-all shadow-2xs gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-8 h-8 flex items-center justify-center text-xs rounded-full shrink-0 shadow-2xs ${medalhaBg}`}>
                              {medalhaTexto}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-base font-bold text-foreground leading-snug break-words">
                                {pessoa.funcionario}
                              </h4>
                              {pessoa.empresa && (
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Briefcase className="h-3 w-3 shrink-0" />
                                  <span>{pessoa.empresa}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-extrabold text-primary block">
                              {pessoa.totalDias} {pessoa.totalDias === 1 ? "dia" : "dias"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Tabela Completa de Registros */}
        <Card className="border-border/60 shadow-xs mt-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Tabela Completa de Registros Importados ({atestadosFiltrados.length})</CardTitle>
            <CardDescription>Conferência individual das linhas carregadas</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold text-foreground text-sm">Funcionário (Nome Completo)</TableHead>
                    <TableHead className="font-bold text-foreground text-sm">Empresa / Terceiro</TableHead>
                    <TableHead className="font-bold text-foreground text-sm">Setor / Departamento</TableHead>
                    <TableHead className="font-bold text-foreground text-sm text-right">Dias Afastado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atestadosFiltrados.map((item, i) => (
                    <TableRow key={item.id + i} className="hover:bg-muted/30">
                      <TableCell className="font-bold text-foreground text-sm py-3">
                        {item.funcionario}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.empresa || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{item.setor}</TableCell>
                      <TableCell className="text-sm font-bold text-primary text-right">{item.diasAfastamento} dia(s)</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
