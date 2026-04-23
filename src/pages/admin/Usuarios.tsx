import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Building2, Phone, Mail, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RegistrationLog {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  company_name: string | null;
  cnpj: string | null;
  commercial_phone: string | null;
  address: string | null;
  employee_count: string | null;
  avg_clients: string | null;
  service_area: string | null;
  business_type: string | null;
  created_at: string;
}

const businessTypeLabels: Record<string, string> = {
  cursos: "Cursos",
  servicos: "Serviços",
  produtos: "Produtos",
};

export default function Usuarios() {
  const [logs, setLogs] = useState<RegistrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<RegistrationLog | null>(null);

  useEffect(() => {
    supabase
      .from("registration_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLogs((data as RegistrationLog[]) || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários Cadastrados</h1>
          <p className="text-sm text-muted-foreground">{logs.length} registro(s)</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-muted-foreground">Nenhum usuário registrado ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Table */}
          <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="font-medium">{log.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{log.email || "—"}</TableCell>
                    <TableCell>{log.company_name || "—"}</TableCell>
                    <TableCell>
                      {log.business_type ? (
                        <Badge variant="secondary">
                          {businessTypeLabels[log.business_type] || log.business_type}
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Detail Panel */}
          {selectedLog && (
            <div className="w-full lg:w-96 rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Detalhes</h2>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </div>

              <div className="space-y-4">
                <DetailItem icon={<Users className="h-4 w-4" />} label="Nome" value={selectedLog.full_name} />
                <DetailItem icon={<Mail className="h-4 w-4" />} label="E-mail" value={selectedLog.email} />
                <DetailItem icon={<Phone className="h-4 w-4" />} label="Telefone" value={selectedLog.phone} />
                <div className="border-t border-border pt-4" />
                <DetailItem icon={<Building2 className="h-4 w-4" />} label="Empresa" value={selectedLog.company_name} />
                <DetailItem label="CNPJ" value={selectedLog.cnpj} />
                <DetailItem label="Telefone comercial" value={selectedLog.commercial_phone} />
                <DetailItem icon={<MapPin className="h-4 w-4" />} label="Endereço" value={selectedLog.address} />
                <DetailItem label="Funcionários" value={selectedLog.employee_count} />
                <DetailItem label="Média de clientes" value={selectedLog.avg_clients} />
                <DetailItem label="Área de atuação" value={selectedLog.service_area} />
                <DetailItem label="Tipo de negócio" value={selectedLog.business_type ? (businessTypeLabels[selectedLog.business_type] || selectedLog.business_type) : null} />
                <div className="border-t border-border pt-4" />
                <DetailItem icon={<Calendar className="h-4 w-4" />} label="Cadastro" value={format(new Date(selectedLog.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}
