import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, History, Search } from "lucide-react";
type UsoMaterial = {
  id: number;
  local: string;
  quantidade: number;
};

type RegistroMaterialTI = {
  id: number;
  nomeMaterial: string;
  quantidadeRetirada: number;
  dataRetirada: string;
  usos: UsoMaterial[];
  observacao?: string;
};

export default function ControleMateriaisTI() {
  const [registros, setRegistros] = useState<RegistroMaterialTI[]>([]);

  const [form, setForm] = useState({
    nomeMaterial: "",
    quantidadeRetirada: "",
    dataRetirada: "",
    observacao: "",
  });

  const [usos, setUsos] = useState<UsoMaterial[]>([
    { id: 1, local: "", quantidade: 0 },
  ]);

  const [filtroNome, setFiltroNome] = useState("");
  const [filtroData, setFiltroData] = useState("");

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      const matchNome =
        !filtroNome ||
        r.nomeMaterial.toLowerCase().includes(filtroNome.toLowerCase());
      const matchData = !filtroData || r.dataRetirada === filtroData;
      return matchNome && matchData;
    });
  }, [registros, filtroNome, filtroData]);

  const handleAlterarUso = (
    id: number,
    campo: "local" | "quantidade",
    valor: string,
  ) => {
    setUsos((prev) =>
      prev.map((uso) =>
        uso.id === id
          ? {
              ...uso,
              [campo]:
                campo === "quantidade" ? Number(valor || 0) : valor,
            }
          : uso,
      ),
    );
  };

  const adicionarLinhaUso = () => {
    setUsos((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        local: "",
        quantidade: 0,
      },
    ]);
  };

  const removerLinhaUso = (id: number) => {
    setUsos((prev) => prev.filter((u) => u.id !== id));
  };

  const handleRegistrar = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nomeMaterial.trim() || !form.quantidadeRetirada || !form.dataRetirada) {
      return;
    }

    const quantidadeRetirada = Number(form.quantidadeRetirada);
    if (Number.isNaN(quantidadeRetirada) || quantidadeRetirada <= 0) {
      return;
    }

    const usosValidos = usos
      .filter((u) => u.local.trim() && u.quantidade > 0)
      .map((u) => ({
        ...u,
        local: u.local.trim(),
      }));

    const somaUsos = usosValidos.reduce(
      (acc, uso) => acc + uso.quantidade,
      0,
    );

    if (somaUsos !== quantidadeRetirada) {
      return;
    }

    setRegistros((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        nomeMaterial: form.nomeMaterial.trim(),
        quantidadeRetirada,
        dataRetirada: form.dataRetirada,
        usos: usosValidos,
        observacao: form.observacao.trim() || undefined,
      },
    ]);

    setForm({
      nomeMaterial: "",
      quantidadeRetirada: "",
      dataRetirada: "",
      observacao: "",
    });
    setUsos([{ id: 1, local: "", quantidade: 0 }]);
  };

  return (
    <div className="animate-fade-in">
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-primary-foreground">
            Controle Interno de Materiais (TI)
          </h1>
          <p className="mt-2 text-primary-foreground/70">
            Registro de uso de materiais de TI por ambiente.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <Tabs defaultValue="registro">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="registro">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar uso
              </TabsTrigger>
              <TabsTrigger value="historico">
                <History className="mr-2 h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="registro" className="mt-6">
            <form
              onSubmit={handleRegistrar}
              className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-primary" />
                Registro de retirada e uso
              </h2>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Nome do material
                </label>
                <Input
                  placeholder="Ex: Cabo de rede, Notebook, Switch..."
                  value={form.nomeMaterial}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nomeMaterial: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Quantidade retirada no almoxarifado
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={form.quantidadeRetirada}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quantidadeRetirada: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Data da retirada
                  </label>
                  <Input
                    type="date"
                    value={form.dataRetirada}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dataRetirada: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Onde o material foi utilizado
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Informe os espaços e a quantidade utilizada em cada um. A soma deve bater com a quantidade retirada.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={adicionarLinhaUso}
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar espaço
                  </Button>
                </div>

                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Local / Espaço</TableHead>
                        <TableHead className="w-32 text-right">
                          Quantidade
                        </TableHead>
                        <TableHead className="w-20 text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usos.map((uso) => (
                        <TableRow key={uso.id}>
                          <TableCell>
                            <Input
                              placeholder="Ex: Laboratório 1, Sala 201, Biblioteca..."
                              value={uso.local}
                              onChange={(e) =>
                                handleAlterarUso(uso.id, "local", e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min={0}
                              value={uso.quantidade || ""}
                              onChange={(e) =>
                                handleAlterarUso(
                                  uso.id,
                                  "quantidade",
                                  e.target.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={usos.length === 1}
                              onClick={() => removerLinhaUso(uso.id)}
                            >
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Observações (opcional)
                </label>
                <Textarea
                  rows={3}
                  placeholder="Ex: chamado relacionado, patrimônio, série dos equipamentos, etc."
                  value={form.observacao}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, observacao: e.target.value }))
                  }
                />
              </div>

              <div className="pt-2">
                <Button type="submit">
                  Salvar registro
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="historico" className="mt-6">
            <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Histórico de registros
                </h2>
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
                  <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Filtrar por nome do material..."
                      value={filtroNome}
                      onChange={(e) => setFiltroNome(e.target.value)}
                    />
                  </div>
                  <div className="sm:w-44">
                    <Input
                      type="date"
                      value={filtroData}
                      onChange={(e) => setFiltroData(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {registrosFiltrados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum registro encontrado para os filtros informados.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="w-28 text-right">
                        Qtde retirada
                      </TableHead>
                      <TableHead className="w-28">Data</TableHead>
                      <TableHead>Uso por espaço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosFiltrados.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                              {reg.nomeMaterial}
                            </span>
                            {reg.observacao && (
                              <span className="text-[11px] text-muted-foreground">
                                {reg.observacao}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {reg.quantidadeRetirada}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {reg.dataRetirada}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ul className="space-y-0.5 text-xs text-muted-foreground">
                            {reg.usos.map((uso) => (
                              <li key={uso.id}>
                                <span className="font-medium">
                                  {uso.local}:
                                </span>{" "}
                                {uso.quantidade}
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableCaption>
                    Total de registros: {registrosFiltrados.length}
                  </TableCaption>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

