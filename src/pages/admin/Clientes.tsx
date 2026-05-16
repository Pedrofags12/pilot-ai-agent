import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Users, Search, CalendarIcon, Phone, MapPin, Plus,
  Filter, Wrench, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MensagensAgendadas } from "@/components/admin/clientes/MensagensAgendadas";

interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  region: string | null;
  created_at: string;
}

export default function Clientes() {
  const navigate = useNavigate();

  const [clients, setClients]     = useState<Client[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [dateFrom, setDateFrom]   = useState<Date | undefined>();
  const [dateTo, setDateTo]       = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(0);
  const [hasMore, setHasMore]     = useState(true);

  // Create dialog
  const [formOpen, setFormOpen]   = useState(false);
  const [formName, setFormName]   = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [saving, setSaving]       = useState(false);

  const PAGE_SIZE = 50;
  const debouncedSearch  = useDebounce(search);
  const debouncedPhone   = useDebounce(phoneFilter);
  const debouncedRegion  = useDebounce(regionFilter);

  const fetchClients = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    let query = supabase
      .from("clients")
      .select("id, name, phone, region, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (debouncedSearch.trim())  query = query.ilike("name", `%${debouncedSearch.trim()}%`);
    if (debouncedPhone.trim())   query = query.ilike("phone", `%${debouncedPhone.trim()}%`);
    if (debouncedRegion.trim())  query = query.ilike("region", `%${debouncedRegion.trim()}%`);
    if (dateFrom) query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo)   query = query.lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");

    const { data, count } = await query;
    if (data) {
      setClients(resetPage ? (data as Client[]) : (prev) => [...prev, ...(data as Client[])]);
      setTotalCount(count ?? 0);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [debouncedSearch, debouncedPhone, debouncedRegion, dateFrom, dateTo, page]);

  useEffect(() => {
    setLoading(true);
    fetchClients(true);
  }, [debouncedSearch, debouncedPhone, debouncedRegion, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch(""); setPhoneFilter(""); setRegionFilter("");
    setDateFrom(undefined); setDateTo(undefined);
  };

  const hasActiveFilters = !!(search || phoneFilter || regionFilter || dateFrom || dateTo);

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error("Informe o nome do cliente."); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await supabase.from("clients").insert({
      user_id: session.user.id,
      name:    formName.trim(),
      phone:   formPhone.trim() || null,
      region:  formRegion.trim() || null,
    });

    if (error) {
      toast.error("Erro ao criar cliente.");
    } else {
      toast.success("Cliente criado com sucesso!");
      setFormOpen(false);
      setFormName(""); setFormPhone(""); setFormRegion("");
      fetchClients(true);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold text-foreground lg:text-3xl">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Criados automaticamente em conversões ou manualmente.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
            <Wrench className="h-4 w-4" /> Sugerir Manutenção
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* ── Summary card ── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total de clientes</p>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ── */}
      <Tabs defaultValue="clientes">
        <TabsList className="mb-2">
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="agendamentos">Mensagens Agendadas</TabsTrigger>
        </TabsList>

        {/* ── TAB: Clientes ── */}
        <TabsContent value="clientes" className="space-y-4">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Date from */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-2", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yy", { locale: ptBR }) : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* Date to */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 gap-2", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yy", { locale: ptBR }) : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>

            {/* More filters toggle */}
            <Button
              variant="outline" size="sm"
              className={cn("h-9 gap-2", showFilters && "bg-muted")}
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="h-4 w-4" /> Filtros
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>

          {/* Extended filters panel */}
          {showFilters && (
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card/50 p-4">
              <div className="space-y-1.5 min-w-[160px] flex-1">
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="Buscar telefone..." value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5 min-w-[160px] flex-1">
                <Label className="text-xs">Região</Label>
                <Input
                  placeholder="Buscar região..." value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border bg-muted/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefone</th>
                        <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">Região</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Cadastro</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client) => (
                        <tr
                          key={client.id}
                          className="group border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => navigate(`/admin/clientes/${client.id}`)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {client.name ?? "Sem nome"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              {client.phone ?? "—"}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {client.region ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {clients.length === 0 && (
                    <div className="py-14 text-center">
                      <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                    </div>
                  )}
                </div>

                {hasMore && clients.length > 0 && (
                  <div className="flex justify-center border-t border-border p-4">
                    <Button variant="outline" size="sm" onClick={() => { setPage((p) => p + 1); fetchClients(); }}>
                      Carregar mais
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── TAB: Mensagens Agendadas ── */}
        <TabsContent value="agendamentos">
          <MensagensAgendadas />
        </TabsContent>
      </Tabs>

      {/* ── Create Client Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input placeholder="Nome do cliente" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Região</Label>
              <Input placeholder="Cidade / Estado" value={formRegion} onChange={(e) => setFormRegion(e.target.value)} />
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full">
              {saving ? "Criando..." : "Criar Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
