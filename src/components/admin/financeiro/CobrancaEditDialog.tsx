import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { FinancialEntry } from "@/pages/admin/Financeiro";

const EDITAR_WEBHOOK = "https://webhook.agentepilot.com/webhook/editar-cobranca";

interface Props {
  entry: FinancialEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CobrancaEditDialog({ entry, open, onOpenChange, onSuccess }: Props) {
  const [dueDate, setDueDate] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Preenche campos ao abrir o modal
  function handleOpenChange(isOpen: boolean) {
    if (isOpen && entry) {
      setDueDate(entry.due_date?.slice(0, 10) ?? "");
      setValue(String(entry.amount));
    }
    onOpenChange(isOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!entry?.asaas_payment_id) {
      toast.error("Cobrança sem ID Asaas — não é possível editar.");
      return;
    }

    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    if (!dueDate) {
      toast.error("Informe uma data de vencimento.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(EDITAR_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asaas_id: entry.asaas_payment_id,
          new_date: dueDate,
          value: parsedValue,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Cobrança atualizada com sucesso!");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Erro ao editar cobrança. Tente novamente.");
      console.error("editar-cobranca error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Cobrança</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-value">Valor (R$)</Label>
            <Input
              id="edit-value"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="100,00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-due-date">Nova data de vencimento</Label>
            <Input
              id="edit-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
