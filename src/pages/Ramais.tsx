import { useState } from "react";
import { Search, Phone as PhoneIcon, User } from "lucide-react";

const ramaisData = [
  { nome: "Diretoria", ramal: "1001", setor: "Diretoria", responsavel: "Carlos Silva" },
  { nome: "Financeiro", ramal: "1010", setor: "Financeiro", responsavel: "Ana Costa" },
  { nome: "Recursos Humanos", ramal: "1020", setor: "RH", responsavel: "Maria Souza" },
  { nome: "Tecnologia da Informação", ramal: "1030", setor: "TI", responsavel: "João Santos" },
  { nome: "Compras", ramal: "1040", setor: "Compras", responsavel: "Pedro Lima" },
  { nome: "Jurídico", ramal: "1050", setor: "Jurídico", responsavel: "Fernanda Oliveira" },
  { nome: "Marketing", ramal: "1060", setor: "Marketing", responsavel: "Lucas Mendes" },
  { nome: "Comercial", ramal: "1070", setor: "Comercial", responsavel: "Bruna Alves" },
  { nome: "Operações", ramal: "1080", setor: "Operações", responsavel: "Rafael Nunes" },
  { nome: "Recepção", ramal: "1000", setor: "Administrativo", responsavel: "Juliana Rocha" },
  { nome: "Almoxarifado", ramal: "1090", setor: "Logística", responsavel: "Marcos Pereira" },
  { nome: "Contabilidade", ramal: "1011", setor: "Financeiro", responsavel: "Patricia Dias" },
];

export default function Ramais() {
  const [search, setSearch] = useState("");

  const filtered = ramaisData.filter(
    (r) =>
      r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.setor.toLowerCase().includes(search.toLowerCase()) ||
      r.ramal.includes(search) ||
      r.responsavel.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-primary-foreground">Ramais</h1>
          <p className="mt-2 text-primary-foreground/70">Lista de ramais da organização</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, setor, ramal ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ramal</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.ramal} className={`transition-colors hover:bg-muted/30 ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        <PhoneIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{r.nome}</p>
                        <p className="text-xs text-muted-foreground">{r.setor}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{r.ramal}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-card-foreground">{r.responsavel}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum ramal encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}
