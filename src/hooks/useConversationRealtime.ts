import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  lead_id: string;
  content: string;
  role: string;
  is_ai_response: boolean;
  created_at: string;
}

// Sound notification for hot leads
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 880; // A5 note
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log("Audio not supported");
  }
};

interface UseConversationRealtimeOptions {
  leadId: string | null;
  onNewMessage: (message: Message) => void;
  onHotLead?: () => void;
}

interface Lead {
  id: string;
  ai_active: boolean;
  [key: string]: unknown;
}

export function useConversationRealtime({
  leadId,
  onNewMessage,
  onHotLead,
  onLeadUpdate,
}: UseConversationRealtimeOptions & { onLeadUpdate?: (lead: Lead) => void }) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!leadId) return;

    // Subscribe to new messages + lead updates for this lead
    const channel = supabase
      .channel(`conversation:${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `lead_id=eq.${leadId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          onNewMessage(newMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
          filter: `id=eq.${leadId}`,
        },
        (payload) => {
          if (onLeadUpdate) {
            onLeadUpdate(payload.new as Lead);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [leadId, onNewMessage, onLeadUpdate]);

  return { playNotificationSound };
}

// Hook for listening to all leads for hot notifications
export function useHotLeadNotifications(leads: any[], enabled: boolean = true) {
  const lastLeadCountRef = useRef(leads.length);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Check for new hot leads
    const hotLeads = leads.filter(l => l.temperature === "hot");
    const currentCount = hotLeads.length;
    
    if (currentCount > lastLeadCountRef.current) {
      playNotificationSound();
    }
    
    lastLeadCountRef.current = currentCount;
  }, [leads, enabled]);
}
