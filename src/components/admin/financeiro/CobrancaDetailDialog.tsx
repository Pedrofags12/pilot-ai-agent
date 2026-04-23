import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialEntry } from "@/pages/admin/Financeiro";

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pendente",
  confirmed: "Confirmada",
  overdue:   "Vencida",
  refunded:  "Estornada",
  cancelled: "Cancelada",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending:   "secondary",
  confirmed: "default",
  overdue:   "destructive",
  refunded:  "outline",
  cancelled: "outline",
};

const TYPE_LABELS: Record<string, string> = {
  income:  "Receita",
  expense: "Despesa",
  refund:  "Estorno",
};

function formatCurrency(value?: number) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
  catch { return dateStr; }
}

function formatDateShort(dateStr?: string) {
  if (!dateStr) return "—";
  try { return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return dateStr; }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

interface Props {
  entry: FinancialEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CobrancaDetailDialog({ entry, open, onOpenChange }: Props) {
  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes da Cobrança</DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border">
          <Row label="Descrição" value={entry.description || "Sem descrição"} />
          <Row label="Tipo" value={TYPE_LABELS[entry.type] ?? entry.type} />
          <Row label="Valor" value={<span className="font-semibold">{formatCurrency(entry.amount)}</span>} />
          {entry.net_amount != null && (
            <Row label="Valor líquido" value={formatCurrency(entry.net_amount)} />
          )}
          <Row label="Vencimento" value={formatDateShort(entry.due_date)} />
          <Row label="Pago em" value={formatDate(entry.paid_at)} />
          <Row
            label="Status"
            value={
              <Badge variant={STATUS_VARIANTS[entry.status] ?? "outline"}>
                {STATUS_LABELS[entry.status] ?? entry.status}
              </Badge>
            }
          />

          <Separator className="my-1" />

          <Row label="ID Asaas" value={
            <span className="font-mono text-xs break-all">{entry.asaas_payment_id || "—"}</span>
          } />
          <Row label="Criado em" value={formatDate(entry.created_at)} />
        </div>

        {entry.asaas_invoice_url && (
          <Button asChild variant="outline" className="w-full mt-2">
            <a href={entry.asaas_invoice_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir Link de Pagamento
            </a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
