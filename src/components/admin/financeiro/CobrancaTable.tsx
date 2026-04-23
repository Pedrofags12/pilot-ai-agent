import { Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialEntry } from "@/pages/admin/Financeiro";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Pendente",   variant: "secondary" },
  confirmed: { label: "Confirmada", variant: "default" },
  overdue:   { label: "Vencida",    variant: "destructive" },
  refunded:  { label: "Estornada",  variant: "outline" },
  cancelled: { label: "Cancelada",  variant: "outline" },
};

const TYPE_MAP: Record<string, string> = {
  income:  "Receita",
  expense: "Despesa",
  refund:  "Estorno",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

interface Props {
  entries: FinancialEntry[];
  loading: boolean;
  onView: (entry: FinancialEntry) => void;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
}

export function CobrancaTable({ entries, loading, onView, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
        <p className="text-base font-medium text-muted-foreground">Nenhuma cobrança encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">Crie sua primeira cobrança usando o botão acima.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const status = STATUS_MAP[entry.status] ?? { label: entry.status, variant: "outline" as const };
            return (
              <TableRow key={entry.id}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {entry.description || "Sem descrição"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {TYPE_MAP[entry.type] ?? entry.type}
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(entry.amount)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(entry.due_date)}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onView(entry)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(entry)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(entry)}
                      title="Deletar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
