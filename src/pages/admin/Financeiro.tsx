import { useEffect, useState, useMemo } from "react";
import { Loader2, Plus, TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CobrancaTable } from "@/components/admin/financeiro/CobrancaTable";
import { CobrancaDetailDialog } from "@/components/admin/financeiro/CobrancaDetailDialog";
import { CobrancaEditDialog } from "@/components/admin/financeiro/CobrancaEditDialog";
import { NovaCobrancaDialog } from "@/components/admin/financeiro/NovaCobrancaDialog";

const DELETAR_WEBHOOK = "https://webhook.agentepilot.com/webhook/Deletar-cobranca";

export interface FinancialEntry {
  id: string;
  user_id: string;
  subaccount_id?: string;
  asaas_payment_id?: string;
  asaas_invoice_url?: string;
  split_wallet_id: string;
  split_percentage: number;
  type: "income" | "expense" | "refund";
  amount: number;
  net_amount?: number;
  description?: string;
  due_date?: string;
  paid_at?: string;
  status: "pending" | "confirmed" | "overdue" | "refunded" | "cancelled";
  origin?: string;
  created_at: string;
  updated_at: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function Financeiro() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [novaOpen, setNovaOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<FinancialEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<FinancialEntry | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<FinancialEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function fetchEntries(uid: string) {
    const { data, error } = await supabase
      .from("financial_entries")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar cobranças.");
      return;
    }
    setEntries((data as FinancialEntry[]) ?? []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? "";
      setUserId(uid);
      if (uid) await fetchEntries(uid);
      setLoading(false);
    });
  }, []);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return entries;
    return entries.filter((e) => e.status === statusFilter);
  }, [entries, statusFilter]);

  // Summary cards
  const summary = useMemo(() => {
    const total = entries.reduce((acc, e) => acc + e.amount, 0);
    const confirmed = entries.filter((e) => e.status === "confirmed").reduce((acc, e) => acc + e.amount, 0);
    const pending = entries.filter((e) => e.status === "pending").length;
    const overdue = entries.filter((e) => e.status === "overdue").length;
    return { total, confirmed, pending, overdue };
  }, [entries]);

  function handleView(entry: FinancialEntry) {
    setDetailEntry(entry);
    setDetailOpen(true);
  }

  function handleEdit(entry: FinancialEntry) {
    setEditEntry(entry);
    setEditOpen(true);
  }

  function handleDeleteRequest(entry: FinancialEntry) {
    setDeleteEntry(entry);
  }

  async function handleDeleteConfirm() {
    if (!deleteEntry?.asaas_payment_id) {
      toast.error("Cobrança sem ID Asaas — não é possível deletar.");
      setDeleteEntry(null);
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch(DELETAR_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asaas_id: deleteEntry.asaas_payment_id }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setEntries((prev) => prev.filter((e) => e.id !== deleteEntry.id));
      toast.success("Cobrança deletada com sucesso.");
    } catch (err) {
      toast.error("Erro ao deletar cobrança. Tente novamente.");
      console.error("deletar-cobranca error:", err);
    } finally {
      setDeleteLoading(false);
      setDeleteEntry(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Financeiro</h2>
          <p className="text-sm text-muted-foreground">Gerencie cobranças e pagamentos via Asaas</p>
        </div>
        <Button onClick={() => setNovaOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Cobrança
        </Button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{formatCurrency(summary.total)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Confirmadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.confirmed)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{summary.pending}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-destructive">{summary.overdue}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="overdue">Vencida</SelectItem>
            <SelectItem value="refunded">Estornada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        {statusFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CobrancaTable
          entries={filteredEntries}
          loading={false}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      )}

      {/* Modals */}
      <NovaCobrancaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        userId={userId}
        onSuccess={() => fetchEntries(userId)}
      />

      <CobrancaDetailDialog
        entry={detailEntry}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />

      <CobrancaEditDialog
        entry={editEntry}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={() => fetchEntries(userId)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={(o) => !o && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar cobrança?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancelará a cobrança{" "}
              <span className="font-semibold">{deleteEntry?.asaas_payment_id}</span> no Asaas.
              Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
