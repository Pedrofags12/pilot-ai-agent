import { supabase } from "@/integrations/supabase/client";

export interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  region: string | null;
  temperature: "hot" | "warm" | "cold";
  status: "new" | "negotiating" | "converted" | "lost";
  ai_active: boolean;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  role: "user" | "assistant";
  content: string;
  is_ai_response: boolean;
  created_at: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// Session management
export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem("pilot_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("pilot_session_id", sessionId);
  }
  return sessionId;
}

// Leads
export async function getOrCreateLead(sessionId: string): Promise<Lead> {
  // Try to get existing lead
  const { data: existingLead } = await supabase
    .from("leads")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  
  if (existingLead) {
    return existingLead as Lead;
  }
  
  // Create new lead
  const { data: newLead, error } = await supabase
    .from("leads")
    .insert({ session_id: sessionId })
    .select()
    .single();
  
  if (error) throw error;
  return newLead as Lead;
}

export async function updateLead(leadId: string, data: Partial<Lead>): Promise<void> {
  const { error } = await supabase
    .from("leads")
    .update(data)
    .eq("id", leadId);
  
  if (error) throw error;
}

// Conversations
export async function getConversations(leadId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });
  
  if (error) throw error;
  return (data || []) as Conversation[];
}

export async function saveMessage(
  leadId: string,
  role: "user" | "assistant",
  content: string,
  isAiResponse: boolean
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .insert({
      lead_id: leadId,
      role,
      content,
      is_ai_response: isAiResponse,
    });
  
  if (error) throw error;
}

// Chat with AI
export async function streamChat({
  messages,
  sessionId,
  leadId,
  onDelta,
  onDone,
  onError,
}: {
  messages: Message[];
  sessionId: string;
  leadId: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}): Promise<void> {
  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
  
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages, sessionId, leadId }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      onError(errorData.error || "Erro ao conectar com o assistente");
      return;
    }

    if (!resp.body) {
      onError("Resposta vazia do servidor");
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    console.error("Stream chat error:", error);
    onError("Erro de conexão. Tente novamente.");
  }
}

// Generate WhatsApp link
export function generateWhatsAppLink(lead: Lead): string {
  const phone = lead.phone?.replace(/\D/g, "") || "";
  
  const message = encodeURIComponent(
    `Olá ${lead.name || ""}! 👋\n\n` +
    `Aqui está o resumo da sua reserva consultiva Pilot:\n\n` +
    (lead.region ? `📍 Região: ${lead.region}\n` : "") +
    `\nFicou com alguma dúvida? Estou à disposição!`
  );
  
  return `https://wa.me/${phone}?text=${message}`;
}
