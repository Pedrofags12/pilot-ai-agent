import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { Users, Search, CalendarIcon, Phone, MapPin, Plus, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string | null;
  phone: string | null;
  region: string | null;
  created_at: string;
}

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Create dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRegion, setFormRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  const debouncedSearch = useDebounce(search);
  const debouncedPhone = useDebounce(phoneFilter);
  const debouncedRegion = useDebounce(regionFilter);

  const fetchClients = useCallback(async (resetPage = false) => {
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    let query = supabase
      .from("clients")
      .select("id, name, phone, region, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

    if (debouncedSearch.trim()) {
      query = query.ilike("name", `%${debouncedSearch.trim()}%`);
    }
    if (debouncedPhone.trim()) {
      query = query.ilike("phone", `%${debouncedPhone.trim()}%`);
    }
    if (debouncedRegion.trim()) {
      query = query.ilike("region", `%${debouncedRegion.trim()}%`);
    }
    if (dateFrom) {
      query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
    }
    if (dateTo) {
      query = query.lte("created_at", format(dateTo, "yyyy-MM-dd") + "T23:59:59");
    }

    const { data, count } = await query;
    if (data) {
      setClients(resetPage ? data as Client[] : [...clients, ...(data as Client[])]);
      setTotalCount(count || 0);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [debouncedSearch, debouncedPhone, debouncedRegion, dateFrom, dateTo, page, clients]);

  useEffect(() => {
    setLoading(true);
    fetchClients(true);
  }, [debouncedSearch, debouncedPhone, debouncedRegion, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch("");
    setPhoneFilter("");
    setRegionFilter("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from("clients").insert({
      user_id: session.user.id,
      name: formName.trim(),
      phone: formPhone.trim() || null,
      region: formRegion.trim() || null,
    });

    if (error) {
      toast({ title: "Erro ao criar cliente", variant: "destructive" });
    } else {
      toast({ title: "Cliente criado!" });
      setFormOpen(false);
      setFormName("");
      setFormPhone("");
      setFormRegion("");
      fetchClients();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-foreground lg:text-3xl">👥 Clientes</h2>
          <p className="text-muted-foreground">
            Clientes são criados automaticamente em vendas ou manualmente.
          </p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
          <div>
              <p className="text-sm text-muted-foreground">Total de clientes</p>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yy") : "De"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yy") : "Até"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" /> Filtros
        </Button>

        {(search || phoneFilter || regionFilter || dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs">Telefone</Label>
            <Input placeholder="Buscar telefone..." value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} />
          </div>
          <div className="space-y-1 min-w-[160px]">
            <Label className="text-xs">Região</Label>
            <Input placeholder="Buscar região..." value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} />
          </div>
        </div>
      )}

      {/* Clients List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Telefone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Região</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {client.name || "Sem nome"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {client.phone || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {client.region || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {clients.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum cliente encontrado.
              </div>
            )}
          </div>
          {hasMore && clients.length > 0 && (
            <div className="flex justify-center p-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => { setPage((p) => p + 1); fetchClients(); }}>
                Carregar mais
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              Criar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
