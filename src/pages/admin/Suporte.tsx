import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LifeBuoy, Send, User, Building2, Mail, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Suporte() {
  const [userInfo, setUserInfo] = useState({ name: "", email: "", company: "", phone: "" });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;

      const [profileRes, companyRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, email").eq("id", uid).single(),
        supabase.from("companies").select("company_name").eq("user_id", uid).maybeSingle(),
      ]);

      setUserInfo({
        name: profileRes.data?.full_name || "",
        email: profileRes.data?.email || session.user.email || "",
        company: companyRes.data?.company_name || "",
        phone: profileRes.data?.phone || "",
      });
    }
    load();
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ variant: "destructive", title: "Preencha o assunto e a mensagem." });
      return;
    }
    setSending(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("notifications").insert({
        user_id: session.user.id,
        type: "client",
        title: `Suporte: ${subject}`,
        message: `De: ${userInfo.name} (${userInfo.email}) | Empresa: ${userInfo.company} | Tel: ${userInfo.phone}\n\n${message}`,
      });
    }

    setSending(false);
    setSent(true);
    toast({ title: "✅ Mensagem enviada!", description: "Nossa equipe responderá em breve." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Central de Suporte</h1>
          <p className="text-sm text-muted-foreground">Precisa de ajuda? Envie sua mensagem e retornaremos em breve.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Suas Informações
            </CardTitle>
            <CardDescription>Dados enviados junto à mensagem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3 w-3" /> Nome</Label>
              <Input value={userInfo.name} onChange={(e) => setUserInfo((p) => ({ ...p, name: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> E-mail</Label>
              <Input value={userInfo.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3 w-3" /> Empresa</Label>
              <Input value={userInfo.company} onChange={(e) => setUserInfo((p) => ({ ...p, company: e.target.value }))} placeholder="Nome da empresa" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> Telefone</Label>
              <Input value={userInfo.phone} onChange={(e) => setUserInfo((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
          </CardContent>
        </Card>

        {/* Message */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-primary" /> Enviar Mensagem
            </CardTitle>
            <CardDescription>Descreva sua dúvida ou problema e entraremos em contato.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Send className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Mensagem Enviada!</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Recebemos sua solicitação e nossa equipe entrará em contato em breve pelo e-mail cadastrado.
                </p>
                <Button onClick={() => { setSent(false); setSubject(""); setMessage(""); }} variant="outline">
                  Enviar outra mensagem
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Problema ao cadastrar produto" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Descreva detalhadamente sua dúvida ou problema..." rows={8} />
                </div>
                <Button onClick={handleSend} disabled={sending || !subject.trim() || !message.trim()} className="gap-2">
                  <Send className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar Mensagem"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
