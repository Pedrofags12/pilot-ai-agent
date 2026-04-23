import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-n8n-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, message, direction, sender_name } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const normalizedPhone = phone.replace(/\D/g, "");
    const sessionId = `whatsapp_${normalizedPhone}`;

    // 1. BUSCA OU CRIA USUÁRIO AUTH PELO TELEFONE
    let authUserId: string | null = null;

    // Tenta encontrar usuário existente pelo telefone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === normalizedPhone || u.user_metadata?.phone === normalizedPhone
    );

    if (existingUser) {
      authUserId = existingUser.id;
    } else {
      // Cria novo usuário auth com o telefone
      const randomPassword = crypto.randomUUID();
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        password: randomPassword,
        phone_confirm: true,
        user_metadata: {
          full_name: sender_name || null,
          phone: normalizedPhone,
          source: "whatsapp",
        },
      });

      if (authError) {
        return new Response(
          JSON.stringify({
            error: "Erro ao criar usuário auth",
            message: authError.message,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      authUserId = newUser.user?.id ?? null;
    }

    // 2. BUSCA O LEAD (por session_id OU phone)
    let { data: lead } = await supabase
      .from("leads")
      .select("id, user_id")
      .or(`session_id.eq.${sessionId},phone.eq.${normalizedPhone}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lead) {
      const { data: newLead, error: leadError } = await supabase
        .from("leads")
        .insert({
          phone: normalizedPhone,
          session_id: sessionId,
          name: sender_name || null,
          temperature: "warm",
          user_id: authUserId,
        })
        .select("id, user_id")
        .single();

      if (leadError) {
        return new Response(
          JSON.stringify({
            error: "Erro no banco ao criar lead",
            message: leadError.message,
            details: leadError.details,
            hint: leadError.hint,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      lead = newLead;
    } else if (!lead.user_id && authUserId) {
      // Atualiza lead existente sem user_id
      await supabase.from("leads").update({ user_id: authUserId }).eq("id", lead.id);
      lead.user_id = authUserId;
    }

    // 3. DEDUP CHECK + SALVA MENSAGEM
    const msgRole = direction === "outgoing" ? "assistant" : "user";
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const { data: existingMsg } = await supabase
      .from("conversations")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("content", message)
      .eq("role", msgRole)
      .gte("created_at", sixtySecondsAgo)
      .limit(1)
      .maybeSingle();

    if (existingMsg) {
      return new Response(
        JSON.stringify({ success: true, deduplicated: true, lead_id: lead.id, user_id: authUserId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: msgError } = await supabase.from("conversations").insert({
      lead_id: lead.id,
      content: message,
      role: msgRole,
      is_ai_response: direction === "outgoing",
    });

    if (msgError) {
      return new Response(JSON.stringify({ error: "Erro ao salvar mensagem", message: msgError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: lead.id,
        user_id: authUserId,
        is_new_user: !existingUser,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro inesperado", message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
