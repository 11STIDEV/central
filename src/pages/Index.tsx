import {
  Ticket,
  BookOpen,
  Phone,
  FileText,
  CalendarDays,
  MapPin,
  Boxes,
  ClipboardList,
  CircleDollarSign,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { canAccessRoute } from "@/auth/routeAccess";

const quickActions = [
  { name: "Abrir Chamado", url: "/chamados/novo", icon: Ticket, description: "Solicitar suporte de TI" },
  { name: "Base de Conhecimento", url: "/base-conhecimento", icon: BookOpen, description: "Tutoriais e guias" },
  { name: "Ramais", url: "/ramais", icon: Phone, description: "Lista de ramais" },
  { name: "Documentos", url: "/documentos", icon: FileText, description: "Documentos institucionais" },
  {
    name: "Agenda CCI",
    url: "/agenda-cci",
    icon: CalendarDays,
    description: "Calendário semanal de reservas",
  },
  {
    name: "Reserva de Equipamentos e Espaços",
    url: "/reserva-espacos-equipamentos",
    icon: MapPin,
    description: "Chromebooks, equipamentos e espaços",
  },
  { name: "Controle Materiais (TI)", url: "/controle-materiais-ti", icon: Boxes, description: "Controle interno de materiais da TI" },
  { name: "Entrada/Saída Almoxarifado", url: "/controle-materiais-almoxarifado", icon: ClipboardList, description: "Movimentação de materiais pelo almoxarifado" },
  { name: "Solicitar Vale-Adiantamento", url: "/vale-adiantamento", icon: CircleDollarSign, description: "Envio de pedido de vale para o financeiro" },
];

const recentNews = [
  { title: "Manutenção programada do servidor", date: "25/02/2026", type: "Aviso" },
  { title: "Novo tutorial: Como usar o VPN", date: "24/02/2026", type: "Tutorial" },
  { title: "Atualização do sistema de e-mail", date: "23/02/2026", type: "Atualização" },
];

export default function Index() {
  const { usuario } = useAuth();
  const papeis = usuario?.papeis ?? [];
  const visiveis = quickActions
    .filter((a) => canAccessRoute(papeis, a.url))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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
            {visiveis.map((action) => (
              <Link
                key={action.name}
                to={action.url}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-elevated hover:-translate-y-0.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg gradient-primary">
                  <action.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{action.name}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </Link>
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
