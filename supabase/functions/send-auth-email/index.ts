/**
 * send-auth-email — Supabase Auth Hook (Send Email)
 *
 * Registrar no painel: Authentication → Hooks → Send Email Hook
 * Endpoint: https://prptyyuvwyusfucroitd.supabase.co/functions/v1/send-auth-email
 *
 * Variáveis de ambiente necessárias (Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY         re_...
 *   RESEND_FROM_EMAIL      noreply@agentepilot.com
 *   RESEND_FROM_NAME       Pilot AI
 *   APP_URL                https://www.agentepilot.com
 *   SUPABASE_WEBHOOK_SECRET  (gerado automaticamente ao ativar o hook)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ── Env ─────────────────────────────────────────────────────────
const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY")      ?? "";
const FROM_EMAIL      = Deno.env.get("RESEND_FROM_EMAIL")   ?? "noreply@agentepilot.com";
const FROM_NAME       = Deno.env.get("RESEND_FROM_NAME")    ?? "Pilot AI";
const APP_URL         = Deno.env.get("APP_URL")             ?? "https://www.agentepilot.com";

// ── Types ────────────────────────────────────────────────────────
type EmailActionType =
  | "signup"
  | "magiclink"
  | "recovery"
  | "email_change_current"
  | "email_change_new"
  | "reauthentication";

interface AuthHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, string>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: EmailActionType;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

// ── Link builder ─────────────────────────────────────────────────
function buildConfirmUrl(
  tokenHash: string,
  type: EmailActionType,
  redirectTo: string,
): string {
  const base = `${APP_URL}/auth/callback`;
  const next = redirectTo
    ? `&next=${encodeURIComponent(redirectTo)}`
    : "";
  return `${base}?token_hash=${tokenHash}&type=${type}${next}`;
}

// ── HTML templates ────────────────────────────────────────────────
const baseStyle = `
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  background:#09090b;color:#fafafa;padding:40px 20px;margin:0
`.trim();

const cardStyle = `
  max-width:480px;margin:0 auto;background:#18181b;
  border:1px solid #27272a;border-radius:12px;padding:40px
`.trim();

const logoStyle = `
  display:inline-flex;align-items:center;justify-content:center;
  width:48px;height:48px;background:#7c3aed;border-radius:10px;margin-bottom:16px
`.trim();

const btnStyle = `
  display:block;text-align:center;background:#7c3aed;color:#fff;
  font-size:15px;font-weight:600;padding:14px 24px;
  border-radius:8px;text-decoration:none;margin-bottom:24px
`.trim();

const footerStyle = `color:#71717a;font-size:12px;text-align:center;margin:0`.trim();

function emailShell(title: string, greeting: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <div style="text-align:center;margin-bottom:32px">
      <div style="${logoStyle}">
        <span style="color:#fff;font-size:20px;font-weight:700">P</span>
      </div>
      <h1 style="color:#fafafa;font-size:22px;font-weight:700;margin:0 0 8px">${title}</h1>
      <p style="color:#a1a1aa;font-size:14px;margin:0">${greeting}</p>
    </div>
    ${body}
  </div>
</body>
</html>`;
}

function signupHtml(name: string, url: string): string {
  return emailShell(
    "Confirme seu e-mail",
    `Olá${name ? `, ${name}` : ""}! Confirme seu endereço de e-mail para ativar sua conta.`,
    `<a href="${url}" style="${btnStyle}">Confirmar e-mail</a>
     <p style="${footerStyle}">Este link expira em 24 horas.<br>Se você não criou uma conta, ignore este e-mail.</p>`,
  );
}

function magicLinkHtml(name: string, url: string): string {
  return emailShell(
    "Seu link de acesso",
    `Olá${name ? `, ${name}` : ""}! Clique no botão abaixo para acessar o Pilot AI.`,
    `<a href="${url}" style="${btnStyle}">Acessar o Pilot AI</a>
     <p style="${footerStyle}">Este link expira em 1 hora e só pode ser usado uma vez.<br>Se você não solicitou este acesso, ignore este e-mail.</p>`,
  );
}

function recoveryHtml(name: string, url: string): string {
  return emailShell(
    "Redefinir senha",
    `Olá${name ? `, ${name}` : ""}! Clique abaixo para criar uma nova senha.`,
    `<a href="${url}" style="${btnStyle}">Redefinir minha senha</a>
     <p style="${footerStyle}">Este link expira em 1 hora.<br>Se você não solicitou a redefinição, sua senha permanece a mesma.</p>`,
  );
}

// ── Resend call ──────────────────────────────────────────────────
async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    // Sem key configurada: loga e segue (não quebra o fluxo de auth)
    console.warn("[send-auth-email] RESEND_API_KEY não configurada — e-mail não enviado.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

// ── Handler ──────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: AuthHookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { user, email_data } = payload;

  if (!user?.email || !email_data?.email_action_type) {
    return new Response("Missing required fields", { status: 400 });
  }

  const name        = user.user_metadata?.full_name ?? "";
  const actionType  = email_data.email_action_type;
  const confirmUrl  = buildConfirmUrl(
    email_data.token_hash,
    actionType,
    email_data.redirect_to,
  );

  try {
    switch (actionType) {
      case "signup":
        await sendEmail(
          user.email,
          "Confirme seu e-mail — Pilot AI",
          signupHtml(name, confirmUrl),
        );
        break;

      case "magiclink":
        await sendEmail(
          user.email,
          "Seu link de acesso ao Pilot AI",
          magicLinkHtml(name, confirmUrl),
        );
        break;

      case "recovery":
        await sendEmail(
          user.email,
          "Redefinir senha — Pilot AI",
          recoveryHtml(name, confirmUrl),
        );
        break;

      default:
        // email_change, reauthentication — log e ignora (não quebra o fluxo)
        console.log(`[send-auth-email] Tipo não tratado: ${actionType}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[send-auth-email] Erro:", err);
    // Retorna 200 mesmo em erro para não bloquear o fluxo de auth do Supabase
    // O Supabase interpreta qualquer status ≠ 200 como falha e cancela a operação
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
