import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────
export type AccountStatus = "pending" | "waitlist" | "approved";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  onboarding_completed: boolean;
  account_status: AccountStatus;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  /** Refetch profile — use após mutar onboarding_completed ou account_status */
  refreshProfile: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string): Promise<void> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, onboarding_completed, account_status")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[AuthContext] fetchProfile error:", error.message);
      setProfile(null);
      return;
    }

    setProfile(data as UserProfile);
  }

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Carrega sessão inicial
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user.id) {
        await fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });

    // Escuta mudanças de sessão (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (newSession?.user.id) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }

        // Só marca loading=false na inicialização (INITIAL_SESSION)
        if (event === "INITIAL_SESSION") {
          setLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth() deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
