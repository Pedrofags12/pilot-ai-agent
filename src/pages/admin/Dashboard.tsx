import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Flame, MessageCircle, Sparkles, TrendingUp, Target, CalendarIcon, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DailyData {
  date: string;
  label: string;
  count: number;
}

interface FunnelData {
  name: string;
  value: number;
  color: string;
}

interface Lead {
  temperature: string;
  created_at: string;
  status: string;
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [todayMessages, setTodayMessages] = useState(0);
  const [todayLeadIds, setTodayLeadIds] = useState(0);
  const [loading, setLoading] = useState(true);

  // Chart filters
  const [chartDateRange, setChartDateRange] = useState<DateRange | undefined>();
  const [chartMinCount, setChartMinCount] = useState("");
  const [chartMaxCount, setChartMaxCount] = useState("");
  const [showChartFilters, setShowChartFilters] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      try {
        const today = startOfDay(new Date());
        const todayISO = format(today, "yyyy-MM-dd");

        // Parallel fetches
        const [leadsRes, msgsCountRes, todayMsgsRes] = await Promise.all([
          supabase.from("leads").select("temperature, created_at, status").limit(1000),
          supabase.from("conversations").select("*", { count: "exact", head: true }),
          supabase.from("conversations").select("lead_id").gte("created_at", todayISO + "T00:00:00"),
        ]);

        if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
        setTotalMessages(msgsCountRes.count || 0);

        const todayMsgLeads = new Set(todayMsgsRes.data?.map((m) => m.lead_id) || []);
        setTodayMessages(todayMsgsRes.data?.length || 0);
        setTodayLeadIds(todayMsgLeads.size);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  // Derived stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const todayLeads = leads.filter((l) => new Date(l.created_at) >= today);

    return {
      total: leads.length,
      hot: leads.filter((l) => l.temperature === "hot").length,
      warm: leads.filter((l) => l.temperature === "warm").length,
      cold: leads.filter((l) => l.temperature === "cold").length,
      todayLeads: todayLeads.length,
      todayHot: todayLeads.filter((l) => l.temperature === "hot").length,
      todayConversions: todayLeads.filter((l) => l.status === "converted").length,
      statusNew: leads.filter((l) => l.status === "new").length,
      statusNegotiating: leads.filter((l) => l.status === "negotiating").length,
      statusConverted: leads.filter((l) => l.status === "converted").length,
      statusLost: leads.filter((l) => l.status === "lost").length,
    };
  }, [leads]);

  // 30-day chart data with filters
  const chartData = useMemo(() => {
    const from = chartDateRange?.from || subDays(new Date(), 29);
    const to = chartDateRange?.to || new Date();
    const minCount = parseInt(chartMinCount) || 0;
    const maxCount = parseInt(chartMaxCount) || Infinity;

    const days: DailyData[] = [];
    let current = startOfDay(from);
    const end = startOfDay(to);

    while (current <= end) {
      const dateStr = format(current, "yyyy-MM-dd");
      const count = leads.filter((l) => format(new Date(l.created_at), "yyyy-MM-dd") === dateStr).length;

      if (count >= minCount && count <= maxCount) {
        days.push({
          date: dateStr,
          label: format(current, "dd/MM", { locale: ptBR }),
          count,
        });
      }
      current = new Date(current.getTime() + 86400000);
    }
    return days;
  }, [leads, chartDateRange, chartMinCount, chartMaxCount]);

  const todayHoursSaved = Math.round((todayMessages * 2) / 60);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const funnelData: FunnelData[] = [
    { name: "Novos", value: stats.statusNew, color: "hsl(var(--primary))" },
    { name: "Negociando", value: stats.statusNegotiating, color: "hsl(45, 93%, 47%)" },
    { name: "Convertidos", value: stats.statusConverted, color: "hsl(142, 71%, 45%)" },
    { name: "Perdidos", value: stats.statusLost, color: "hsl(var(--muted-foreground))" },
  ].filter(d => d.value > 0);

  const conversionRate = stats.total > 0 ? Math.round((stats.statusConverted / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Olá! 👋</h2>
        <p className="text-lg text-muted-foreground">Veja o que a Pilot fez pelo seu negócio hoje.</p>
      </div>

      {/* Daily Recap */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="flex items-start gap-4 p-6 lg:p-8">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Resumo do Dia</h3>
            <p className="text-base leading-relaxed text-muted-foreground lg:text-lg">
              Hoje atendemos <strong className="text-foreground">{todayLeadIds} {todayLeadIds === 1 ? "pessoa" : "pessoas"}</strong>, 
              recebemos <strong className="text-foreground">{todayMessages} {todayMessages === 1 ? "mensagem" : "mensagens"}</strong>
              {stats.todayHot > 0 && <>, identificamos <strong className="text-primary">{stats.todayHot} {stats.todayHot === 1 ? "lead quente" : "leads quentes"}</strong></>}
              {stats.todayLeads > 0 && <>, captamos <strong className="text-foreground">{stats.todayLeads} {stats.todayLeads === 1 ? "novo lead" : "novos leads"}</strong></>}
              {stats.todayConversions > 0 && <>, convertemos <strong className="text-green-600">{stats.todayConversions}</strong></>}
              {todayHoursSaved > 0
                ? <> — economizando <strong className="text-foreground">{todayHoursSaved}h+</strong> do seu time.</>
                : <> — e a IA cuidou de tudo pra você. 🚀</>
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Total de Leads" value={stats.total} iconColor="text-foreground" iconBg="bg-muted" />
        <MetricCard icon={Flame} label="Leads Quentes" value={stats.hot} iconColor="text-primary-foreground" iconBg="bg-primary" highlight />
        <MetricCard icon={MessageCircle} label="Total de Mensagens" value={totalMessages} iconColor="text-foreground" iconBg="bg-muted" />
        <MetricCard icon={Target} label="Taxa de Conversão" value={conversionRate} suffix="%" iconColor="text-green-600" iconBg="bg-green-500/10" />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 30-day Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                Leads nos Últimos 30 Dias
              </CardTitle>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowChartFilters(!showChartFilters)}>
                <Filter className="h-4 w-4" /> Filtros
              </Button>
            </div>
            {showChartFilters && (
              <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-border mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">Período</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("gap-1", !chartDateRange?.from && "text-muted-foreground")}>
                        <CalendarIcon className="h-3 w-3" />
                        {chartDateRange?.from
                          ? chartDateRange.to
                            ? `${format(chartDateRange.from, "dd/MM/yy")} — ${format(chartDateRange.to, "dd/MM/yy")}`
                            : format(chartDateRange.from, "dd/MM/yy")
                          : "Selecionar período"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={chartDateRange}
                        onSelect={setChartDateRange}
                        numberOfMonths={2}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mín leads/dia</Label>
                  <Input placeholder="0" value={chartMinCount} onChange={(e) => setChartMinCount(e.target.value)} className="w-20 h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Máx leads/dia</Label>
                  <Input placeholder="∞" value={chartMaxCount} onChange={(e) => setChartMaxCount(e.target.value)} className="w-20 h-8" />
                </div>
                {(chartDateRange || chartMinCount || chartMaxCount) && (
                  <Button variant="ghost" size="sm" onClick={() => { setChartDateRange(undefined); setChartMinCount(""); setChartMaxCount(""); }}>
                    Limpar
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [value, 'Leads']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Funil de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length > 0 ? (
              <div className="space-y-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={funnelData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" strokeWidth={2} stroke="hsl(var(--background))">
                        {funnelData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {funnelData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Target className="mx-auto h-12 w-12 opacity-50" />
                <p className="mt-2">Nenhum lead registrado ainda.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Temperature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-primary" />
            Termômetro de Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TemperatureBar label="Quentes" value={stats.hot} total={stats.total} color="bg-primary" />
          <TemperatureBar label="Mornos" value={stats.warm} total={stats.total} color="bg-amber-500" />
          <TemperatureBar label="Frios" value={stats.cold} total={stats.total} color="bg-blue-500" />
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  iconColor: string;
  iconBg: string;
  highlight?: boolean;
}

function MetricCard({ icon: Icon, label, value, suffix, iconColor, iconBg, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? "border-primary/30 shadow-glow" : ""}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-7 w-7 ${iconColor}`} />
          </div>
          <div className="space-y-1">
            <p className="text-base text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
              {value}{suffix || ""}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TemperatureBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function TemperatureBar({ label, value, total, color }: TemperatureBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value} ({pct}%)</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
