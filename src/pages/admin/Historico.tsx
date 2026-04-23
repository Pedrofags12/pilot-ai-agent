import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Search, Eye, Pencil, Trash2, Target, MessageCircle, Users, Bot } from "lucide-react";

type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  reference_id: string | null;
  created_at: string;
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Target; color: string }> = {
  lead: { label: "Oportunidades", icon: Target, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  message: { label: "Nova Mensagem", icon: MessageCircle, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  ai_config: { label: "Config. IA", icon: Bot, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  client: { label: "Clientes", icon: Users, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
};

export default function Historico() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState<Notification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", message: "", type: "lead" });
  const [saving, setSaving] = useState(false);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setNotifications(data);
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !(n.message || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [notifications, typeFilter, searchFilter]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Registro excluído");
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDetailOpen(false);
  };

  const handleEdit = (item: Notification) => {
    setSelectedItem(item);
    setEditForm({ title: item.title, message: item.message || "", type: item.type });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    setSaving(true);
    const { error } = await supabase
      .from("notifications")
      .update({ title: editForm.title, message: editForm.message, type: editForm.type })
      .eq("id", selectedItem.id);
    if (error) { toast.error("Erro ao salvar"); setSaving(false); return; }
    toast.success("Registro atualizado");
    setEditOpen(false);
    fetchNotifications();
    setSaving(false);
  };



  const openDetail = (item: Notification) => {
    setSelectedItem(item);
    setDetailOpen(true);
    if (!item.read) {
      supabase.from("notifications").update({ read: true }).eq("id", item.id).then(() => {
        setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));
      });
    }
  };

  const getTypeConfig = (type: string) => TYPE_CONFIG[type] || { label: type, icon: History, color: "bg-muted text-muted-foreground" };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <History className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Histórico de Ações</h1>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou descrição..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
          const count = notifications.filter((n) => n.type === key).length;
          const Icon = cfg.icon;
          return (
            <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${cfg.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden md:table-cell">Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const cfg = getTypeConfig(item.type);
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={item.id} className={!item.read ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Badge variant="secondary" className={`gap-1 ${cfg.color}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[300px] truncate">
                        {item.message || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(item)} title="Ver detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} title="Excluir" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
            <DialogDescription>Informações completas da ação registrada.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => { const cfg = getTypeConfig(selectedItem.type); const Icon = cfg.icon; return <Badge className={cfg.color}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>; })()}
                {!selectedItem.read && <Badge variant="destructive">Não lido</Badge>}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <p className="font-medium text-foreground">{selectedItem.title}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <p className="text-sm text-foreground">{selectedItem.message || "Sem descrição"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data</Label>
                <p className="text-sm text-foreground">{format(new Date(selectedItem.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
              </div>
              {selectedItem.reference_id && (
                <div>
                  <Label className="text-xs text-muted-foreground">Referência</Label>
                  <p className="text-xs font-mono text-muted-foreground">{selectedItem.reference_id}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fechar</Button>
            <Button variant="destructive" onClick={() => selectedItem && handleDelete(selectedItem.id)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>Altere as informações do registro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={editForm.type} onValueChange={(v) => setEditForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editForm.message} onChange={(e) => setEditForm((p) => ({ ...p, message: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.title.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
