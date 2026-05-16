import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Prompt padrão (fallback se o usuário não configurou ai_config)
const DEFAULT_SYSTEM_PROMPT = `Você é um assistente de vendas consultivo. Seja educado, direto e focado em ajudar o cliente a encontrar a melhor solução. Use linguagem natural de WhatsApp.`;

// Modelos suportados — whitelist para evitar injeção de modelo arbitrário
const ALLOWED_MODELS = new Set([
  "google/gemini-3-flash-preview",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-haiku",
  "claude-sonnet-4-5",
]);

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

/**
 * Busca ai_config do consultor dono do lead.
 * Retorna prompt e modelo validados, ou defaults seguros.
 */
async function resolveAgentConfig(
  supabase: ReturnType<typeof createClient>,
  leadId?: string,
): Promise<{ systemPrompt: string; model: string; agentName: string }> {
  if (!leadId) {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: DEFAULT_MODEL, agentName: "Assistente" };
  }

  // 1. Pega o user_id do lead (dono = consultor)
  const { data: lead } = await supabase
    .from("leads")
    .select("user_id")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead?.user_id) {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: DEFAULT_MODEL, agentName: "Assistente" };
  }

  // 2. Busca ai_config do consultor
  const { data: config } = await supabase
    .from("ai_config")
    .select("agent_name, ai_tone, ai_model, system_prompt")
    .eq("user_id", lead.user_id)
    .maybeSingle();

  if (!config) {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: DEFAULT_MODEL, agentName: "Assistente" };
  }

  // 3. Valida modelo contra whitelist — nunca usa modelo arbitrário do DB
  const model = ALLOWED_MODELS.has(config.ai_model ?? "")
    ? config.ai_model!
    : DEFAULT_MODEL;

  // 4. Usa system_prompt customizado ou monta um padrão com o tom configurado
  const systemPrompt = config.system_prompt?.trim()
    ? config.system_prompt
    : buildDefaultPromptFromTone(config.agent_name, config.ai_tone);

  return {
    systemPrompt,
    model,
    agentName: config.agent_name ?? "Assistente",
  };
}

function buildDefaultPromptFromTone(agentName?: string, tone?: string): string {
  const name = agentName ?? "Assistente";
  const toneMap: Record<string, string> = {
    amigavel:     "Seja amigável, use linguagem descontraída e emojis com moderação.",
    profissional: "Seja formal e profissional, evite gírias.",
    direto:       "Seja direto e objetivo, sem rodeios.",
    empatico:     "Seja empático, demonstre compreensão antes de oferecer soluções.",
  };
  const toneInstruction = toneMap[tone ?? "amigavel"] ?? toneMap.amigavel;
  return `Você é ${name}, um assistente de vendas consultivo. ${toneInstruction} Responda de forma conversacional, como em um chat de WhatsApp.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurado.");
    }

    // Parse body — nunca loga conteúdo das mensagens (dados do cliente)
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Body JSON inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages, sessionId, leadId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages é obrigatório e deve ser um array." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Limite de segurança: máximo 50 mensagens no contexto
    const safeMessages = messages.slice(-50);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verifica se IA está ativa para o lead
    if (leadId) {
      const { data: lead } = await supabase
        .from("leads")
        .select("ai_active")
        .eq("id", leadId)
        .maybeSingle();

      if (lead && !lead.ai_active) {
        return new Response(
          JSON.stringify({ error: "IA desativada para esta conversa." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Resolve configuração dinâmica do agente
    const { systemPrompt, model } = await resolveAgentConfig(supabase, leadId);

    // Chama gateway de IA com AbortController para timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...safeMessages,
          ],
          stream: true,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Taxa de requisições excedida. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("AI gateway error:", aiResponse.status);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    // Nunca expõe stack trace ou detalhes internos ao cliente
    console.error("chat function error:", error instanceof Error ? error.message : "unknown");
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
