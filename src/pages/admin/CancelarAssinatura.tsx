import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const REASONS = [
  "Não estou utilizando a plataforma",
  "Encontrei uma alternativa melhor",
  "Muito caro para o meu negócio",
  "Problemas técnicos frequentes",
  "Faltam funcionalidades que preciso",
  "Outro motivo",
];

export default function CancelarAssinatura() {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason) {
      toast({ variant: "destructive", title: "Selecione um motivo" });
      return;
    }
    setSubmitting(true);

    // Create a notification for admin review
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("notifications").insert({
        user_id: session.user.id,
        type: "client",
        title: "Solicitação de cancelamento",
        message: `Motivo: ${reason}. ${details}`.trim(),
      });
    }

    setSubmitting(false);
    setSubmitted(true);
    toast({ title: "Solicitação enviada", description: "Entraremos em contato em até 48h." });
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <AlertTriangle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Solicitação Recebida</h2>
            <p className="text-sm text-muted-foreground">
              Sua solicitação de cancelamento foi registrada. Nossa equipe entrará em contato em até 48 horas.
            </p>
            <Button onClick={() => navigate("/admin/perfil")} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar às Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/admin/perfil")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar às Configurações
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-xl">Solicitar Cancelamento</CardTitle>
          <CardDescription>
            Sentimos muito que você queira ir embora. Nos conte o motivo para que possamos melhorar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Motivo do cancelamento *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Detalhes (opcional)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Conte-nos mais sobre o motivo..."
              rows={4}
            />
          </div>

          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-foreground font-medium">⚠️ Atenção</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ao confirmar, sua solicitação será analisada pela nossa equipe. O acesso permanece ativo até o final do período vigente.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/admin/perfil")} className="flex-1">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? "Enviando..." : "Confirmar Cancelamento"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
