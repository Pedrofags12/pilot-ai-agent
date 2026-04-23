import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, Thermometer, Snowflake, Clock } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const tempIcons = { hot: Flame, warm: Thermometer, cold: Snowflake };
const tempColors = { hot: "text-primary", warm: "text-warning", cold: "text-info" };
const tempLabels = { hot: "Quente", warm: "Morno", cold: "Frio" };

interface LeadCalendarProps {
  leads: any[];
  onSelectLead: (lead: any) => void;
}

export function LeadCalendar({ leads, onSelectLead }: LeadCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Days that have leads
  const daysWithLeads = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const key = format(new Date(l.created_at), "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [leads]);

  // Leads for selected date
  const leadsOnDate = useMemo(() => {
    if (!selectedDate) return [];
    return leads
      .filter((l) => isSameDay(new Date(l.created_at), selectedDate))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [leads, selectedDate]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">📅 Calendário de Leads</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Calendar */}
          <div className="shrink-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="p-3 pointer-events-auto rounded-lg border border-border"
              modifiers={{
                hasLeads: (date) => {
                  const key = format(date, "yyyy-MM-dd");
                  return daysWithLeads.has(key);
                },
              }}
              modifiersClassNames={{
                hasLeads: "bg-primary/15 font-bold text-primary",
              }}
            />
          </div>

          {/* Lead list for selected date */}
          <div className="flex-1 min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : "Selecione um dia"}
              </h4>
              {leadsOnDate.length > 0 && (
                <Badge variant="secondary">{leadsOnDate.length} lead{leadsOnDate.length > 1 ? "s" : ""}</Badge>
              )}
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-2 pr-2">
                {leadsOnDate.map((lead) => {
                  const temp = lead.temperature as keyof typeof tempIcons;
                  const TempIcon = tempIcons[temp] || Snowflake;

                  return (
                    <button
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="w-full rounded-lg border border-border bg-card p-3 text-left transition-all hover:bg-muted/50 hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-0.5 rounded-full p-1.5", temp === "hot" ? "bg-primary/10" : temp === "warm" ? "bg-warning/10" : "bg-info/10")}>
                          <TempIcon className={cn("h-4 w-4", tempColors[temp])} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {lead.name || "Visitante"}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(lead.created_at), "HH:mm")}
                            {lead.phone && <span>· {lead.phone}</span>}
                          </div>
                          {lead.notes && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80 italic">
                              {lead.notes}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {tempLabels[temp] || "Frio"}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
                {selectedDate && leadsOnDate.length === 0 && (
                  <div className="rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Nenhum lead neste dia.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
