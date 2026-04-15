import { useState } from "react";
import { FileText, Download, Search, Folder, File, Calendar } from "lucide-react";
import { PageHero } from "@/components/PageHero";

const documentos = [
  { id: 1, nome: "Regimento Interno", categoria: "Institucional", tamanho: "2.4 MB", data: "15/01/2026", tipo: "PDF" },
  { id: 2, nome: "Política de Segurança da Informação", categoria: "TI", tamanho: "1.8 MB", data: "10/01/2026", tipo: "PDF" },
  { id: 3, nome: "Manual do Colaborador", categoria: "RH", tamanho: "5.1 MB", data: "05/01/2026", tipo: "PDF" },
  { id: 4, nome: "Organograma Institucional", categoria: "Institucional", tamanho: "890 KB", data: "20/12/2025", tipo: "PDF" },
  { id: 5, nome: "Plano de Cargos e Salários", categoria: "RH", tamanho: "3.2 MB", data: "01/12/2025", tipo: "PDF" },
  { id: 6, nome: "Política de Uso de Recursos de TI", categoria: "TI", tamanho: "1.1 MB", data: "15/11/2025", tipo: "PDF" },
  { id: 7, nome: "Código de Ética", categoria: "Institucional", tamanho: "1.5 MB", data: "01/11/2025", tipo: "PDF" },
  { id: 8, nome: "Plano de Contingência", categoria: "TI", tamanho: "4.0 MB", data: "10/10/2025", tipo: "PDF" },
];

const categorias = [...new Set(documentos.map((d) => d.categoria))];

export default function Documentos() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const filtered = documentos.filter((d) => {
    const matchSearch = d.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || d.categoria === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Documentos Institucionais"
        subtitle="Documentos oficiais e políticas da organização"
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCatFilter("")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                !catFilter ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
              }`}
            >
              Todos
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  catFilter === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Documents grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-elevated"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <FileText className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-card-foreground">{doc.nome}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Folder className="h-3 w-3" />{doc.categoria}</span>
                  <span>{doc.tamanho}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{doc.data}</span>
                </div>
              </div>
              <button className="shrink-0 rounded-lg border border-border p-2.5 text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">Nenhum documento encontrado.</div>
        )}
      </div>
    </div>
  );
}
