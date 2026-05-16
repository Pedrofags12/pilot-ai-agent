import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mapeamento de eventos Asaas → status interno
const ASAAS_STATUS_MAP: Record<string, string> = {
  PENDING:           "pending",
  CONFIRMED:         "confirmed",
  RECEIVED:          "confirmed",
  RECEIVED_IN_CASH:  "confirmed",
  OVERDUE:           "overdue",
  REFUNDED:          "refunded",
  REFUND_REQUESTED:  "refunded",
  CHARGEBACK_REQUESTED: "refunded",
  CANCELLED:         "cancelled",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-n8n-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. AUTH — dupla camada: n8n_key (obrigatório) + assinatura Asaas (quando configurada)
    const n8nKey      = req.headers.get("x-n8n-key") ?? "";
    const authHeader  = req.headers.get("authorization") ?? "";
    const expectedKey = Deno.env.get("n8n_key") ?? "";

    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const isAuthorized =
      (n8nKey && expectedKey && n8nKey === expectedKey) ||
      (token  && expectedKey && token  === expectedKey);

    if (!isAuthorized) {
      // Log sem expor keys — apenas indica tentativa não autorizada
      console.warn("asaas-webhook: tentativa não autorizada bloqueada");
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validação opcional da assinatura do Asaas (token configurado no painel Asaas)
    // Ativa quando ASAAS_WEBHOOK_TOKEN estiver configurado nos secrets
    const asaasWebhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (asaasWebhookToken) {
      const asaasSignature = req.headers.get("asaas-access-token") ?? "";
      if (asaasSignature !== asaasWebhookToken) {
        console.warn("asaas-webhook: assinatura Asaas inválida bloqueada");
        return new Response(
          JSON.stringify({ error: "Assinatura Asaas inválida." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 2. PARSE BODY
    const body = await req.json().catch(() => null);
    if (!body) {
      return new Response(
        JSON.stringify({ error: "Body JSON inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Suporta payload direto do Asaas ou encapsulado pelo n8n
    const event   = body.event   as string;
    const payment = body.payment as Record<string, unknown>;

    if (!event || !payment) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: event, payment." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Ignora eventos que não são de pagamento
    if (!event.startsWith("PAYMENT_")) {
      return new Response(
        JSON.stringify({ success: true, message: "Evento ignorado.", event }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const asaas_payment_id = payment.id as string;
    const asaas_status     = (payment.status as string)?.toUpperCase();
    const net_amount       = payment.netValue as number ?? null;
    const paid_at          = payment.paymentDate
      ? new Date(payment.paymentDate as string).toISOString()
      : null;

    if (!asaas_payment_id || !asaas_status) {
      return new Response(
        JSON.stringify({ error: "payment.id e payment.status são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const internalStatus = ASAAS_STATUS_MAP[asaas_status];
    if (!internalStatus) {
      return new Response(
        JSON.stringify({ success: true, message: `Status Asaas não mapeado: ${asaas_status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 3. BUSCA entrada pelo asaas_payment_id
    const { data: entry } = await supabase
      .from("financial_entries")
      .select("id, status")
      .eq("asaas_payment_id", asaas_payment_id)
      .maybeSingle();

    if (!entry) {
      // Pagamento ainda não está no banco — cria o registro
      const { error: insertErr } = await supabase
        .from("financial_entries")
        .insert({
          asaas_payment_id,
          split_wallet_id: Deno.env.get("ASAAS_WALLET_ID_PAI") ?? "pendente",
          split_percentage: 0,
          type: "income",
          amount: payment.value as number ?? 0,
          net_amount,
          status: internalStatus,
          paid_at,
          origin: "asaas_webhook",
          metadata: payment,
        });

      if (insertErr) {
        console.error("asaas-webhook insert error:", insertErr.message);
        return new Response(
          JSON.stringify({ error: "Erro ao criar registro financeiro." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "created", asaas_payment_id, status: internalStatus }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. ATUALIZA entrada existente
    const updateData: Record<string, unknown> = {
      status: internalStatus,
      updated_at: new Date().toISOString(),
    };
    if (net_amount != null) updateData.net_amount = net_amount;
    if (paid_at)           updateData.paid_at     = paid_at;

    const { error: updateErr } = await supabase
      .from("financial_entries")
      .update(updateData)
      .eq("id", entry.id);

    if (updateErr) {
      console.error("asaas-webhook update error:", updateErr.message);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar registro financeiro." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: "updated",
        asaas_payment_id,
        previous_status: entry.status,
        new_status: internalStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("asaas-webhook unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro inesperado no servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
