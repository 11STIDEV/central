import { useState } from "react";
import { Search, BookOpen, Clock, User, Tag, ChevronRight } from "lucide-react";
import { PageHero } from "@/components/PageHero";

const tutoriais = [
  {
    id: 1,
    titulo: "Como conectar à VPN",
    resumo: "Passo a passo para configurar e conectar à VPN corporativa em seu computador.",
    categoria: "Rede",
    autor: "João Santos",
    data: "24/02/2026",
    conteudo: "1. Baixe o cliente VPN no portal de downloads\n2. Instale seguindo as instruções\n3. Configure com seu usuário corporativo\n4. Conecte selecionando o servidor 'Corporativo-BR'\n5. Verifique a conexão acessando um recurso interno",
  },
  {
    id: 2,
    titulo: "Configurando e-mail no celular",
    resumo: "Como adicionar sua conta de e-mail corporativo no smartphone Android ou iOS.",
    categoria: "E-mail",
    autor: "Maria Souza",
    data: "22/02/2026",
    conteudo: "1. Abra as configurações de e-mail\n2. Selecione 'Exchange/Office 365'\n3. Insira seu endereço corporativo\n4. Use o servidor: mail.empresa.com.br\n5. Aceite os certificados de segurança",
  },
  {
    id: 3,
    titulo: "Usando o sistema de ponto eletrônico",
    resumo: "Guia completo para registro de ponto, justificativas e consultas.",
    categoria: "RH",
    autor: "Fernanda Oliveira",
    data: "20/02/2026",
    conteudo: "Acesse o sistema pelo link no portal. Registre entrada e saída. Para justificativas, use o menu 'Ocorrências'.",
  },
  {
    id: 4,
    titulo: "Solicitação de acesso a sistemas",
    resumo: "Como solicitar acesso a novos sistemas ou módulos do ERP.",
    categoria: "Acesso",
    autor: "João Santos",
    data: "18/02/2026",
    conteudo: "Abra um chamado na categoria 'Acesso / Permissão' informando o sistema desejado e a justificativa.",
  },
  {
    id: 5,
    titulo: "Boas práticas de segurança digital",
    resumo: "Dicas essenciais para manter seus dados e acessos seguros.",
    categoria: "Segurança",
    autor: "Lucas Mendes",
    data: "15/02/2026",
    conteudo: "Use senhas fortes, não compartilhe credenciais, ative autenticação em duas etapas, cuidado com links suspeitos em e-mails.",
  },
];

const categorias = [...new Set(tutoriais.map((t) => t.categoria))];

export default function BaseConhecimento() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = tutoriais.filter((t) => {
    const matchSearch =
      t.titulo.toLowerCase().includes(search.toLowerCase()) ||
      t.resumo.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || t.categoria === catFilter;
    return matchSearch && matchCat;
  });

  const selectedTutorial = tutoriais.find((t) => t.id === selected);

  return (
    <div className="animate-fade-in">
      <PageHero
        title="Base de Conhecimento"
        subtitle="Tutoriais e guias para todos os funcionários"
      />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        {selected && selectedTutorial ? (
          <div className="animate-fade-in">
            <button
              onClick={() => setSelected(null)}
              className="mb-4 flex items-center gap-1 text-sm text-primary hover:underline"
            >
              ← Voltar para a lista
            </button>
            <div className="rounded-xl border border-border bg-card p-8 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{selectedTutorial.categoria}</span>
              </div>
              <h2 className="text-2xl font-bold text-card-foreground">{selectedTutorial.titulo}</h2>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{selectedTutorial.autor}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{selectedTutorial.data}</span>
              </div>
              <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-card-foreground">
                {selectedTutorial.conteudo}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search and filters */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar tutoriais..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-input bg-card py-3 pl-10 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setCatFilter("")}
                  className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    !catFilter ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                  }`}
                >
                  Todos
                </button>
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCatFilter(c)}
                    className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      catFilter === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className="group flex flex-col rounded-xl border border-border bg-card p-6 text-left shadow-card transition-all hover:shadow-elevated hover:-translate-y-0.5"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">{t.categoria}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-card-foreground">{t.titulo}</h3>
                  <p className="mt-2 flex-1 text-xs text-muted-foreground">{t.resumo}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t.data}</span>
                    <ChevronRight className="h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">Nenhum tutorial encontrado.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
