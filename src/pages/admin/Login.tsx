import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, signupSchema, forgotPasswordSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/masks";

type Mode = "login" | "signup" | "forgot";

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin;

// Redireciona usuários já autenticados sem re-renderizar o form
function useRedirectIfAuthed() {
  const { session, profile, loading } = useAuth();
  if (loading || !session || !profile) return null;
  if (!profile.onboarding_completed)   return "/admin/onboarding";
  if (profile.account_status === "approved") return "/admin";
  return "/admin/aguardando-aprovacao";
}

export default function AdminLogin() {
  const redirect = useRedirectIfAuthed();

  const [mode, setMode]       = useState<Mode>("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]     = useState("");
  const [loading, setLoading] = useState(false);
  // Fluxo OTP: após senha correta, aguarda o usuário clicar no magic link
  const [otpSent, setOtpSent] = useState(false);

  if (redirect) return <Navigate to={redirect} replace />;

  // ── Handlers ──────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Passo 1: valida senha
      const { error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // Mensagem normalizada — evita enumeração de usuários
        toast.error("E-mail ou senha inválidos.");
        return;
      }

      // Passo 2: encerra a sessão de senha e dispara OTP
      await supabase.auth.signOut();

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // não cria conta nova se não existir
          emailRedirectTo: `${APP_URL}/auth/callback?type=magiclink&next=/admin`,
        },
      });

      if (otpError) {
        toast.error("Erro ao enviar o link de acesso. Tente novamente.");
        return;
      }

      setOtpSent(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const validation = signupSchema.safeParse({ fullName, phone, email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Após confirmar e-mail, cai no callback que roteia para /onboarding
          emailRedirectTo: `${APP_URL}/auth/callback?type=signup&next=/admin/onboarding`,
          data: { full_name: fullName.trim(), phone },
        },
      });

      if (error) {
        // Supabase retorna "User already registered" — normalizamos
        toast.error("Não foi possível criar a conta. Verifique os dados e tente novamente.");
        return;
      }

      toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      setMode("login");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();

    const validation = forgotPasswordSchema.safeParse({ email });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Não revelamos se o e-mail existe ou não (anti-enumeration)
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${APP_URL}/auth/callback?type=recovery`,
      });

      toast.success("Se este e-mail estiver cadastrado, você receberá o link em instantes.");
      setMode("login");
    } finally {
      setLoading(false);
    }
  }

  // ── OTP sent screen ───────────────────────────────────────────
  if (otpSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">Verifique seu e-mail</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos um link de acesso para{" "}
              <span className="font-medium text-foreground">{email}</span>.
              <br />Clique no link para entrar no Pilot AI.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Não recebeu?{" "}
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => setOtpSent(false)}
            >
              Tentar novamente
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────
  const titles: Record<Mode, { heading: string; sub: string }> = {
    login:  { heading: "Iniciar sessão",  sub: "Entre para acessar o painel"         },
    signup: { heading: "Criar conta",     sub: "Crie sua conta para começar"          },
    forgot: { heading: "Recuperar senha", sub: "Enviaremos um link para seu e-mail"   },
  };

  const onSubmit = mode === "login"
    ? handleLogin
    : mode === "signup"
    ? handleSignup
    : handleForgot;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        {/* Logo + heading */}
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary"
          >
            <span className="text-xl font-bold text-primary-foreground">P</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{titles[mode].heading}</h1>
          <p className="text-sm text-muted-foreground">{titles[mode].sub}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  required
                  autoComplete="tel"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {mode !== "forgot" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : mode === "login"
              ? "Entrar"
              : mode === "signup"
              ? "Criar conta"
              : "Enviar link"}
          </Button>
        </form>

        {/* Mode switcher */}
        <div className="mt-5 text-center">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Não tem conta?{" "}
              <span className="font-medium text-primary">Criar agora</span>
            </button>
          )}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Já tem conta?{" "}
              <span className="font-medium text-primary">Entrar</span>
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              ← Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
