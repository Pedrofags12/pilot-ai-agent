import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Phone, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

import {
  ConversationList,
  MessageBubble,
  AIToggle,
  AIStatusBanner,
  ResponseTemplates,
  EmojiPicker,
} from "@/components/admin/conversations";
import { useConversationRealtime, useHotLeadNotifications } from "@/hooks/useConversationRealtime";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  session_id: string;
  temperature: "hot" | "warm" | "cold";
  ai_active: boolean;
  status: string;
  updated_at: string;
}

interface Message {
  id: string;
  lead_id: string;
  content: string;
  role: string;
  is_ai_response: boolean;
  created_at: string;
}

export default function Conversas() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [unreadLeads, setUnreadLeads] = useState<Set<string>>(new Set());
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [readTimestamps, setReadTimestamps] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("chat_read_timestamps") || "{}"); } catch { return {}; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const selectedLead = leads.find((l) => l.id === selected);

  useHotLeadNotifications(leads, true);

  // Fetch leads and last messages in a single optimized query
  useEffect(() => {
    async function fetchData() {
      // Fetch leads
      const { data: leadsData } = await supabase
        .from("leads")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (leadsData) {
        setLeads(leadsData as Lead[]);
      }

      if (leadsData && leadsData.length > 0) {
        // Single query: get last messages + unread counts using a batch approach
        const leadIds = leadsData.map((l) => l.id);
        const savedTimestamps = readTimestamps;

        // Fetch recent conversations for all leads at once (batch, not N+1)
        const { data: allConvos } = await supabase
          .from("conversations")
          .select("lead_id, content, created_at, role")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
          .limit(500);

        const msgMap: Record<string, string> = {};
        const countMap: Record<string, number> = {};
        const unreadSet = new Set<string>();
        const seenLeads = new Set<string>();

        (allConvos || []).forEach((msg) => {
          // First message per lead = last message
          if (!seenLeads.has(msg.lead_id)) {
            msgMap[msg.lead_id] = msg.content;
            seenLeads.add(msg.lead_id);
          }
          // Count unread user messages
          if (msg.role === "user") {
            const lastRead = savedTimestamps[msg.lead_id];
            if (!lastRead || msg.created_at > lastRead) {
              countMap[msg.lead_id] = (countMap[msg.lead_id] || 0) + 1;
              unreadSet.add(msg.lead_id);
            }
          }
        });

        setLastMessages(msgMap);
        setUnreadCounts(countMap);
        setUnreadLeads(unreadSet);
      }
    }
    fetchData();
  }, []);

  // Fetch messages when lead is selected & mark as read
  useEffect(() => {
    if (!selected) return;
    async function fetchMessages() {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .eq("lead_id", selected)
        .order("created_at");
      if (data) setMessages(data);

      // Mark as read
      const now = new Date().toISOString();
      setReadTimestamps((prev) => {
        const updated = { ...prev, [selected]: now };
        localStorage.setItem("chat_read_timestamps", JSON.stringify(updated));
        return updated;
      });
      setUnreadLeads((prev) => { const next = new Set(prev); next.delete(selected); return next; });
      setUnreadCounts((prev) => ({ ...prev, [selected]: 0 }));
    }
    fetchMessages();
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewMessage = useCallback((newMsg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev;
      return [...prev, newMsg];
    });
    setLastMessages((prev) => ({ ...prev, [newMsg.lead_id]: newMsg.content }));

    // If message is from user and not the currently selected lead, increment unread
    if (newMsg.role === "user" && newMsg.lead_id !== selected) {
      setUnreadCounts((prev) => ({ ...prev, [newMsg.lead_id]: (prev[newMsg.lead_id] || 0) + 1 }));
      setUnreadLeads((prev) => new Set(prev).add(newMsg.lead_id));
    }
  }, [selected]);

  const handleLeadUpdate = useCallback((updatedLead: { id: string; ai_active: boolean; [key: string]: unknown }) => {
    console.log("[Conversas] Lead update received via realtime:", updatedLead.id, "ai_active:", updatedLead.ai_active);
    setLeads((prev) => prev.map((l) => l.id === updatedLead.id ? { ...l, ...updatedLead } as Lead : l));
  }, []);

  useConversationRealtime({ leadId: selected, onNewMessage: handleNewMessage, onLeadUpdate: handleLeadUpdate });

  const toggleAI = async () => {
    if (!selectedLead || !selected) return;
    const newState = !selectedLead.ai_active;
    console.log("[toggleAI] Toggling AI for lead:", selected, "from", selectedLead.ai_active, "to", newState);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-conversation-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ lead_id: selected, is_ai_response: newState }),
        }
      );
      const resBody = await res.json();
      console.log("[toggleAI] Response:", res.status, resBody);
      if (res.ok) {
        setLeads((prev) => prev.map((l) => (l.id === selected ? { ...l, ai_active: newState } : l)));
        toast({
          title: newState ? "IA Reativada" : "Você assumiu a conversa",
          description: newState ? "A IA Pilot voltará a responder automaticamente." : "Agora você está no controle do chat.",
        });
      } else {
        toast({ title: "Erro", description: resBody.error || "Erro ao alterar status da IA", variant: "destructive" });
      }
    } catch (e) {
      console.error("toggleAI error:", e);
      toast({ title: "Erro", description: "Falha ao alterar status da IA.", variant: "destructive" });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selected || sending) return;
    setSending(true);
    const msgToSend = newMessage.trim();
    setNewMessage("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-conversation-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ lead_id: selected, is_ai_response: false, message: msgToSend }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Erro ao enviar", description: err.error || "Erro desconhecido", variant: "destructive" });
        setNewMessage(msgToSend);
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao enviar mensagem.", variant: "destructive" });
      setNewMessage(msgToSend);
    }
    setSending(false);
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await supabase.from("conversations").delete().eq("lead_id", leadId);
      await supabase.from("leads").delete().eq("id", leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      if (selected === leadId) {
        setMessages([]);
        setSelected(null);
      }
      sonnerToast.success("Conversa e lead deletados com sucesso");
    } catch {
      sonnerToast.error("Erro ao deletar conversa");
    }
  };

  const handleDeleteChat = async () => {
    if (!selected) return;
    setDeleting(true);
    await handleDeleteLead(selected);
    setDeleting(false);
  };

  const handleTemplateSelect = (content: string) => setNewMessage((prev) => prev + content);
  const handleEmojiSelect = (emoji: string) => setNewMessage((prev) => prev + emoji);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Conversas</h2>
        <p className="text-base text-muted-foreground">
          Acompanhe as conversas em tempo real e assuma quando necessário.
        </p>
      </div>

      <div className="flex h-[calc(100vh-16rem)] gap-4 lg:gap-6">
        <ConversationList
          leads={leads}
          selectedId={selected}
          onSelect={setSelected}
          onDelete={handleDeleteLead}
          lastMessages={lastMessages}
          unreadLeads={unreadLeads}
          unreadCounts={unreadCounts}
        />

        <Card className="flex flex-1 flex-col overflow-hidden">
          {selected && selectedLead ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border p-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold truncate">{selectedLead.name || "Visitante"}</h3>
                  </div>
                  {selectedLead.phone && (
                    <a href={`https://wa.me/55${selectedLead.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="h-3.5 w-3.5" />{selectedLead.phone}
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <AIToggle isAiActive={selectedLead.ai_active} onToggle={toggleAI} />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs text-destructive hover:text-destructive" disabled={deleting}>
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar conversa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá excluir permanentemente o lead <strong>{selectedLead.name || "Visitante"}</strong> e todo o histórico de mensagens. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sim, deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>

              <AIStatusBanner isAiActive={selectedLead.ai_active} />

              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full p-4 lg:p-6">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} content={msg.content} role={msg.role as "user" | "assistant"} isAiResponse={msg.is_ai_response} createdAt={msg.created_at} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
              </CardContent>

              <div className="border-t border-border p-4">
                {selectedLead.ai_active ? (
                  <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                    <span className="text-sm">🤖 A IA está respondendo. Clique em "Pausar IA" para enviar mensagens.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ResponseTemplates onSelectTemplate={handleTemplateSelect} disabled={sending} />
                    </div>
                    <div className="flex gap-3">
                      <EmojiPicker onSelect={handleEmojiSelect} disabled={sending} />
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        className="min-h-[40px] flex-1 text-sm resize-none"
                        rows={1}
                      />
                      <Button onClick={sendMessage} disabled={!newMessage.trim() || sending} size="sm" className="gap-1.5 text-xs">
                        <Send className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Enviar</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
              <div className="text-6xl">💬</div>
              <p className="text-lg">Selecione uma conversa para visualizar</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
