import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Flame, Thermometer, Snowflake, Trash2, ExternalLink, Phone, MapPin, Clock, CalendarIcon, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const tempConfig = {
  hot: { icon: Flame, label: "Quente", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  warm: { icon: Thermometer, label: "Morno", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  cold: { icon: Snowflake, label: "Frio", color: "text-info", bg: "bg-info/10", border: "border-info/30" },
};

const statusLabels: Record<string, string> = {
  new: "Novo",
  negotiating: "Negociando",
  converted: "Convertido",
  lost: "Perdido",
};

interface LeadDetailDialogProps {
  lead: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (leadId: string) => void;
}

export function LeadDetailDialog({ lead, open, onOpenChange, onDeleted }: LeadDetailDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!lead) return null;

  const temp = tempConfig[lead.temperature as keyof typeof tempConfig] || tempConfig.cold;
  const TempIcon = temp.icon;

  const formatWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `https://wa.me/55${cleaned}`;
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete conversations first (FK dependency)
      await supabase.from("conversations").delete().eq("lead_id", lead.id);
      // Delete the lead
      const { error } = await supabase.from("leads").delete().eq("id", lead.id);
      if (error) throw error;

      toast.success("Lead e conversas deletados com sucesso");
      onDeleted(lead.id);
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro ao deletar lead");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={cn("rounded-full p-2", temp.bg)}>
              <TempIcon className={cn("h-5 w-5", temp.color)} />
            </div>
            <div>
              <span className="text-xl">{lead.name || "Visitante"}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn("text-xs", temp.border, temp.color)}>
                  {temp.label}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {statusLabels[lead.status] || lead.status}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Separator />

        <div className="space-y-4 py-2">
          {/* Contact */}
          {lead.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={formatWhatsAppLink(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-success hover:underline"
              >
                {lead.phone}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Region */}
          {lead.region && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{lead.region}</span>
            </div>
          )}

          {/* Date/Time */}
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              {format(new Date(lead.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Session */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-mono">
              Sessão: {lead.session_id?.slice(0, 12)}...
            </span>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Notas da IA</span>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground leading-relaxed">
                {lead.notes}
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Deletar Lead
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso irá excluir permanentemente o lead <strong>{lead.name || "Visitante"}</strong> e todo o histórico de conversas com a IA. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, deletar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
