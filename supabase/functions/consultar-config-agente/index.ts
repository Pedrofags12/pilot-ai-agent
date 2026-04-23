import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth via keygeral (Bearer token)
    const authHeader = req.headers.get("authorization") || "";
    const expectedKey = Deno.env.get("keygeral") || "";
    const tokenFromBearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (!tokenFromBearer || !expectedKey || tokenFromBearer !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Envie keygeral como Bearer token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const user_id = body?.user_id;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Campo obrigatório: user_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: config, error } = await supabase
      .from("ai_config")
      .select("agent_name, ai_tone, ai_model, system_prompt, profile_image_url")
      .eq("user_id", user_id)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao consultar configurações", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!config) {
      return new Response(
        JSON.stringify({
          agent_name: "Atendente Pilot",
          ai_tone: "amigavel",
          ai_model: "gpt-4o",
          system_prompt: "Você é um assistente de vendas amigável e prestativo.",
          profile_image_url: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify(config),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("consultar-config-agente error:", error);
    return new Response(
      JSON.stringify({ error: "Erro inesperado", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
