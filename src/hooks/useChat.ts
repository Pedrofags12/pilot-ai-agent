import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Message, 
  Lead, 
  getOrCreateSessionId, 
  getOrCreateLead, 
  getConversations, 
  saveMessage, 
  streamChat,
} from "@/lib/api";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");
  

  // Initialize session and load history
  useEffect(() => {
    async function init() {
      try {
        const sessionId = getOrCreateSessionId();
        sessionIdRef.current = sessionId;
        
        const leadData = await getOrCreateLead(sessionId);
        setLead(leadData);
        
        // Load conversation history
        const conversations = await getConversations(leadData.id);
        if (conversations.length > 0) {
          const history: Message[] = conversations.map((c) => ({
            role: c.role as "user" | "assistant",
            content: c.content,
          }));
          setMessages(history);
        }
      } catch (err) {
        console.error("Failed to initialize chat:", err);
        setError("Erro ao carregar o chat. Recarregue a página.");
      }
    }
    init();
  }, []);

  const sendMessage = useCallback(async (input: string) => {
    if (!lead || !input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    // Save user message
    await saveMessage(lead.id, "user", input.trim(), false);

    let assistantSoFar = "";
    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        sessionId: sessionIdRef.current,
        leadId: lead.id,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: async () => {
          setIsLoading(false);
          
          // Save assistant message
          if (assistantSoFar) {
            await saveMessage(lead.id, "assistant", assistantSoFar, true);
          }
        },
        onError: (errMsg) => {
          setError(errMsg);
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error("Send message error:", err);
      setError("Erro ao enviar mensagem. Tente novamente.");
      setIsLoading(false);
    }
  }, [lead, messages, isLoading]);

  return {
    messages,
    isLoading,
    lead,
    error,
    sendMessage,
  };
}
