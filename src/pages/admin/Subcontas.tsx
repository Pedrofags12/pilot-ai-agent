import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Wallet,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Subconta {
  id: string;
  asaas_account_id: string;
  wallet_id: string;
  name?: string;
  email?: string;
  cpf_cnpj?: string;
  status: string;
  created_at: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function Subcontas() {
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subconta, setSubconta]     = useState<Subconta | null>(null);
  const [session, setSession]       = useState<any>(null);
  const [copied, setCopied]         = useState<"wallet" | "account" | null>(null);

  // Formulário
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [cpfCnpj, setCpfCnpj]     = useState("");
  const [phone, setPhone]         = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress]     = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [province, setProvince]   = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const sess = data.session;
      setSession(sess);
      if (!sess) { setLoading(false); return; }

      // Pré-preenche email do usuário logado
      setEmail(sess.user.email ?? "");

      // Busca subconta existente
      const { data: sub } = await supabase
        .from("asaas_subaccounts")
        .select("id, asaas_account_id, wallet_id, name, email, cpf_cnpj, status, created_at")
        .eq("user_id", sess.user.id)
        .maybeSingle();

      setSubconta(sub as Subconta | null);
      setLoading(false);
    });
  }, []);

  async function handleCopy(value: string, field: "wallet" | "account") {
    await navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cpfCnpj.trim()) {
      toast.error("CPF ou CNPJ é obrigatório.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/criar-subconta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name, email, cpfCnpj, phone, postalCode, address, addressNumber, province }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 409 = subconta já existe (race condition)
        if (res.status === 409 && data.subconta) {
          setSubconta(data.subconta);
          toast.info("Subconta já existente carregada.");
          return;
        }
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      toast.success("Subconta criada com sucesso!");

      // Recarrega do banco para exibir dados completos
      const { data: fresh } = await supabase
        .from("asaas_subaccounts")
        .select("id, asaas_account_id, wallet_id, name, email, cpf_cnpj, status, created_at")
        .eq("user_id", session.user.id)
        .maybeSingle();

      setSubconta(fresh as Subconta | null);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar subconta. Tente novamente.");
      console.error("criar-subconta error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Subconta Asaas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie sua conta financeira integrada ao Asaas para receber pagamentos com split automático.
        </p>
      </div>

      {/* Subconta existente */}
      {subconta ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{subconta.name ?? "Subconta"}</CardTitle>
                  <CardDescription>{subconta.email}</CardDescription>
                </div>
              </div>
              <Badge variant={subconta.status === "active" ? "default" : "secondary"}>
                {subconta.status === "active" ? (
                  <><CheckCircle2 className="mr-1 h-3 w-3" /> Ativa</>
                ) : (
                  <><AlertCircle className="mr-1 h-3 w-3" /> {subconta.status}</>
                )}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <Separator />

            {/* Wallet ID */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Wallet ID (Split)
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono break-all">
                  {subconta.wallet_id}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(subconta.wallet_id, "wallet")}
                  title="Copiar Wallet ID"
                >
                  {copied === "wallet" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Account ID */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">ID da Conta Asaas</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm font-mono break-all">
                  {subconta.asaas_account_id}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(subconta.asaas_account_id, "account")}
                  title="Copiar Account ID"
                >
                  {copied === "account" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {subconta.cpf_cnpj && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CPF / CNPJ</Label>
                <p className="text-sm font-mono">{subconta.cpf_cnpj}</p>
              </div>
            )}

            <Separator />

            <p className="text-xs text-muted-foreground">
              🔒 O <strong>access_token</strong> Asaas é armazenado com segurança e nunca exibido nesta interface.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Formulário de criação */
        <Card>
          <CardHeader>
            <CardTitle>Criar Subconta</CardTitle>
            <CardDescription>
              Preencha os dados para criar sua subconta no Asaas e habilitar o recebimento de pagamentos com split automático.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sub-name">Nome completo / Razão social *</Label>
                  <Input
                    id="sub-name"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-email">E-mail *</Label>
                  <Input
                    id="sub-email"
                    type="email"
                    placeholder="joao@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sub-cpfcnpj">CPF / CNPJ *</Label>
                  <Input
                    id="sub-cpfcnpj"
                    placeholder="000.000.000-00"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-phone">Telefone / WhatsApp</Label>
                  <Input
                    id="sub-phone"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sub-address">Endereço</Label>
                  <Input
                    id="sub-address"
                    placeholder="Rua Exemplo"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-number">Número</Label>
                  <Input
                    id="sub-number"
                    placeholder="100"
                    value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sub-province">Bairro</Label>
                  <Input
                    id="sub-province"
                    placeholder="Centro"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sub-cep">CEP</Label>
                  <Input
                    id="sub-cep"
                    placeholder="00000-000"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⚠️ Cada usuário pode ter apenas <strong>uma subconta</strong>. Verifique os dados antes de criar — não é possível alterar CPF/CNPJ após a criação.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Criando subconta..." : "Criar Subconta Asaas"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
