import { useMemo, useState } from "react";
import { PageHero } from "@/components/PageHero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
type EntradaMaterial = {
  id: number;
  descricao: string;
  quantidade: number;
  data: string;
  observacoes?: string;
};

type SaidaMaterial = {
  id: number;
  descricao: string;
  quantidade: number;
  data: string;
};

export default function ControleMateriaisAlmoxarifado() {
  const [entradas, setEntradas] = useState<EntradaMaterial[]>([]);
  const [saidas, setSaidas] = useState<SaidaMaterial[]>([]);

  const [entradaForm, setEntradaForm] = useState({
    descricao: "",
    quantidade: "",
    data: "",
    observacoes: "",
  });

  const [saidaForm, setSaidaForm] = useState({
    material: "",
    quantidade: "",
    data: "",
  });

  const estoque = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const e of entradas) {
      mapa.set(e.descricao, (mapa.get(e.descricao) ?? 0) + e.quantidade);
    }

    for (const s of saidas) {
      mapa.set(s.descricao, (mapa.get(s.descricao) ?? 0) - s.quantidade);
    }

    return Array.from(mapa.entries())
      .map(([descricao, quantidade]) => ({ descricao, quantidade }))
      .filter((item) => item.quantidade > 0)
      .sort((a, b) => a.descricao.localeCompare(b.descricao));
  }, [entradas, saidas]);

  const materiaisDisponiveis = estoque.map((e) => e.descricao);

  const handleRegistrarEntrada = (e: React.FormEvent) => {
    e.preventDefault();

    if (!entradaForm.descricao.trim() || !entradaForm.quantidade || !entradaForm.data) {
      return;
    }

    const quantidade = Number(entradaForm.quantidade);
    if (Number.isNaN(quantidade) || quantidade <= 0) {
      return;
    }

    setEntradas((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        descricao: entradaForm.descricao.trim(),
        quantidade,
        data: entradaForm.data,
        observacoes: entradaForm.observacoes.trim() || undefined,
      },
    ]);

    setEntradaForm({
      descricao: "",
      quantidade: "",
      data: "",
      observacoes: "",
    });
  };

  const handleRegistrarSaida = (e: React.FormEvent) => {
    e.preventDefault();

    if (!saidaForm.material || !saidaForm.quantidade || !saidaForm.data) {
      return;
    }

    const quantidade = Number(saidaForm.quantidade);
    if (Number.isNaN(quantidade) || quantidade <= 0) {
      return;
    }

    const estoqueMaterial = estoque.find((m) => m.descricao === saidaForm.material);
    if (!estoqueMaterial || quantidade > estoqueMaterial.quantidade) {
      return;
    }

    setSaidas((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        descricao: saidaForm.material,
        quantidade,
        data: saidaForm.data,
      },
    ]);

    setSaidaForm({
      material: "",
      quantidade: "",
      data: "",
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Controle de Materiais — Almoxarifado"
        subtitle="Registro de entrada, saída e visão de estoque dos materiais."
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Tabs defaultValue="entrada">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList>
              <TabsTrigger value="entrada">
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                Entrada de materiais
              </TabsTrigger>
              <TabsTrigger value="estoque">
                Estoque
              </TabsTrigger>
              <TabsTrigger value="saida">
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                Saída de materiais
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="entrada" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)]">
              <form
                onSubmit={handleRegistrarEntrada}
                className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-primary" />
                  Registrar entrada
                </h2>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Material
                  </label>
                  <Input
                    placeholder="Ex: Cabo de rede, Toner, Mouse USB..."
                    value={entradaForm.descricao}
                    onChange={(e) =>
                      setEntradaForm((f) => ({ ...f, descricao: e.target.value }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Quantidade
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={entradaForm.quantidade}
                      onChange={(e) =>
                        setEntradaForm((f) => ({ ...f, quantidade: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de recebimento
                    </label>
                    <Input
                      type="date"
                      value={entradaForm.data}
                      onChange={(e) =>
                        setEntradaForm((f) => ({ ...f, data: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Observações
                  </label>
                  <Textarea
                    placeholder="Número da nota fiscal, fornecedor, local de armazenamento, etc."
                    value={entradaForm.observacoes}
                    onChange={(e) =>
                      setEntradaForm((f) => ({ ...f, observacoes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit">
                    Registrar entrada
                  </Button>
                </div>
              </form>

              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-3 text-base font-semibold text-card-foreground">
                  Entradas registradas
                </h2>
                {entradas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma entrada registrada ainda.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="w-24 text-right">Qtd.</TableHead>
                        <TableHead className="w-32">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entradas.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {e.descricao}
                              </span>
                              {e.observacoes && (
                                <span className="text-[11px] text-muted-foreground">
                                  {e.observacoes}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {e.quantidade}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {e.data}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>
                      Total de registros: {entradas.length}
                    </TableCaption>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque" className="mt-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="mb-3 text-base font-semibold text-card-foreground">
                Estoque atual
              </h2>
              {estoque.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum material em estoque no momento.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="w-32 text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estoque.map((item) => (
                      <TableRow key={item.descricao}>
                        <TableCell className="text-sm font-medium">
                          {item.descricao}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantidade}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saida" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)]">
              <form
                onSubmit={handleRegistrarSaida}
                className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card"
              >
                <h2 className="text-base font-semibold text-card-foreground flex items-center gap-2">
                  <ArrowUpCircle className="h-4 w-4 text-primary" />
                  Registrar saída
                </h2>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Material
                  </label>
                  <Select
                    value={saidaForm.material}
                    onValueChange={(value) =>
                      setSaidaForm((f) => ({ ...f, material: value }))
                    }
                    disabled={materiaisDisponiveis.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          materiaisDisponiveis.length === 0
                            ? "Nenhum material em estoque"
                            : "Selecione um material"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {materiaisDisponiveis.map((descricao) => {
                        const itemEstoque = estoque.find(
                          (m) => m.descricao === descricao,
                        );
                        return (
                          <SelectItem key={descricao} value={descricao}>
                            {descricao}{" "}
                            {itemEstoque && `(${itemEstoque.quantidade} em estoque)`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Quantidade
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={saidaForm.quantidade}
                      onChange={(e) =>
                        setSaidaForm((f) => ({ ...f, quantidade: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de saída
                    </label>
                    <Input
                      type="date"
                      value={saidaForm.data}
                      onChange={(e) =>
                        setSaidaForm((f) => ({ ...f, data: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={materiaisDisponiveis.length === 0}>
                    Registrar saída
                  </Button>
                </div>
              </form>

              <div className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="mb-3 text-base font-semibold text-card-foreground">
                  Saídas registradas
                </h2>
                {saidas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma saída registrada ainda.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="w-24 text-right">Qtd.</TableHead>
                        <TableHead className="w-32">Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {saidas.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-sm font-medium">
                            {s.descricao}
                          </TableCell>
                          <TableCell className="text-right">
                            {s.quantidade}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {s.data}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption>
                      Total de registros: {saidas.length}
                    </TableCaption>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

