import { useState, DragEvent } from "react";
import { Flame, Thermometer, Snowflake, ExternalLink, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Temperature = "hot" | "warm" | "cold";

const columns: { key: Temperature; label: string; icon: typeof Flame; colorClass: string; bgClass: string; borderClass: string }[] = [
  { key: "hot", label: "Quente 🔥", icon: Flame, colorClass: "text-primary", bgClass: "bg-primary/5", borderClass: "border-t-primary" },
  { key: "warm", label: "Morno 🌡️", icon: Thermometer, colorClass: "text-warning", bgClass: "bg-warning/5", borderClass: "border-t-warning" },
  { key: "cold", label: "Frio ❄️", icon: Snowflake, colorClass: "text-info", bgClass: "bg-info/5", borderClass: "border-t-info" },
];

interface LeadKanbanProps {
  leads: any[];
  onTemperatureChange: (leadId: string, newTemp: Temperature) => void;
}

export function LeadKanban({ leads, onTemperatureChange }: LeadKanbanProps) {
  const [dragOverCol, setDragOverCol] = useState<Temperature | null>(null);

  const handleDragStart = (e: DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, col: Temperature) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(col);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e: DragEvent, newTemp: Temperature) => {
    e.preventDefault();
    setDragOverCol(null);
    const leadId = e.dataTransfer.getData("leadId");
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.temperature === newTemp) return;

    // Optimistic update
    onTemperatureChange(leadId, newTemp);

    const { data, error } = await supabase.functions.invoke("update-lead-status", {
      body: { lead_id: leadId, status: newTemp },
    });

    if (error || (data && data.error)) {
      console.error("Erro ao atualizar lead:", error || data?.error);
      toast.error("Erro ao atualizar temperatura do lead");
      // Revert
      onTemperatureChange(leadId, lead.temperature);
    } else {
      const labels: Record<Temperature, string> = { hot: "Quente", warm: "Morno", cold: "Frio" };
      toast.success(`Lead movido para ${labels[newTemp]}`);
    }
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return `https://wa.me/55${cleaned}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {columns.map((col) => {
        const colLeads = leads.filter((l) => l.temperature === col.key);
        const Icon = col.icon;
        return (
          <Card
            key={col.key}
            className={cn(
              "border-t-4 transition-all",
              col.borderClass,
              dragOverCol === col.key && "ring-2 ring-primary/30 scale-[1.01]"
            )}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <CardHeader className={cn("pb-3", col.bgClass)}>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Icon className={cn("h-5 w-5", col.colorClass)} />
                  {col.label}
                </span>
                <Badge variant="secondary">{colLeads.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 p-1 pr-3">
                  {colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className="cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing active:shadow-lg"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {lead.name || "Visitante"}
                          </p>
                          {lead.phone && (
                            <a
                              href={formatWhatsAppLink(lead.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📱 {lead.phone}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          <p className="text-xs text-muted-foreground/70">
                            {format(new Date(lead.created_at), "dd MMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="rounded-lg border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      Arraste leads aqui
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
