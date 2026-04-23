import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Valida x-n8n-key — endpoint chamado pelo n8n ou pelo admin interno
  const n8nKey = Deno.env.get("n8n_key");
  const authHeader = req.headers.get("x-n8n-key") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (!n8nKey || authHeader !== n8nKey) {
    return new Response(
      JSON.stringify({ error: "Não autorizado" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { lead_id, status, notas } = await req.json();

    if (!lead_id || !status) {
      return new Response(
        JSON.stringify({ error: "lead_id e status são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validTemperatures = ["hot", "warm", "cold"];
    if (!validTemperatures.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status inválido. Use: ${validTemperatures.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const updateData: Record<string, unknown> = {
      temperature: status,
      updated_at: new Date().toISOString(),
    };

    if (notas) {
      updateData.notes = notas;
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("Update lead error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: "Lead não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Lead qualificado com sucesso", data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("update-lead-status error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
