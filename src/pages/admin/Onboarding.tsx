import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, Users, Bot, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCNPJ } from "@/lib/masks";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Equipe", icon: Users },
  { id: 3, label: "IA", icon: Bot },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1 - Company
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [commercialPhone, setCommercialPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 - Team
  const [employeeCount, setEmployeeCount] = useState("");
  const [avgClients, setAvgClients] = useState("");
  const [serviceArea, setServiceArea] = useState("");

  // Step 3 - AI
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate("/admin/login");
        return;
      }
      setUserId(data.session.user.id);

      supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.session.user.id)
        .single()
        .then(({ data: profile }) => {
          if (profile?.onboarding_completed) {
            navigate("/admin");
          }
        });
    });
  }, [navigate]);

  const validateStep = () => {
    if (step === 1 && !companyName.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe o nome da empresa.", variant: "destructive" });
      return false;
    }
    if (step === 3 && !aiPrompt.trim()) {
      toast({ title: "Campo obrigatório", description: "Escreva as instruções iniciais para a IA.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = async () => {
    if (!validateStep() || !userId) return;
    setLoading(true);

    try {
      const { error: companyError } = await supabase.from("companies").insert({
        user_id: userId,
        company_name: companyName.trim(),
        cnpj: cnpj.trim() || null,
        commercial_phone: commercialPhone.trim() || null,
        address: address.trim() || null,
        employee_count: employeeCount || null,
        avg_clients: avgClients.trim() || null,
        service_area: serviceArea.trim() || null,
      });
      if (companyError) throw companyError;

      const { error: aiError } = await supabase.from("ai_config").insert({
        user_id: userId,
        system_prompt: aiPrompt.trim(),
        agent_name: "Atendente " + companyName.trim(),
      });
      if (aiError) throw aiError;

      const { data: { session } } = await supabase.auth.getSession();
      const userMeta = session?.user?.user_metadata;
      await supabase.from("registration_logs").insert({
        user_id: userId,
        email: session?.user?.email || null,
        full_name: userMeta?.full_name || null,
        phone: userMeta?.phone || null,
        company_name: companyName.trim(),
        cnpj: cnpj.trim() || null,
        commercial_phone: commercialPhone.trim() || null,
        address: address.trim() || null,
        employee_count: employeeCount || null,
        avg_clients: avgClients.trim() || null,
        service_area: serviceArea.trim() || null,
      });

      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);

      toast({ title: "Tudo pronto!", description: "Seu cadastro foi enviado para análise." });
      navigate("/admin/aguardando-aprovacao");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao salvar dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => { if (s.id < step) setStep(s.id); }}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  step === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : step > s.id
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {step > s.id ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "h-0.5 w-8 sm:w-12 transition-colors",
                  step > s.id ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Dados da Empresa</h1>
                <p className="text-sm text-muted-foreground mt-1">Informações básicas do seu negócio</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="companyName">Nome da empresa *</Label>
                  <Input id="companyName" placeholder="Minha Empresa LTDA" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(formatCNPJ(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commercialPhone">Telefone comercial</Label>
                  <Input id="commercialPhone" type="tel" placeholder="(11) 3000-0000" value={commercialPhone} onChange={(e) => setCommercialPhone(formatPhone(e.target.value))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" placeholder="Rua, número, bairro, cidade - UF" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Equipe e Mercado</h1>
                <p className="text-sm text-muted-foreground mt-1">Nos ajude a entender seu negócio</p>
              </div>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeCount">Número de funcionários</Label>
                  <Select value={employeeCount} onValueChange={setEmployeeCount}>
                    <SelectTrigger id="employeeCount">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Apenas eu</SelectItem>
                      <SelectItem value="2-5">2 a 5</SelectItem>
                      <SelectItem value="6-20">6 a 20</SelectItem>
                      <SelectItem value="21-50">21 a 50</SelectItem>
                      <SelectItem value="50+">Mais de 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avgClients">Média de clientes por mês</Label>
                  <Input id="avgClients" placeholder="Ex: 50" value={avgClients} onChange={(e) => setAvgClients(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceArea">Área de atuação</Label>
                  <Input id="serviceArea" placeholder="Ex: São Paulo e região, Todo o Brasil..." value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Configure sua IA</h1>
                <p className="text-sm text-muted-foreground mt-1">Escreva as primeiras instruções para seu atendente virtual</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Instruções para a IA *</Label>
                  <Textarea
                    id="aiPrompt"
                    placeholder={"Ex: Você é o atendente da minha empresa. Seja educado e objetivo. Responda em português."}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={8}
                    className="resize-none"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Dica: Descreva como a IA deve se comportar, o tom de voz e quais informações priorizar.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <Button variant="ghost" onClick={prevStep} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={nextStep} className="gap-2">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
