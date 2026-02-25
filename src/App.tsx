import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Ramais from "./pages/Ramais";
import AbrirChamado from "./pages/AbrirChamado";
import GestaoChamados from "./pages/GestaoChamados";
import BaseConhecimento from "./pages/BaseConhecimento";
import AreaTI from "./pages/AreaTI";
import Documentos from "./pages/Documentos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/ramais" element={<Ramais />} />
            <Route path="/chamados/novo" element={<AbrirChamado />} />
            <Route path="/chamados/gestao" element={<GestaoChamados />} />
            <Route path="/base-conhecimento" element={<BaseConhecimento />} />
            <Route path="/ti-interno" element={<AreaTI />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
