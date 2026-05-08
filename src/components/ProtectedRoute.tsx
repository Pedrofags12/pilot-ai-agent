import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Modos de proteção:
 *
 * "approved"   → autenticado + onboarding completo + account_status = 'approved'
 *                Redireciona para onboarding ou aguardando-aprovacao conforme o estado
 *
 * "onboarding" → autenticado + onboarding NÃO completo
 *                Se já completou, redireciona para admin ou aguardando
 *
 * "waitlist"   → autenticado + onboarding completo + status ≠ 'approved'
 *                Se já aprovado, vai para /admin
 *
 * "auth"       → apenas autenticado (qualquer status)
 */
export type RequireMode = "approved" | "onboarding" | "waitlist" | "auth";

interface Props {
  children: ReactNode;
  require: RequireMode;
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function ProtectedRoute({ children, require }: Props) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;

  // ── Não autenticado ──────────────────────────────────────────
  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Enquanto o perfil ainda não chegou do Supabase
  if (!profile) return <Spinner />;

  const { onboarding_completed, account_status } = profile;

  // ── Roteamento por modo ──────────────────────────────────────
  switch (require) {
    case "approved":
      if (!onboarding_completed) {
        return <Navigate to="/admin/onboarding" replace />;
      }
      if (account_status !== "approved") {
        return <Navigate to="/admin/aguardando-aprovacao" replace />;
      }
      return <>{children}</>;

    case "onboarding":
      if (onboarding_completed) {
        return account_status === "approved"
          ? <Navigate to="/admin" replace />
          : <Navigate to="/admin/aguardando-aprovacao" replace />;
      }
      return <>{children}</>;

    case "waitlist":
      if (!onboarding_completed) {
        return <Navigate to="/admin/onboarding" replace />;
      }
      if (account_status === "approved") {
        return <Navigate to="/admin" replace />;
      }
      return <>{children}</>;

    case "auth":
      return <>{children}</>;
  }
}
