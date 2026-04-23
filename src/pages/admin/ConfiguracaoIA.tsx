import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Save, MessageSquare, Volume2, Camera, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AIConfig {
  id: string;
  user_id: string;
  agent_name: string;
  system_prompt: string;
  ai_tone: string;
  ai_model: string;
  profile_image_url: string | null;
}

const toneOptions = [
  { value: "amigavel", label: "🤗 Amigável", description: "Tom caloroso e acolhedor" },
  { value: "formal", label: "👔 Formal", description: "Tom profissional e respeitoso" },
  { value: "persuasivo", label: "🎯 Persuasivo", description: "Foco em conversão e vendas" },
  { value: "tecnico", label: "🔧 Técnico", description: "Detalhado e preciso" },
];

const modelOptions = [
  { value: "gpt-4o", label: "GPT-4o", description: "Mais inteligente e preciso" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Rápido e econômico" },
];

const defaultConfig: Partial<AIConfig> = {
  agent_name: "Atendente Pilot",
  system_prompt: `Você é um assistente de vendas amigável e prestativo.

PERSONALIDADE:
- Seja cordial e empático
- Foque em entender as necessidades do cliente
- Nunca seja insistente ou agressivo

OBJETIVOS:
1. Qualificar o lead (nome, telefone, região)
2. Identificar o produto de interesse
3. Responder dúvidas sobre produtos
4. Direcionar para o WhatsApp quando apropriado`,
  ai_tone: "amigavel",
  ai_model: "gpt-4o",
};

// URL do webhook do n8n para revisar o prompt
const N8N_WEBHOOK_URL = "https://auto.pedro-fagundes.com/webhook-test/configurar-ia";

export default function ConfiguracaoIA() {
  const [config, setConfig] = useState<Partial<AIConfig>>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStep, setSaveStep] = useState<"idle" | "reviewing" | "saving" | "success">("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchConfig() {
      // Buscar configuração do usuário autenticado
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ai_config")
        .select("*")
        .eq("user_id", session.session.user.id)
        .maybeSingle();

      if (data) {
        setConfig(data);
        if (data.profile_image_url) {
          setPreviewUrl(data.profile_image_url);
        }
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem.",
        });
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 2MB.",
        });
        return;
      }
      
      // Upload to storage
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `agent-profile-${session.session.user.id}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("ai-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: "Não foi possível enviar a imagem.",
        });
        return;
      }

      const { data: urlData } = supabase.storage
        .from("ai-assets")
        .getPublicUrl(fileName);

      setPreviewUrl(urlData.publicUrl);
      setConfig((prev) => ({ ...prev, profile_image_url: urlData.publicUrl }));
      
      toast({
        title: "Imagem enviada",
        description: "A foto de perfil foi atualizada.",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStep("reviewing");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast({
          variant: "destructive",
          title: "Não autenticado",
          description: "Faça login novamente para continuar.",
        });
        setSaving(false);
        setSaveStep("idle");
        return;
      }

      setSaveStep("saving");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-agent-config`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_name: config.agent_name,
            ai_tone: config.ai_tone,
            ai_model: config.ai_model,
            system_prompt: config.system_prompt,
            profile_image_url: config.profile_image_url,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao salvar");
      }

      setSaveStep("success");
      
      toast({
        title: "✅ Configurações Salvas!",
        description: "Seu assistente virtual foi atualizado com sucesso.",
      });

      setTimeout(() => {
        setSaveStep("idle");
      }, 3000);
      
    } catch (error) {
      console.error("Save error:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Não foi possível salvar as configurações.",
      });
      setSaveStep("idle");
    } finally {
      setSaving(false);
    }
  };

  const currentTone = toneOptions.find((t) => t.value === config.ai_tone);
  const currentModel = modelOptions.find((m) => m.value === config.ai_model);

  const getSaveButtonContent = () => {
    switch (saveStep) {
      case "reviewing":
        return (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Revisando com IA...
          </>
        );
      case "saving":
        return (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Salvando...
          </>
        );
      case "success":
        return (
          <>
            <CheckCircle2 className="h-5 w-5" />
            Salvo com Sucesso!
          </>
        );
      default:
        return (
          <>
            <Save className="h-5 w-5" />
            Salvar Alterações
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[500px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">
          ⚙️ Configuração da IA
        </h2>
        <p className="text-base text-muted-foreground">
          Personalize o cérebro do seu assistente virtual.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Configurações do Agente
            </CardTitle>
            <CardDescription>
              Defina como a IA deve se comportar durante as conversas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo Upload */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                <Camera className="mr-2 inline h-4 w-4" />
                Foto de Perfil do Agente
              </Label>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarImage src={previewUrl || undefined} alt="Agent avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Bot className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Input
                    id="profile-photo"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG ou GIF. Máximo 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="text-base font-medium">
                Nome do Agente
              </Label>
              <Input
                id="agent-name"
                value={config.agent_name || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, agent_name: e.target.value }))}
                placeholder="Ex: Atendente Pilot"
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                Este nome aparecerá nas conversas com os clientes.
              </p>
            </div>

            {/* Tone Select */}
            <div className="space-y-2">
              <Label className="text-base font-medium">
                <Volume2 className="mr-2 inline h-4 w-4" />
                Tom de Voz
              </Label>
              <Select
                value={config.ai_tone}
                onValueChange={(value) => setConfig((prev) => ({ ...prev, ai_tone: value }))}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecione o tom" />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="py-3">
                      <div>
                        <span className="font-medium">{option.label}</span>
                        <span className="ml-2 text-sm text-muted-foreground">
                          - {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="instructions" className="text-base font-medium">
                <MessageSquare className="mr-2 inline h-4 w-4" />
                Instruções Principais (Prompt)
              </Label>
              <Textarea
                id="instructions"
                value={config.system_prompt || ""}
                onChange={(e) => setConfig((prev) => ({ ...prev, system_prompt: e.target.value }))}
                rows={12}
                className="resize-none text-base leading-relaxed"
                placeholder="Digite as instruções para a IA..."
              />
              <p className="text-sm text-muted-foreground">
                Defina a personalidade, objetivos e restrições do seu assistente.
                {N8N_WEBHOOK_URL && " O texto será revisado pelo Agente Revisor antes de salvar."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving || saveStep === "success"} 
                size="lg" 
                className="gap-2 text-base transition-all"
              >
                {getSaveButtonContent()}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Card - Agent Business Card */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-2 border-primary/20">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
              <Avatar className="mx-auto h-20 w-20 border-4 border-background shadow-lg">
                <AvatarImage src={previewUrl || undefined} alt="Agent avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
            </div>
            <CardContent className="space-y-4 p-6 text-center">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {config.agent_name || "Seu Agente"}
                </h3>
                <p className="text-sm text-muted-foreground">Assistente Virtual</p>
              </div>

              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-sm text-muted-foreground">Tom de Voz</span>
                  <span className="font-medium text-foreground">{currentTone?.label}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-sm text-muted-foreground">Modelo</span>
                  <span className="font-medium text-foreground">{currentModel?.label}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4 text-left">
                <p className="text-xs font-medium uppercase text-muted-foreground">Preview</p>
                <p className="mt-2 text-sm text-foreground">
                  "Olá! Sou o <strong>{config.agent_name}</strong>. Como posso ajudar você hoje?"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">💡 Dicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                <strong className="text-foreground">Foto de perfil:</strong> Use uma imagem que represente sua marca ou um avatar amigável.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Seja específico:</strong> Quanto mais detalhes nas instruções, melhor o atendimento.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Tom persuasivo:</strong> Ideal para lojas que querem aumentar conversões.
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Teste sempre:</strong> Converse com a IA após salvar para verificar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
