import { useState, useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home,
  Target,
  MessageCircle,
  Bot,
  LogOut,
  Menu,
  X,
  User,
  Users,
  History,
  LifeBuoy,
  Wallet,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/admin/NotificationBell";

const navItems = [
  { href: "/admin", icon: Home, label: "Início", end: true },
  { href: "/admin/oportunidades", icon: Target, label: "Oportunidades" },
  { href: "/admin/conversas", icon: MessageCircle, label: "Conversas" },
  
  { href: "/admin/ia", icon: Bot, label: "Configuração da IA" },
  { href: "/admin/financeiro", icon: Wallet, label: "Financeiro" },
  { href: "/admin/subcontas", icon: Building2, label: "Subconta Asaas" },
  { href: "/admin/clientes", icon: Users, label: "Clientes" },
  { href: "/admin/historico", icon: History, label: "Histórico" },
  
  { href: "/admin/perfil", icon: User, label: "Configurações" },
  { href: "/admin/suporte", icon: LifeBuoy, label: "Suporte" },
];

export default function AdminLayout() {
  // Guard de autenticação agora centralizado no ProtectedRoute (App.tsx)
  // O Layout apenas consome o contexto para dados de exibição e logout
  const { session, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  // Verifica role de admin uma única vez ao montar (não bloqueia a rota)
  useEffect(() => {
    if (!session?.user.id) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => { if (data) setIsAdmin(true); });
  }, [session?.user.id]);

  // Fecha sidebar ao mudar de rota (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-18 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-xl font-bold text-foreground">Pilot</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="rounded-lg p-2 hover:bg-muted lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          {navItems.filter((item) => !(item as any).adminOnly || isAdmin).map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className="flex items-center gap-4 rounded-xl px-4 py-3 text-base text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-6 left-4 right-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-4 px-4 py-3 text-base text-muted-foreground hover:text-foreground" 
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sair da conta</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-18 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="rounded-lg p-2 hover:bg-muted lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-semibold text-foreground lg:text-2xl">
              Painel Pilot
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true"
        />
      )}
    </div>
  );
}
