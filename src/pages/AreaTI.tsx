import { useState } from "react";
import { ShieldCheck, BookOpen, Key, Eye, EyeOff, Copy, Search, Plus, Lock } from "lucide-react";

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
  const [tab, setTab] = useState<"tutoriais" | "senhas">("tutoriais");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedTutorial, setSelectedTutorial] = useState<number | null>(null);

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
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <ShieldCheck className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-primary-foreground">Área Interna TI</h1>
              <p className="text-primary-foreground/70">Acesso restrito à equipe de Tecnologia</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
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
            onClick={() => setTab("senhas")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all ${
              tab === "senhas" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Key className="h-4 w-4" />
            Senhas Compartilhadas
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
      </div>
    </div>
  );
}
