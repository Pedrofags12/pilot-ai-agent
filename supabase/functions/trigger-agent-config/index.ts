import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL = "https://webhook.agentepilot.com/webhook/alterar_configuracoes_do_agente";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent_name, ai_tone, ai_model, system_prompt, profile_image_url, user_id: bodyUserId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let userId: string;

    // Auth via n8n key (external calls)
    const n8nKey = req.headers.get("x-n8n-key");
    const expectedKey = Deno.env.get("n8n_key");

    if (n8nKey && expectedKey && n8nKey === expectedKey) {
      if (!bodyUserId) {
        return new Response(JSON.stringify({ error: "user_id é obrigatório para chamadas via n8n" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = bodyUserId;
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = user.id;
    }

    // Build the config object to save
    const configData: Record<string, unknown> = {
      user_id: userId,
      agent_name: agent_name || "Atendente Pilot",
      ai_tone: ai_tone || "amigavel",
      ai_model: ai_model || "gpt-4o",
      system_prompt: system_prompt || "",
      updated_at: new Date().toISOString(),
    };
    if (profile_image_url !== undefined) {
      configData.profile_image_url = profile_image_url;
    }

    // Upsert to ai_config table
    const { data: existing } = await adminClient.from("ai_config").select("id").eq("user_id", userId).maybeSingle();

    if (existing) {
      const { error: updateError } = await adminClient.from("ai_config").update(configData).eq("user_id", userId);
      if (updateError) {
        console.error("DB update error:", updateError);
        return new Response(JSON.stringify({ error: "Erro ao salvar no banco de dados" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { error: insertError } = await adminClient.from("ai_config").insert(configData);
      if (insertError) {
        console.error("DB insert error:", insertError);
        return new Response(JSON.stringify({ error: "Erro ao salvar no banco de dados" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Try to send to n8n webhook (non-blocking, don't fail if it errors)
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name,
          ai_tone,
          system_prompt,
          user_id: userId,
        }),
      });
    } catch (n8nError) {
      console.error("n8n webhook error (non-fatal):", n8nError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("trigger-agent-config error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
