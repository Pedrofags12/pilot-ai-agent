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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CRIAR_WEBHOOK = "https://webhook.agentepilot.com/webhook/Criar-cobranca";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function NovaCobrancaDialog({ open, onOpenChange, userId, onSuccess }: Props) {
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [billingType, setBillingType] = useState("PIX");
  const [customer, setCustomer] = useState("");
  const [loading, setLoading] = useState(false);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setDescription("");
      setValue("");
      setDueDate("");
      setBillingType("PIX");
      setCustomer("");
    }
    onOpenChange(isOpen);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(CRIAR_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          customer: customer || undefined,
          billingType,
          value: parsedValue,
          dueDate,
          description,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      toast.success("Cobrança criada com sucesso!");
      handleOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("Erro ao criar cobrança. Tente novamente.");
      console.error("criar-cobranca error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="nova-description">Descrição</Label>
            <Input
              id="nova-description"
              placeholder="Ex: Consultoria mensal"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-customer">ID do cliente (Asaas)</Label>
            <Input
              id="nova-customer"
              placeholder="cus_xxxxxxxxx"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nova-value">Valor (R$)</Label>
              <Input
                id="nova-value"
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
              <Label htmlFor="nova-billing">Forma de pagamento</Label>
              <Select value={billingType} onValueChange={setBillingType} disabled={loading}>
                <SelectTrigger id="nova-billing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nova-due-date">Vencimento</Label>
            <Input
              id="nova-due-date"
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
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar cobrança
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
