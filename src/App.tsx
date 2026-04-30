import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { RequireRouteAccess } from "@/auth/RequireRouteAccess";
import { RouteGuard } from "@/auth/RouteGuard";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Ramais from "./pages/Ramais";
import AbrirChamado from "./pages/AbrirChamado";
import GestaoChamados from "./pages/GestaoChamados";
import BaseConhecimento from "./pages/BaseConhecimento";
import AreaTI from "./pages/AreaTI";
import Documentos from "./pages/Documentos";
import AgendaCCI from "./pages/AgendaCCI";
import AgendaCCIAdmin from "./pages/AgendaCCIAdmin";
import ReservaEspacosEquipamentos from "./pages/ReservaEspacosEquipamentos";
import MinhasReservas from "./pages/MinhasReservas";
import ControleMateriaisTI from "./pages/ControleMateriaisTI";
import ControleMateriaisAlmoxarifado from "./pages/ControleMateriaisAlmoxarifado";
import ValeAdiantamento from "./pages/ValeAdiantamento";
import FinanceiroValesAdiantamento from "./pages/FinanceiroValesAdiantamento";
import AdminPapeisManuais from "./pages/AdminPapeisManuais";
import NotFound from "./pages/NotFound";
import PainelSenhasLayout from "./pages/senhas/PainelSenhasLayout";
import SenhasHub from "./pages/senhas/SenhasHub";
import SenhasTotemPage from "./pages/senhas/SenhasTotemPage";
import SenhasPainelPage from "./pages/senhas/SenhasPainelPage";
import SenhasAtendentePage from "./pages/senhas/SenhasAtendentePage";
import SenhasAdminShell from "./pages/senhas/SenhasAdminShell";
import SenhasAdminDashboard from "./pages/senhas/SenhasAdminDashboard";
import SenhasAdminFilas from "./pages/senhas/SenhasAdminFilas";
import SenhasAdminGuiches from "./pages/senhas/SenhasAdminGuiches";
import SenhasAdminAtendentes from "./pages/senhas/SenhasAdminAtendentes";
import SenhasAdminRelatorios from "./pages/senhas/SenhasAdminRelatorios";
import SenhasAdminConfiguracoes from "./pages/senhas/SenhasAdminConfiguracoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RequireAuth>
              <AppLayout>
                <RouteGuard>
                  <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Index />} />
              <Route
                path="/admin/papeis-manuais"
                element={
                  <RequireRouteAccess>
                    <AdminPapeisManuais />
                  </RequireRouteAccess>
                }
              />
              <Route path="/ramais" element={<Ramais />} />
              <Route path="/chamados/novo" element={<AbrirChamado />} />
              <Route path="/chamados/gestao" element={<GestaoChamados />} />
              <Route path="/base-conhecimento" element={<BaseConhecimento />} />
              <Route
                path="/ti-interno"
                element={
                  <RequireRouteAccess>
                    <AreaTI />
                  </RequireRouteAccess>
                }
              />
              <Route path="/documentos" element={<Documentos />} />
              <Route path="/agenda-cci" element={<AgendaCCI />} />
              <Route path="/reserva-espacos-equipamentos" element={<ReservaEspacosEquipamentos />} />
              <Route path="/minhas-reservas" element={<MinhasReservas />} />
              <Route
                path="/agenda-cci/admin"
                element={
                  <RequireRouteAccess>
                    <AgendaCCIAdmin />
                  </RequireRouteAccess>
                }
              />
              <Route
                path="/controle-materiais-ti"
                element={
                  <RequireRouteAccess>
                    <ControleMateriaisTI />
                  </RequireRouteAccess>
                }
              />
              <Route
                path="/controle-materiais-almoxarifado"
                element={
                  <RequireRouteAccess>
                    <ControleMateriaisAlmoxarifado />
                  </RequireRouteAccess>
                }
              />
              <Route path="/vale-adiantamento" element={<ValeAdiantamento />} />
              <Route
                path="/financeiro/vales-adiantamento"
                element={
                  <RequireRouteAccess>
                    <FinanceiroValesAdiantamento />
                  </RequireRouteAccess>
                }
              />
              <Route path="/senhas" element={<PainelSenhasLayout />}>
                <Route index element={<SenhasHub />} />
                <Route path="totem" element={<SenhasTotemPage />} />
                <Route path="painel" element={<SenhasPainelPage />} />
                <Route path="atendente" element={<SenhasAtendentePage />} />
                <Route path="admin" element={<SenhasAdminShell />}>
                  <Route index element={<SenhasAdminDashboard />} />
                  <Route path="filas" element={<SenhasAdminFilas />} />
                  <Route path="guiches" element={<SenhasAdminGuiches />} />
                  <Route path="atendentes" element={<SenhasAdminAtendentes />} />
                  <Route path="relatorios" element={<SenhasAdminRelatorios />} />
                  <Route path="configuracoes" element={<SenhasAdminConfiguracoes />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
                  </Routes>
                </RouteGuard>
              </AppLayout>
            </RequireAuth>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
