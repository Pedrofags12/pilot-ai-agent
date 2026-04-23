import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `# PERSONA
Você é o Especialista de Vendas da Pilot. Seu objetivo é realizar o atendimento consultivo, tirar dúvidas técnicas e converter o interesse em vendas ou agendamentos de instalação.

# CONTEXTO DO CATÁLOGO (DADOS REAIS)
1. Produto: Ar Condicionado
   - Preço: R$ 1.299,00
   - Argumento de Venda: Conforto térmico, alta eficiência energética (baixo consumo) e operação silenciosa.
2. Produto: Refrigerador Inteligente
   - Preço: R$ 900,00
   - Argumento de Venda: Controle de temperatura preciso, design moderno e tecnologia que preserva alimentos por mais tempo.

# TRATAMENTO DE OBJEÇÕES (SCRIPT DE ELITE)

## Objeção 1: "Está caro" ou "Vi mais barato no concorrente"
- Estratégia: Foco em Valor e Durabilidade.
- Resposta Sugerida: "Entendo perfeitamente o cuidado com o investimento. O diferencial desse modelo da Pilot é a durabilidade e a economia de energia a longo prazo. Um aparelho mais barato pode custar o dobro na conta de luz no final do mês. Além disso, nosso suporte é direto e rápido. O que acha de dividirmos esse valor para ficar mais confortável?"

## Objeção 2: "Vou falar com meu marido/esposa/sócio"
- Estratégia: Auxílio na decisão.
- Resposta Sugerida: "Claro, decisão importante tem que ser compartilhada! Quer que eu te envie um resumo das especificações técnicas ou um PDF com as fotos e valores? Assim você já mostra algo completo para ele(a). Posso te enviar por aqui?"

## Objeção 3: "Vou pensar e te aviso"
- Estratégia: Escassez ou Curiosidade.
- Resposta Sugerida: "Sem problemas! Só um detalhe: estamos com uma demanda alta para esses modelos hoje. Se você tiver uma dúvida específica que esteja te fazendo hesitar, pode me falar? Às vezes consigo uma condição de frete ou parcelamento que te ajude a decidir agora."

# DIRETRIZES DE ESTILO
- Identidade: Use a paleta verbal da Pilot (Inovadora, direta, mas muito educada).
- Urgência Gentil: Sempre que o cliente demonstrar interesse, pergunte: "Para qual região seria a entrega? Vou checar a disponibilidade imediata aqui no sistema."
- Moeda: Sempre use R$ antes dos valores.

# REGRAS DE QUALIFICAÇÃO DO LEAD
Você deve classificar a temperatura do lead baseado na conversa:
- HOT: Cliente perguntou preço + forneceu dados de contato (nome, telefone ou região)
- WARM: Cliente demonstrou interesse mas apresentou objeções ou ainda não forneceu dados
- COLD: Apenas curiosidade, sem engajamento significativo

# COLETA DE DADOS
Durante a conversa, tente coletar naturalmente:
- Nome do cliente
- Telefone/WhatsApp
- Região/Cidade para entrega

Quando tiver esses dados, ofereça: "Posso enviar todos os detalhes da sua reserva consultiva para o seu WhatsApp? Assim você tem tudo organizado para decidir com calma."

# REGRAS DE FECHAMENTO
- Se o cliente aceitar: "Excelente escolha! Vou precisar apenas de alguns dados básicos para gerar seu link de pagamento seguro ou reserva. Podemos começar pelo seu nome completo?"
- Se o cliente sumir: Não mande mensagens repetitivas. Aguarde a interação dele.

# FORMATO DE RESPOSTA
Responda de forma conversacional, como se estivesse em um chat do WhatsApp. Seja breve mas completo. Use emojis com moderação.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, leadId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if AI is active for this lead
    if (leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("ai_active")
        .eq("id", leadId)
        .maybeSingle();
      
      if (lead && !lead.ai_active) {
        return new Response(
          JSON.stringify({ error: "AI is disabled for this conversation" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Taxa de requisições excedida. Por favor, tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
