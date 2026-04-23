import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const N8N_GERAR_SUBCONTA = "https://webhook.agentepilot.com/webhook/gerar-subconta";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. AUTH — Bearer JWT do usuário autenticado
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Token de autenticação obrigatório." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Valida JWT e extrai user_id
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. VERIFICA subconta existente — não cria duplicata
    const { data: existing } = await supabase
      .from("asaas_subaccounts")
      .select("id, asaas_account_id, wallet_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "Subconta já existe para este usuário.",
          subconta: {
            asaas_account_id: existing.asaas_account_id,
            wallet_id: existing.wallet_id,
            status: existing.status,
          },
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 3. PARSE BODY — dados do consultor
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Body JSON inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { name, email, cpfCnpj, phone, mobilePhone, address, addressNumber, province, postalCode } = body;

    if (!name || !email || !cpfCnpj) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: name, email, cpfCnpj." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. CHAMA n8n para criar subconta no Asaas
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s — Asaas pode demorar

    let n8nData: Record<string, unknown>;
    try {
      const n8nRes = await fetch(N8N_GERAR_SUBCONTA, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name,
          email,
          cpfCnpj,
          phone: phone ?? null,
          mobilePhone: mobilePhone ?? null,
          address: address ?? null,
          addressNumber: addressNumber ?? null,
          province: province ?? null,
          postalCode: postalCode ?? null,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!n8nRes.ok) {
        throw new Error(`n8n retornou HTTP ${n8nRes.status}`);
      }

      n8nData = await n8nRes.json();
    } catch (fetchErr) {
      clearTimeout(timeout);
      console.error("criar-subconta n8n error:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Falha ao comunicar com o serviço de criação de subconta." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. EXTRAI dados retornados pelo n8n (que vêm do Asaas)
    const asaas_account_id = n8nData.id as string ?? n8nData.asaas_account_id as string;
    const wallet_id        = n8nData.walletId as string ?? n8nData.wallet_id as string;
    const access_token     = n8nData.apiKey as string ?? n8nData.access_token as string;

    if (!asaas_account_id || !wallet_id || !access_token) {
      console.error("criar-subconta: resposta n8n incompleta:", JSON.stringify(n8nData));
      return new Response(
        JSON.stringify({ error: "Resposta incompleta do Asaas. Verifique o workflow n8n." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. SALVA no banco — access_token protegido (nunca retorna ao frontend)
    const { error: insertError } = await supabase
      .from("asaas_subaccounts")
      .insert({
        user_id: user.id,
        asaas_account_id,
        wallet_id,
        access_token, // armazenado, jamais exposto em logs ou respostas
        name,
        email,
        cpf_cnpj: cpfCnpj,
        status: "active",
      });

    if (insertError) {
      console.error("criar-subconta insert error:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar subconta no banco de dados." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Retorna apenas dados não sensíveis
    return new Response(
      JSON.stringify({
        success: true,
        subconta: {
          asaas_account_id,
          wallet_id,
          status: "active",
        },
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("criar-subconta unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro inesperado no servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
