import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public pages
import Index         from "./pages/Index";
import SeoLanding    from "./pages/SeoLanding";
import Funcionalidades from "./pages/Funcionalidades";
import Precos        from "./pages/Precos";
import NotFound      from "./pages/NotFound";

// Auth pages
import AuthCallback  from "./pages/auth/callback";
import AdminLogin    from "./pages/admin/Login";
import ResetPassword from "./pages/ResetPassword";

// Onboarding / waitlist (não precisam de account_status = approved)
import AdminOnboarding    from "./pages/admin/Onboarding";
import AguardandoAprovacao from "./pages/admin/AguardandoAprovacao";

// Protected admin pages
import AdminLayout    from "./pages/admin/Layout";
import AdminDashboard from "./pages/admin/Dashboard";
import Oportunidades  from "./pages/admin/Oportunidades";
import Conversas      from "./pages/admin/Conversas";
import ConfiguracaoIA from "./pages/admin/ConfiguracaoIA";
import Perfil         from "./pages/admin/Perfil";
import Usuarios       from "./pages/admin/Usuarios";
import Clientes       from "./pages/admin/Clientes";
import ClienteDetalhe from "./pages/admin/ClienteDetalhe";
import Historico      from "./pages/admin/Historico";
import CancelarAssinatura from "./pages/admin/CancelarAssinatura";
import Suporte        from "./pages/admin/Suporte";
import Financeiro     from "./pages/admin/Financeiro";
import Subcontas      from "./pages/admin/Subcontas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* AuthProvider envolve tudo — session + profile disponíveis em qualquer componente */}
        <AuthProvider>
          <Routes>
            {/* ── Públicas ───────────────────────────────────── */}
            <Route path="/"               element={<Index />} />
            <Route path="/funcionalidades" element={<Funcionalidades />} />
            <Route path="/precos"         element={<Precos />} />
            <Route path="/seo"            element={<SeoLanding />} />

            {/* ── Auth ───────────────────────────────────────── */}
            {/* Callback centralizado: processa tokens de e-mail e roteia */}
            <Route path="/auth/callback"  element={<AuthCallback />} />
            <Route path="/admin/login"    element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ── Onboarding: autenticado mas ainda não aprovado ─ */}
            <Route
              path="/admin/onboarding"
              element={
                <ProtectedRoute require="onboarding">
                  <AdminOnboarding />
                </ProtectedRoute>
              }
            />

            {/* ── Waitlist: onboarding completo mas pending/waitlist ─ */}
            <Route
              path="/admin/aguardando-aprovacao"
              element={
                <ProtectedRoute require="waitlist">
                  <AguardandoAprovacao />
                </ProtectedRoute>
              }
            />

            {/* ── Painel admin: account_status = approved ────── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute require="approved">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index                     element={<AdminDashboard />} />
              <Route path="oportunidades"      element={<Oportunidades />} />
              <Route path="conversas"          element={<Conversas />} />
              <Route path="ia"                 element={<ConfiguracaoIA />} />
              <Route path="perfil"             element={<Perfil />} />
              <Route path="usuarios"           element={<Usuarios />} />
              <Route path="clientes"           element={<Clientes />} />
              <Route path="clientes/:id"       element={<ClienteDetalhe />} />
              <Route path="historico"          element={<Historico />} />
              <Route path="financeiro"         element={<Financeiro />} />
              <Route path="subcontas"          element={<Subcontas />} />
              <Route path="cancelar-assinatura" element={<CancelarAssinatura />} />
              <Route path="suporte"            element={<Suporte />} />
              {/* Legacy redirects */}
              <Route path="leads"              element={<Oportunidades />} />
              <Route path="conversations"      element={<Conversas />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
