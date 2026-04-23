import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const N8N_WEBHOOK_URL = "https://webhook.agentepilot.com/webhook/status-ia";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lead_id, is_ai_response, message } = await req.json();
    let authenticatedUserId: string | null = null;

    // Auth via n8n key (external calls)
    const n8nKey = req.headers.get("x-n8n-key");
    const expectedKey = Deno.env.get("n8n_key");

    if (n8nKey && expectedKey && n8nKey === expectedKey) {
      authenticatedUserId = "n8n";
    } else {
      // Standard Bearer token auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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

      // Verify admin status using user_roles table (secure pattern)
      const supabaseServiceKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, supabaseServiceKey2);

      const { data: roleData } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authenticatedUserId = user.id;
    }

    // Validate required fields
    if (!lead_id || typeof is_ai_response !== "boolean") {
      return new Response(JSON.stringify({ error: "lead_id (UUID) e is_ai_response (boolean) são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Update ai_active on leads table
    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({ ai_active: is_ai_response })
      .eq("id", lead_id)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Update lead error:", error);
      return new Response(JSON.stringify({ error: error?.message || "Lead não encontrado" }), {
        status: error ? 500 : 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const phone = data?.phone || null;

    // If message provided, save to conversations
    if (message && typeof message === "string") {
      await supabaseAdmin.from("conversations").insert({
        lead_id,
        content: message,
        role: "assistant",
        is_ai_response: false,
      });
    }

    // Signal n8n webhook
    try {
      const webhookPayload: Record<string, unknown> = {
        lead_id,
        ia_ativa: is_ai_response,
        updated_by: authenticatedUserId,
      };

      if (phone) webhookPayload.phone = phone;
      if (message) webhookPayload.message = message;

      const webhookRes = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      });
      console.log("n8n webhook response:", webhookRes.status);
    } catch (webhookErr) {
      console.error("n8n webhook error:", webhookErr);
    }

    return new Response(JSON.stringify({ success: true, phone: data?.phone || null, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("update-conversation-status error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
