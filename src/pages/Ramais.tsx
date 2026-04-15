import { useState } from "react";
import { Search, Phone as PhoneIcon, User, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ramaisData = [
  // Direção
  { nome: "Clayton", ramal: "213", setor: "Direção" },
  { nome: "Ademilton", ramal: "212", setor: "Direção" },
  { nome: "Valquíria/Renata", ramal: "211", setor: "Direção" },
  { nome: "Valquíria", ramal: "210", setor: "Direção" },
  // Secretaria de atendimento
  { nome: "Atendente 1", ramal: "203", setor: "Secretaria de atendimento" },
  { nome: "Atendente 2", ramal: "204", setor: "Secretaria de atendimento" },
  { nome: "Atendente 3", ramal: "205", setor: "Secretaria de atendimento" },
  { nome: "Atendente 4", ramal: "209", setor: "Secretaria de atendimento" },
  { nome: "Atendente 5", ramal: "208", setor: "Secretaria de atendimento" },
  { nome: "Katrleen", ramal: "207", setor: "Secretaria de atendimento" },
  { nome: "Vanessa", ramal: "206", setor: "Secretaria de atendimento" },
  // Faculdade CCI
  { nome: "Atendente 1", ramal: "240", setor: "Faculdade CCI" },
  { nome: "Atendente 2", ramal: "241", setor: "Faculdade CCI" },
  { nome: "Valéria/Jesiel", ramal: "244", setor: "Faculdade CCI" },
  // NegoCCIe
  { nome: "Giovanna/Renato/Rodrigo", ramal: "250", setor: "NegoCCIe" },
  { nome: "Déborah/Danielly", ramal: "251", setor: "NegoCCIe" },
  // Coordenação
  { nome: "Michel", ramal: "215", setor: "Coordenação" },
  { nome: "Stephanie", ramal: "216", setor: "Coordenação" },
  { nome: "Luzimar", ramal: "218", setor: "Coordenação" },
  { nome: "Aldeni", ramal: "219", setor: "Coordenação" },
  { nome: "Andresa", ramal: "220", setor: "Coordenação" },
  { nome: "Thaisa", ramal: "221", setor: "Coordenação" },
  { nome: "Mábia", ramal: "222", setor: "Coordenação" },
  { nome: "Flávia", ramal: "223", setor: "Coordenação" },
  { nome: "Kátia", ramal: "224", setor: "Coordenação" },
  { nome: "Isabel", ramal: "225", setor: "Coordenação" },
  { nome: "Rafael", ramal: "226", setor: "Coordenação" },
  { nome: "Félix", ramal: "227", setor: "Coordenação" },
  { nome: "Francianne", ramal: "239", setor: "Coordenação" },
  // Departamento pessoal e financeiro
  { nome: "Francisco", ramal: "237", setor: "Departamento pessoal e financeiro" },
  { nome: "Mirla", ramal: "238", setor: "Departamento pessoal e financeiro" },
  { nome: "Michelle", ramal: "263", setor: "Departamento pessoal e financeiro" },
  { nome: "Leane/Nathalia", ramal: "264", setor: "Departamento pessoal e financeiro" },
  // Setape
  { nome: "Jediael/Thiago", ramal: "232", setor: "Setape" },
  { nome: "Hugo/Pedro/Yuri", ramal: "235", setor: "Setape" },
  // Coordenação infantil ao 1º EF
  { nome: "Ângela", ramal: "228", setor: "Coordenação infantil ao 1º EF" },
  { nome: "Regina", ramal: "229", setor: "Coordenação infantil ao 1º EF" },
  { nome: "Ivete", ramal: "230", setor: "Coordenação infantil ao 1º EF" },
  // Enfermaria
  { nome: "Joyce", ramal: "231", setor: "Enfermaria" },
  // Publicidade
  { nome: "Bárbara", ramal: "253", setor: "Publicidade" },
  // Biblioteca
  { nome: "Sirlene/Edivanete", ramal: "233", setor: "Biblioteca" },
  // Xerox
  { nome: "Fabrício", ramal: "246", setor: "Xerox" },
  // Clat
  { nome: "Alessandra", ramal: "260", setor: "Clat" },
  // Lanchonetes
  { nome: "Geração saúde", ramal: "214", setor: "Lanchonetes" },
  { nome: "Delícia de sabor", ramal: "248", setor: "Lanchonetes" },
];

const SETORES = [
  "Todos os setores",
  "Direção",
  "Secretaria de atendimento",
  "Faculdade CCI",
  "NegoCCIe",
  "Coordenação",
  "Departamento pessoal e financeiro",
  "Setape",
  "Coordenação infantil ao 1º EF",
  "Enfermaria",
  "Publicidade",
  "Biblioteca",
  "Xerox",
  "Clat",
  "Lanchonetes",
];

export default function Ramais() {
  const [search, setSearch] = useState("");
  const [setorFilter, setSetorFilter] = useState<string>("Todos os setores");

  const filtered = ramaisData.filter((r) => {
    const matchSetor =
      setorFilter === "Todos os setores" || r.setor === setorFilter;
    const matchSearch =
      !search ||
      r.nome.toLowerCase().includes(search.toLowerCase()) ||
      r.setor.toLowerCase().includes(search.toLowerCase()) ||
      r.ramal.includes(search);
    return matchSetor && matchSearch;
  });

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-primary-foreground">Ramais</h1>
          <p className="mt-2 text-primary-foreground/70">
            Lista de ramais da organização
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Filtros */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Select
              value={setorFilter}
              onValueChange={setSetorFilter}
            >
              <SelectTrigger className="w-full sm:w-[280px] rounded-xl border border-input bg-card">
                <SelectValue placeholder="Filtrar por setor" />
              </SelectTrigger>
              <SelectContent>
                {SETORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, setor ou ramal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Setor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ramal
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Responsável
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr
                  key={`${r.setor}-${r.ramal}-${r.nome}`}
                  className={`transition-colors hover:bg-muted/30 ${i !== filtered.length - 1 ? "border-b border-border" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                        <PhoneIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {r.setor}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                      {r.ramal}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-card-foreground">
                        {r.nome}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum ramal encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
