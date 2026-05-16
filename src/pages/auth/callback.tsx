import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * /auth/callback
 *
 * Ponto central de aterrissagem para todos os links de e-mail do Supabase:
 *   - Confirmação de cadastro   (type=signup)
 *   - Magic Link / OTP          (type=magiclink)
 *   - Reset de senha            (type=recovery)
 *
 * Query params recebidos:
 *   token_hash   hash do token gerado pelo Supabase
 *   type         tipo da ação
 *   next         URL de destino pós-autenticação (opcional)
 *
 * Fluxo:
 *   1. verifyOtp() troca o token por uma sessão válida
 *   2. Lê account_status do profile
 *   3. Roteia conforme o estado do usuário
 */
export default function AuthCallback() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = params.get("token_hash");
    const type      = params.get("type") as
      | "signup" | "magiclink" | "recovery" | "email_change" | null;
    const next      = params.get("next") ?? "/admin";

    async function process() {
      try {
        // ── 1. Troca token por sessão ──────────────────────────
        if (tokenHash && type) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            // Supabase aceita: signup | magiclink | recovery | email_change
            type: (type as any),
          });

          if (otpError) {
            setError("Link inválido ou expirado. Solicite um novo acesso.");
            return;
          }
        }

        // ── 2. Recupera sessão estabelecida ───────────────────
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setError("Não foi possível autenticar. Tente novamente.");
          return;
        }

        // ── 3. Senha — vai para página de update ──────────────
        if (type === "recovery") {
          navigate("/reset-password", { replace: true });
          return;
        }

        // ── 4. Lê profile e roteia conforme status ────────────
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed, account_status")
          .eq("id", session.user.id)
          .single();

        if (!profile?.onboarding_completed) {
          navigate("/admin/onboarding", { replace: true });
          return;
        }

        if (profile.account_status === "approved") {
          navigate(next.startsWith("/") ? next : "/admin", { replace: true });
        } else {
          navigate("/admin/aguardando-aprovacao", { replace: true });
        }
      } catch (err) {
        console.error("[AuthCallback]", err);
        setError("Erro inesperado ao processar a autenticação.");
      }
    }

    process();
  }, [navigate, params]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center space-y-5">
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Link inválido</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to="/admin/login">Voltar ao login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Autenticando…</p>
      </div>
    </div>
  );
}
