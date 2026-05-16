import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CRIAR_WEBHOOK = "https://webhook.agentepilot.com/webhook/Criar-cobranca";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string | null;
  userId: string;
  onSuccess: () => void;
}

export function CriarCobrancaModal({ open, onOpenChange, clientId, clientName, userId, onSuccess }: Props) {
  const [value, setValue]       = useState("");
  const [dueDate, setDueDate]   = useState("");
  const [billing, setBilling]   = useState("PIX");
  const [description, setDesc]  = useState("");
  const [loading, setLoading]   = useState(false);

  function handleClose(isOpen: boolean) {
    if (!isOpen) { setValue(""); setDueDate(""); setBilling("PIX"); setDesc(""); }
    onOpenChange(isOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(value);
    if (isNaN(parsed) || parsed <= 0) { toast.error("Informe um valor válido."); return; }
    if (!dueDate) { toast.error("Informe a data de vencimento."); return; }

    setLoading(true);
    try {
      const res = await fetch(CRIAR_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:     userId,
          client_id:   clientId,
          customer:    clientName ?? undefined,
          billingType: billing,
          value:       parsed,
          dueDate,
          description: description.trim() || `Cobrança — ${clientName ?? "Cliente"}`,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Cobrança criada e enviada com sucesso!");
      handleClose(false);
      onSuccess();
    } catch {
      toast.error("Erro ao criar cobrança. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar Cobrança</DialogTitle>
          {clientName && (
            <DialogDescription>Para <span className="font-medium text-foreground">{clientName}</span></DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="cob-desc">Descrição</Label>
            <Input
              id="cob-desc"
              placeholder="Ex: Mensalidade maio/2026"
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cob-value">Valor (R$)</Label>
              <Input
                id="cob-value"
                type="number" step="0.01" min="0.01"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cob-billing">Pagamento</Label>
              <Select value={billing} onValueChange={setBilling} disabled={loading}>
                <SelectTrigger id="cob-billing"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cob-due">Vencimento</Label>
            <Input
              id="cob-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar e Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
