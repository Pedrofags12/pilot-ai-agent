import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, MessageCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AguardandoAprovacao() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login");
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg text-center space-y-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-10 w-10 text-primary animate-pulse" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Cadastro em análise</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Seu perfil está sendo avaliado pela nossa equipe. Assim que possível, retornaremos com uma resposta sobre o seu cadastro.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start gap-4 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Cadastro enviado</p>
              <p className="text-sm text-muted-foreground">Seus dados foram recebidos com sucesso.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Em análise</p>
              <p className="text-sm text-muted-foreground">Nossa equipe está avaliando seu perfil.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Retorno via WhatsApp</p>
              <p className="text-sm text-muted-foreground">Você receberá uma mensagem assim que seu acesso for liberado.</p>
            </div>
          </div>
        </div>

        <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground">
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
