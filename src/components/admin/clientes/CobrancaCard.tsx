import { useEffect, useState } from "react";
import { Copy, Check, Receipt, Plus, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CriarCobrancaModal } from "./CriarCobrancaModal";

interface Charge {
  id: string;
  amount: number;
  net_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  description: string | null;
  asaas_invoice_url: string | null;
  asaas_payment_id: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Pendente",   variant: "secondary" },
  confirmed: { label: "Pago",       variant: "default" },
  overdue:   { label: "Vencido",    variant: "destructive" },
  refunded:  { label: "Estornado",  variant: "outline" },
  cancelled: { label: "Cancelado",  variant: "outline" },
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface Props {
  clientId: string;
  clientName: string | null;
  userId: string;
}

export function CobrancaCard({ clientId, clientName, userId }: Props) {
  const [charges, setCharges]   = useState<Charge[]>([]);
  const [loading, setLoading]   = useState(true);
  const [criarOpen, setCriarOpen] = useState(false);
  const [copied, setCopied]     = useState<string | null>(null);

  async function fetchCharges() {
    setLoading(true);
    const { data } = await supabase
      .from("financial_entries")
      .select("id, amount, net_amount, due_date, paid_at, status, description, asaas_invoice_url, asaas_payment_id")
      .eq("client_id", clientId)
      .in("status", ["pending", "confirmed", "overdue"])
      .order("created_at", { ascending: false })
      .limit(5);

    setCharges((data as Charge[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchCharges(); }, [clientId]);

  async function handleCopy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Detalhes da Cobrança</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setCriarOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Criar Cobrança
        </Button>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : charges.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma cobrança ativa no momento</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie uma cobrança para este cliente via Asaas.</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setCriarOpen(true)}>
              <Plus className="h-4 w-4" /> Criar e Enviar Cobrança
            </Button>
          </div>
        ) : (
          /* Charges list */
          <div className="space-y-3">
            {charges.map((charge, idx) => {
              const st = STATUS_MAP[charge.status] ?? STATUS_MAP.pending;
              return (
                <div key={charge.id}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">{formatBRL(charge.amount)}</p>
                      {charge.description && (
                        <p className="text-xs text-muted-foreground">{charge.description}</p>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        {charge.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Venc. {format(parseISO(charge.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {charge.paid_at && (
                          <span className="text-xs text-muted-foreground">
                            Pago em {format(parseISO(charge.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                      {charge.asaas_invoice_url && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => handleCopy(charge.asaas_invoice_url!, charge.id)}
                            title="Copiar link de pagamento"
                          >
                            {copied === charge.id
                              ? <Check className="h-3.5 w-3.5 text-green-500" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                            <a href={charge.asaas_invoice_url} target="_blank" rel="noopener noreferrer" title="Abrir link">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CriarCobrancaModal
        open={criarOpen}
        onOpenChange={setCriarOpen}
        clientId={clientId}
        clientName={clientName}
        userId={userId}
        onSuccess={fetchCharges}
      />
    </div>
  );
}
