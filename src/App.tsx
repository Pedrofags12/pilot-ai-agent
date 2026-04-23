import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SeoLanding from "./pages/SeoLanding";
import Funcionalidades from "./pages/Funcionalidades";
import Precos from "./pages/Precos";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/Login";
import AdminOnboarding from "./pages/admin/Onboarding";
import AguardandoAprovacao from "./pages/admin/AguardandoAprovacao";
import AdminLayout from "./pages/admin/Layout";
import AdminDashboard from "./pages/admin/Dashboard";
import Oportunidades from "./pages/admin/Oportunidades";
import Conversas from "./pages/admin/Conversas";

import ConfiguracaoIA from "./pages/admin/ConfiguracaoIA";
import Perfil from "./pages/admin/Perfil";
import Usuarios from "./pages/admin/Usuarios";
import Clientes from "./pages/admin/Clientes";
import Historico from "./pages/admin/Historico";
import CancelarAssinatura from "./pages/admin/CancelarAssinatura";
import Suporte from "./pages/admin/Suporte";
import Financeiro from "./pages/admin/Financeiro";
import Subcontas from "./pages/admin/Subcontas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/funcionalidades" element={<Funcionalidades />} />
          <Route path="/precos" element={<Precos />} />
          <Route path="/seo" element={<SeoLanding />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/onboarding" element={<AdminOnboarding />} />
          <Route path="/admin/aguardando-aprovacao" element={<AguardandoAprovacao />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="oportunidades" element={<Oportunidades />} />
            <Route path="conversas" element={<Conversas />} />
            
            <Route path="ia" element={<ConfiguracaoIA />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="historico" element={<Historico />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="subcontas" element={<Subcontas />} />
            <Route path="cancelar-assinatura" element={<CancelarAssinatura />} />
            <Route path="suporte" element={<Suporte />} />
            {/* Legacy routes redirect */}
            <Route path="leads" element={<Oportunidades />} />
            <Route path="conversations" element={<Conversas />} />
            
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
