import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Clock, Users, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EditarMensagemDialog, type ScheduledMessage } from "./EditarMensagemDialog";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Agendada",  variant: "secondary" },
  sent:      { label: "Enviada",   variant: "default" },
  failed:    { label: "Falhou",    variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export function MensagensAgendadas() {
  const [messages, setMessages]       = useState<ScheduledMessage[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editMsg, setEditMsg]         = useState<ScheduledMessage | null>(null);
  const [editOpen, setEditOpen]       = useState(false);
  const [deleteMsg, setDeleteMsg]     = useState<ScheduledMessage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("scheduled_messages")
      .select(`
        id, client_id, group_name, message, scheduled_at, status,
        clients ( name )
      `)
      .order("scheduled_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m: any) => ({
          ...m,
          client_name: m.clients?.name ?? null,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function handleDelete() {
    if (!deleteMsg) return;
    setDeleteLoading(true);
    const { error } = await supabase
      .from("scheduled_messages")
      .delete()
      .eq("id", deleteMsg.id);

    if (error) {
      toast.error("Erro ao excluir mensagem.");
    } else {
      toast.success("Mensagem excluída.");
      setMessages((prev) => prev.filter((m) => m.id !== deleteMsg.id));
    }
    setDeleteLoading(false);
    setDeleteMsg(null);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="font-medium text-muted-foreground">Nenhuma mensagem agendada</p>
        <p className="mt-1 text-sm text-muted-foreground">As mensagens criadas nos fluxos n8n aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Destinatário</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Mensagem</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Agendado para</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((msg) => {
              const status = STATUS_MAP[msg.status] ?? STATUS_MAP.pending;
              const isOverdue = msg.status === "pending" && isPast(parseISO(msg.scheduled_at));
              return (
                <tr key={msg.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {msg.client_id
                        ? <><User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{msg.client_name ?? "Cliente"}</>
                        : <><Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />{msg.group_name ?? "Grupo"}</>
                      }
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <p className="truncate text-sm text-muted-foreground">{msg.message}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {format(parseISO(msg.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {isOverdue && <span className="ml-1 text-xs">(atrasada)</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => { setEditMsg(msg); setEditOpen(true); }}
                        title="Editar"
                        disabled={msg.status !== "pending"}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteMsg(msg)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditarMensagemDialog
        message={editMsg}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={fetchMessages}
      />

      <AlertDialog open={!!deleteMsg} onOpenChange={(o) => !o && setDeleteMsg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem agendada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A mensagem será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
