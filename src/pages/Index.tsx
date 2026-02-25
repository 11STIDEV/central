import {
  ExternalLink,
  Monitor,
  Mail,
  FileSpreadsheet,
  Cloud,
  Shield,
  Database,
  Printer,
  Globe,
  MessageSquare,
  Ticket,
  BookOpen,
  Phone,
  FileText,
  Clock,
} from "lucide-react";

const systemLinks = [
  { name: "E-mail Corporativo", url: "#", icon: Mail, description: "Acesse seu e-mail institucional", color: "bg-primary" },
  { name: "ERP / Gestão", url: "#", icon: FileSpreadsheet, description: "Sistema integrado de gestão", color: "bg-primary" },
  { name: "Cloud Storage", url: "#", icon: Cloud, description: "Armazenamento em nuvem", color: "gradient-primary" },
  { name: "VPN / Acesso Remoto", url: "#", icon: Shield, description: "Conexão segura remota", color: "gradient-primary" },
  { name: "BI / Relatórios", url: "#", icon: Database, description: "Dashboards e relatórios", color: "bg-primary" },
  { name: "Impressoras", url: "#", icon: Printer, description: "Gerenciar impressões", color: "bg-primary" },
  { name: "Intranet", url: "#", icon: Globe, description: "Portal interno", color: "gradient-primary" },
  { name: "Chat Corporativo", url: "#", icon: MessageSquare, description: "Comunicação interna", color: "gradient-primary" },
];

const quickActions = [
  { name: "Abrir Chamado", url: "/chamados/novo", icon: Ticket, description: "Solicitar suporte de TI" },
  { name: "Base de Conhecimento", url: "/base-conhecimento", icon: BookOpen, description: "Tutoriais e guias" },
  { name: "Ramais", url: "/ramais", icon: Phone, description: "Lista de ramais" },
  { name: "Documentos", url: "/documentos", icon: FileText, description: "Documentos institucionais" },
];

const recentNews = [
  { title: "Manutenção programada do servidor", date: "25/02/2026", type: "Aviso" },
  { title: "Novo tutorial: Como usar o VPN", date: "24/02/2026", type: "Tutorial" },
  { title: "Atualização do sistema de e-mail", date: "23/02/2026", type: "Atualização" },
];

export default function Index() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="gradient-hero px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-primary-foreground">
            Central de Sistemas
          </h1>
          <p className="mt-2 text-primary-foreground/70">
            Acesse rapidamente todos os sistemas e recursos da organização
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Quick Actions */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Acesso Rápido</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <a
                key={action.name}
                href={action.url}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg gradient-primary">
                  <action.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{action.name}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Systems Grid */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Sistemas</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {systemLinks.map((system) => (
              <a
                key={system.name}
                href={system.url}
                className="group relative flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${system.color}`}>
                  <system.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-card-foreground">{system.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{system.description}</p>
                </div>
                <ExternalLink className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </section>

        {/* Recent News */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Avisos Recentes</h2>
          <div className="rounded-xl border border-border bg-card shadow-card">
            {recentNews.map((news, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-6 py-4 ${i !== recentNews.length - 1 ? "border-b border-border" : ""}`}
              >
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">{news.title}</p>
                  <p className="text-xs text-muted-foreground">{news.date}</p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {news.type}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
