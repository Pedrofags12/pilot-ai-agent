import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-n8n-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. AUTH — keygeral ou x-n8n-key
    const authHeader = req.headers.get("authorization") || "";
    const n8nKey = req.headers.get("x-n8n-key") || "";
    const expectedKey = Deno.env.get("keygeral") || Deno.env.get("n8n_key") || "";

    const tokenFromBearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const isAuthorized =
      (tokenFromBearer && expectedKey && tokenFromBearer === expectedKey) ||
      (n8nKey && expectedKey && n8nKey === expectedKey);

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Envie keygeral como Bearer token ou x-n8n-key." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. PARSE BODY
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Body JSON inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      user_id,
      content,
      sender,              // "human" | "bot" | "client"
      contact_phone,
      contact_name,
      external_message_id, // messageid do Uazapi — usado para dedup por ID real
      media_type = "text", // "text" | "audio"
    } = body;

    if (!content || !sender || !contact_phone) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: content, sender, contact_phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const normalizedPhone = contact_phone.replace(/\D/g, "");
    const now = new Date().toISOString();

    // 3. FIND OR CREATE LEAD
    let { data: lead } = await supabase
      .from("leads")
      .select("id, user_id, ai_active, name, unread_count")
      .or(`phone.eq.${normalizedPhone},session_id.eq.whatsapp_${normalizedPhone}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead) {
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          phone: normalizedPhone,
          session_id: `whatsapp_${normalizedPhone}`,
          name: contact_name || null,
          temperature: "warm",
          user_id: user_id || null,
        })
        .select("id, user_id, ai_active, name, unread_count")
        .single();

      if (leadErr) {
        return new Response(
          JSON.stringify({ error: "Erro ao criar lead", details: leadErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      lead = newLead;
    }

    // 4. DEDUP — prioriza external_message_id (Uazapi messageid), fallback para janela de 60s
    const role = sender === "client" ? "user" : "assistant";
    const isAiResponse = sender === "bot";

    if (external_message_id) {
      const { data: existingById } = await supabase
        .from("conversations")
        .select("id")
        .eq("external_message_id", external_message_id)
        .maybeSingle();

      if (existingById) {
        return new Response(
          JSON.stringify({ success: true, deduplicated: true, message_id: existingById.id, lead_id: lead.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      // Fallback: janela de 60s para mensagens sem ID externo
      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
      const { data: existingByWindow } = await supabase
        .from("conversations")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("content", content)
        .eq("role", role)
        .gte("created_at", sixtySecondsAgo)
        .limit(1)
        .maybeSingle();

      if (existingByWindow) {
        return new Response(
          JSON.stringify({ success: true, deduplicated: true, message_id: existingByWindow.id, lead_id: lead.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 5. INSERT MESSAGE
    const { data: msg, error: msgErr } = await supabase
      .from("conversations")
      .insert({
        lead_id: lead.id,
        content,
        role,
        is_ai_response: isAiResponse,
        external_message_id: external_message_id || null,
        media_type,
      })
      .select("id")
      .single();

    if (msgErr) {
      // Conflict em external_message_id = dedup via constraint — não é erro
      if (msgErr.code === "23505") {
        return new Response(
          JSON.stringify({ success: true, deduplicated: true, lead_id: lead.id }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao salvar mensagem", details: msgErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. UPDATE LEAD
    const leadUpdate: Record<string, unknown> = {
      last_message: content.substring(0, 200),
      last_message_time: now,
      updated_at: now,
    };

    // sender "human" = admin digitou manualmente → desativa IA
    if (sender === "human") {
      leadUpdate.ai_active = false;
    }

    if (contact_name && !lead.name) {
      leadUpdate.name = contact_name;
    }

    await supabase.from("leads").update(leadUpdate).eq("id", lead.id);

    // 7. Incrementa unread apenas para mensagens do cliente
    if (sender === "client") {
      try {
        await supabase.rpc("increment_unread", { _lead_id: lead.id });
      } catch {
        await supabase
          .from("leads")
          .update({ unread_count: (lead.unread_count ?? 0) + 1 })
          .eq("id", lead.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: msg.id,
        lead_id: lead.id,
        user_id: lead.user_id || null,
        ai_active: sender === "human" ? false : lead.ai_active,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("sync-chat error:", error);
    return new Response(
      JSON.stringify({ error: "Erro inesperado", details: error instanceof Error ? error.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
