import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPhone } from "@/lib/masks";
import { loginSchema, signupSchema, forgotPasswordSchema } from "@/lib/validations";

type Mode = "login" | "signup" | "forgot";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input based on mode
      if (mode === "forgot") {
        const validation = forgotPasswordSchema.safeParse({ email });
        if (!validation.success) {
          toast({ 
            title: "Validação falhou", 
            description: validation.error.errors[0].message, 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
          toast({
            title: "E-mail enviado",
            description: "Verifique sua caixa de entrada para redefinir a senha.",
          });
          setMode("login");
        }
      } else if (mode === "signup") {
        const validation = signupSchema.safeParse({ fullName, phone, email, password });
        if (!validation.success) {
          toast({ 
            title: "Validação falhou", 
            description: validation.error.errors[0].message, 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, phone },
          },
        });
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
          toast({
            title: "Conta criada!",
            description: "Verifique seu e-mail para confirmar sua conta antes de fazer login.",
          });
          setMode("login");
        }
      } else {
        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
          toast({ 
            title: "Validação falhou", 
            description: validation.error.errors[0].message, 
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else if (data.session) {
          navigate("/admin");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<Mode, { heading: string; sub: string }> = {
    login: { heading: "Iniciar sessão", sub: "Entre para acessar o painel" },
    signup: { heading: "Criar conta", sub: "Crie sua conta para começar" },
    forgot: { heading: "Recuperar senha", sub: "Enviaremos um link para seu e-mail" },
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <div className="mb-8 text-center">
          <Link to="/" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <span className="text-xl font-bold text-primary-foreground">P</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{titles[mode].heading}</h1>
          <p className="text-sm text-muted-foreground">{titles[mode].sub}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password">Senha</Label>
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

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "login" ? (
              "Entrar"
            ) : mode === "signup" ? (
              "Criar Conta"
            ) : (
              "Enviar link"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center space-y-1">
          {mode === "login" && (
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Não tem conta? Criar agora
            </button>
          )}
          {mode === "signup" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Já tem conta? Entrar
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("login")}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
