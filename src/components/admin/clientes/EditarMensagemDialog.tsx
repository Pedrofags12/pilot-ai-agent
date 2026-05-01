import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScheduledMessage {
  id: string;
  client_id: string | null;
  group_name: string | null;
  message: string;
  scheduled_at: string;
  status: string;
  client_name?: string | null;
}

interface Props {
  message: ScheduledMessage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditarMensagemDialog({ message, open, onOpenChange, onSuccess }: Props) {
  const [text, setText]             = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [groupName, setGroupName]   = useState("");
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (message && open) {
      setText(message.message);
      setScheduledAt(message.scheduled_at.slice(0, 16)); // datetime-local format
      setGroupName(message.group_name ?? "");
    }
  }, [message, open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!message) return;
    if (!text.trim()) { toast.error("A mensagem não pode estar vazia."); return; }
    if (!scheduledAt)  { toast.error("Informe a data e hora do agendamento."); return; }

    setLoading(true);
    const { error } = await supabase
      .from("scheduled_messages")
      .update({
        message:      text.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        group_name:   groupName.trim() || null,
      })
      .eq("id", message.id);

    if (error) {
      toast.error("Erro ao salvar alterações.");
    } else {
      toast.success("Mensagem atualizada com sucesso!");
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Mensagem Agendada</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="msg-text">Mensagem</Label>
            <Textarea
              id="msg-text"
              rows={4}
              placeholder="Texto da mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-group">Grupo / Destinatário</Label>
            <Input
              id="msg-group"
              placeholder="Nome do grupo (opcional)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-date">Data e hora do envio</Label>
            <Input
              id="msg-date"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
