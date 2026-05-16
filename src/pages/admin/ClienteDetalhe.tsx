import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Phone, MapPin, CalendarDays, Tag,
  Clock, User, Users, Pencil, Trash2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CobrancaCard } from "@/components/admin/clientes/CobrancaCard";
import { EditarMensagemDialog, type ScheduledMessage } from "@/components/admin/clientes/EditarMensagemDialog";

interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  region: string | null;
  tags: string[] | null;
  created_at: string;
  user_id: string;
}

const MSG_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Agendada",  variant: "secondary" },
  sent:      { label: "Enviada",   variant: "default" },
  failed:    { label: "Falhou",    variant: "destructive" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

export default function ClienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient]       = useState<Client | null>(null);
  const [loading, setLoading]     = useState(true);
  const [userId, setUserId]       = useState<string>("");

  // Mensagens agendadas deste cliente
  const [messages, setMessages]           = useState<ScheduledMessage[]>([]);
  const [msgsLoading, setMsgsLoading]     = useState(true);
  const [editMsg, setEditMsg]             = useState<ScheduledMessage | null>(null);
  const [editOpen, setEditOpen]           = useState(false);
  const [deleteMsg, setDeleteMsg]         = useState<ScheduledMessage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch cliente ──────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: session }, { data: clientData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from("clients")
          .select("id, name, phone, region, tags, created_at, user_id")
          .eq("id", id)
          .single(),
      ]);

      if (!clientData) {
        toast.error("Cliente não encontrado.");
        navigate("/admin/clientes");
        return;
      }
      setClient(clientData as Client);
      setUserId(session?.session?.user?.id ?? clientData.user_id);
      setLoading(false);
    })();
  }, [id, navigate]);

  // ── Fetch mensagens agendadas deste cliente ────────────────────
  const fetchMessages = async () => {
    if (!id) return;
    setMsgsLoading(true);
    const { data } = await supabase
      .from("scheduled_messages")
      .select("id, client_id, group_name, message, scheduled_at, status")
      .eq("client_id", id)
      .order("scheduled_at", { ascending: true });

    if (data) {
      setMessages(
        data.map((m: any) => ({
          ...m,
          client_name: client?.name ?? null,
        }))
      );
    }
    setMsgsLoading(false);
  };

  useEffect(() => {
    if (!loading && client) fetchMessages();
  }, [loading, client]);

  // ── Delete mensagem ────────────────────────────────────────────
  async function handleDeleteMsg() {
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

  // ── Loading skeleton ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) return null;

  const tags: string[] = client.tags ?? [];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb / Back ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost" size="sm"
          className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/admin/clientes")}
        >
          <ArrowLeft className="h-4 w-4" />
          Clientes
        </Button>
      </div>

      {/* ── Client header card ── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Avatar + info */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary select-none">
              {(client.name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground leading-tight">
                {client.name ?? "Sem nome"}
              </h2>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {client.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {client.phone}
                  </span>
                )}
                {client.region && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {client.region}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  Cadastrado em {format(parseISO(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>

              {/* Tags — compact / minimalistas */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                    >
                      <Tag className="h-3 w-3 shrink-0" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout (lg+) ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">

        {/* ── Left: Mensagens Agendadas deste cliente ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Mensagens Agendadas</h3>
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{messages.length}</Badge>
            )}
          </div>

          {msgsLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
              <Clock className="mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Nenhuma mensagem agendada</p>
              <p className="mt-0.5 text-xs text-muted-foreground">As mensagens criadas nos fluxos n8n aparecem aqui.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Mensagem</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground whitespace-nowrap">Agendado para</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((msg) => {
                    const st = MSG_STATUS_MAP[msg.status] ?? MSG_STATUS_MAP.pending;
                    const isOverdue = msg.status === "pending" && isPast(parseISO(msg.scheduled_at));
                    return (
                      <tr key={msg.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 max-w-[240px]">
                          <p className="truncate text-sm text-muted-foreground">{msg.message}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {format(parseISO(msg.scheduled_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            {isOverdue && <span className="ml-1 text-xs">(atrasada)</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              disabled={msg.status !== "pending"}
                              onClick={() => { setEditMsg(msg); setEditOpen(true); }}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteMsg(msg)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Right: CobrancaCard ── */}
        <div>
          <CobrancaCard
            clientId={client.id}
            clientName={client.name}
            userId={userId}
          />
        </div>
      </div>

      {/* ── Dialogs ── */}
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
              onClick={handleDeleteMsg}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
