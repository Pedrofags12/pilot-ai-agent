import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { List, Columns3, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadFilters } from "@/components/admin/oportunidades/LeadFilters";
import { LeadTable } from "@/components/admin/oportunidades/LeadTable";
import { LeadKanban } from "@/components/admin/oportunidades/LeadKanban";
import { LeadCalendar } from "@/components/admin/oportunidades/LeadCalendar";
import { LeadDetailDialog } from "@/components/admin/oportunidades/LeadDetailDialog";
import type { DateRange } from "react-day-picker";
import { isWithinInterval, startOfDay, endOfDay } from "date-fns";

export default function Oportunidades() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban" | "calendar">("list");

  // Filters
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [temperatureFilter, setTemperatureFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Detail dialog
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then((leadsRes) => {
        setLeads(leadsRes.data || []);
        setLoading(false);
      });
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (nameFilter) count++;
    if (phoneFilter) count++;
    if (temperatureFilter !== "all") count++;
    if (dateRange?.from) count++;
    return count;
  }, [nameFilter, phoneFilter, temperatureFilter, dateRange]);

  const clearFilters = () => {
    setNameFilter("");
    setPhoneFilter("");
    setTemperatureFilter("all");
    setDateRange(undefined);
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (nameFilter && !(lead.name || "").toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (phoneFilter && !(lead.phone || "").includes(phoneFilter)) return false;
      if (temperatureFilter !== "all" && lead.temperature !== temperatureFilter) return false;
      if (dateRange?.from) {
        const created = new Date(lead.created_at);
        const from = startOfDay(dateRange.from);
        const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
        if (!isWithinInterval(created, { start: from, end: to })) return false;
      }
      return true;
    });
  }, [leads, nameFilter, phoneFilter, temperatureFilter, dateRange]);

  const handleTemperatureChange = useCallback((leadId: string, newTemp: string) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, temperature: newTemp } : l))
    );
  }, []);

  const handleSelectLead = useCallback((lead: any) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  }, []);

  const handleLeadDeleted = useCallback((leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-72" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-32" />)}
        </div>
        <Card><CardContent className="p-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border p-4">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Oportunidades</h2>
          <p className="text-base text-muted-foreground">
            Leads qualificados pela IA, prontos para você entrar em contato.
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" /> Lista
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <Columns3 className="h-4 w-4" /> Kanban
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" /> Calendário
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <LeadFilters
        nameFilter={nameFilter} setNameFilter={setNameFilter}
        phoneFilter={phoneFilter} setPhoneFilter={setPhoneFilter}
        temperatureFilter={temperatureFilter} setTemperatureFilter={setTemperatureFilter}
        dateRange={dateRange} setDateRange={setDateRange}
        onClear={clearFilters}
        activeCount={activeFilterCount}
      />

      {view === "list" && <LeadTable leads={filteredLeads} onSelectLead={handleSelectLead} />}
      {view === "kanban" && <LeadKanban leads={filteredLeads} onTemperatureChange={handleTemperatureChange} />}
      {view === "calendar" && <LeadCalendar leads={filteredLeads} onSelectLead={handleSelectLead} />}

      <LeadDetailDialog
        lead={selectedLead}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={handleLeadDeleted}
      />
    </div>
  );
}
