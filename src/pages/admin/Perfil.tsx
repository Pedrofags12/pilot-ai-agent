import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Lock, Save, Eye, EyeOff, Building2, Headset, CreditCard, Settings, Clock, Calendar, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatPhone, formatCNPJ } from "@/lib/masks";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const BUSINESS_TYPES = [
  { value: "produtos", label: "Produtos" },
  { value: "servicos", label: "Serviços" },
  { value: "cursos", label: "Cursos" },
];

type HourBlock = { id?: string; start_time: string; end_time: string };
type DaySchedule = { day_of_week: number; is_active: boolean; blocks: HourBlock[] };

export default function Perfil() {
  const [profile, setProfile] = useState({ full_name: "", phone: "", email: "", cpf: "" });
  const [company, setCompany] = useState({
    company_name: "", cnpj: "", commercial_phone: "", address: "",
    employee_count: "", avg_clients: "", service_area: "", business_type: "",
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const uid = session.user.id;

      const [profileRes, companyRes, hoursRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, email").eq("id", uid).single(),
        supabase.from("companies").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("business_hours").select("*").eq("user_id", uid).order("day_of_week"),
      ]);

      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name || "",
          phone: profileRes.data.phone || "",
          email: profileRes.data.email || session.user.email || "",
          cpf: "",
        });
      }

      if (companyRes.data) {
        setCompany({
          company_name: companyRes.data.company_name || "",
          cnpj: companyRes.data.cnpj || "",
          commercial_phone: companyRes.data.commercial_phone || "",
          address: companyRes.data.address || "",
          employee_count: companyRes.data.employee_count || "",
          avg_clients: companyRes.data.avg_clients || "",
          service_area: companyRes.data.service_area || "",
          business_type: companyRes.data.business_type || "",
        });
        const types = (companyRes.data.business_type || "").split(",").map((t: string) => t.trim()).filter(Boolean);
        setSelectedTypes(types);
      }

      // Group hours by day, supporting multiple blocks
      const rows = (hoursRes.data || []) as { id: string; day_of_week: number; start_time: string; end_time: string; is_active: boolean }[];
      const grouped: DaySchedule[] = [];
      for (let i = 0; i < 7; i++) {
        const dayRows = rows.filter((r) => r.day_of_week === i);
        if (dayRows.length > 0) {
          grouped.push({
            day_of_week: i,
            is_active: dayRows.some((r) => r.is_active),
            blocks: dayRows.map((r) => ({ id: r.id, start_time: r.start_time?.slice(0, 5), end_time: r.end_time?.slice(0, 5) })),
          });
        } else {
          grouped.push({
            day_of_week: i,
            is_active: i >= 1 && i <= 5,
            blocks: [{ start_time: "09:00", end_time: "18:00" }],
          });
        }
      }
      setSchedule(grouped);
      setLoading(false);
    }
    load();
  }, []);

  // --- Profile ---
  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({ full_name: profile.full_name, phone: profile.phone }).eq("id", session.user.id);
    setSaving(false);
    if (error) toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
    else toast({ title: "✅ Perfil atualizado!" });
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) { toast({ variant: "destructive", title: "Senhas não conferem" }); return; }
    if (newPassword.length < 6) { toast({ variant: "destructive", title: "Senha muito curta", description: "Mínimo 6 caracteres." }); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
    else { toast({ title: "✅ Senha alterada!" }); setNewPassword(""); setConfirmPassword(""); }
  };

  // --- Company ---
  const toggleType = (val: string) => setSelectedTypes((prev) => prev.includes(val) ? prev.filter((t) => t !== val) : [...prev, val]);

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingCompany(false); return; }
    const payload = { ...company, business_type: selectedTypes.join(","), user_id: session.user.id };
    const { data: existing } = await supabase.from("companies").select("id").eq("user_id", session.user.id).maybeSingle();
    const { error } = existing
      ? await supabase.from("companies").update(payload).eq("user_id", session.user.id)
      : await supabase.from("companies").insert(payload);
    setSavingCompany(false);
    if (error) toast({ variant: "destructive", title: "Erro", description: error.message });
    else toast({ title: "✅ Empresa atualizada!" });
  };

  // --- Hours ---
  const toggleDay = (day: number, active: boolean) => {
    setSchedule((prev) => prev.map((d) => d.day_of_week === day ? { ...d, is_active: active } : d));
  };

  const updateBlock = (day: number, blockIdx: number, field: "start_time" | "end_time", value: string) => {
    setSchedule((prev) => prev.map((d) =>
      d.day_of_week === day
        ? { ...d, blocks: d.blocks.map((b, i) => i === blockIdx ? { ...b, [field]: value } : b) }
        : d
    ));
  };

  const addBlock = (day: number) => {
    setSchedule((prev) => prev.map((d) =>
      d.day_of_week === day
        ? { ...d, blocks: [...d.blocks, { start_time: "14:00", end_time: "18:00" }] }
        : d
    ));
  };

  const removeBlock = (day: number, blockIdx: number) => {
    setSchedule((prev) => prev.map((d) =>
      d.day_of_week === day && d.blocks.length > 1
        ? { ...d, blocks: d.blocks.filter((_, i) => i !== blockIdx) }
        : d
    ));
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSavingHours(false); return; }
    const uid = session.user.id;

    // Delete all existing, then re-insert
    await supabase.from("business_hours").delete().eq("user_id", uid);

    const rows = schedule.flatMap((d) =>
      d.blocks.map((b) => ({
        user_id: uid,
        day_of_week: d.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        is_active: d.is_active,
      }))
    );

    if (rows.length > 0) {
      const { error } = await supabase.from("business_hours").insert(rows);
      if (error) { toast({ variant: "destructive", title: "Erro", description: error.message }); setSavingHours(false); return; }
    }

    setSavingHours(false);
    toast({ title: "✅ Horários salvos!" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu perfil, empresa, atendimento e assinatura.</p>
        </div>
      </div>

      <Tabs defaultValue="perfil" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="perfil" className="gap-2 text-xs sm:text-sm"><User className="h-4 w-4 hidden sm:block" /> Perfil</TabsTrigger>
          <TabsTrigger value="empresa" className="gap-2 text-xs sm:text-sm"><Building2 className="h-4 w-4 hidden sm:block" /> Empresa</TabsTrigger>
          <TabsTrigger value="atendimento" className="gap-2 text-xs sm:text-sm"><Headset className="h-4 w-4 hidden sm:block" /> Atendimento</TabsTrigger>
          <TabsTrigger value="assinatura" className="gap-2 text-xs sm:text-sm"><CreditCard className="h-4 w-4 hidden sm:block" /> Assinatura</TabsTrigger>
        </TabsList>

        {/* === PERFIL === */}
        <TabsContent value="perfil" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-primary" /> Dados Pessoais</CardTitle>
              <CardDescription>Atualize suas informações de contato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: formatPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={profile.cpf} onChange={(e) => setProfile((p) => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
                  <p className="text-xs text-muted-foreground">Campo local, em breve será salvo.</p>
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={profile.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado.</p>
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5 text-primary" /> Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta segura.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Digite novamente" />
                </div>
              </div>
              <Button onClick={handlePasswordChange} disabled={changingPassword || !newPassword || !confirmPassword} className="gap-2">
                <Lock className="h-4 w-4" /> {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === EMPRESA === */}
        <TabsContent value="empresa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5 text-primary" /> Dados da Empresa</CardTitle>
              <CardDescription>Edite as informações cadastradas no onboarding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nome da Empresa</Label>
                  <Input value={company.company_name} onChange={(e) => setCompany((p) => ({ ...p, company_name: e.target.value }))} placeholder="Minha Empresa LTDA" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={company.cnpj} onChange={(e) => setCompany((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))} placeholder="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone Comercial</Label>
                  <Input value={company.commercial_phone} onChange={(e) => setCompany((p) => ({ ...p, commercial_phone: formatPhone(e.target.value) }))} placeholder="(11) 3000-0000" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input value={company.address} onChange={(e) => setCompany((p) => ({ ...p, address: e.target.value }))} placeholder="Rua, número, bairro, cidade - UF" />
                </div>
                <div className="space-y-2">
                  <Label>Número de Funcionários</Label>
                  <Input value={company.employee_count} onChange={(e) => setCompany((p) => ({ ...p, employee_count: e.target.value }))} placeholder="Ex: 10" />
                </div>
                <div className="space-y-2">
                  <Label>Média de Clientes</Label>
                  <Input value={company.avg_clients} onChange={(e) => setCompany((p) => ({ ...p, avg_clients: e.target.value }))} placeholder="Ex: 50 por mês" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Áreas de Atendimento</Label>
                  <Input value={company.service_area} onChange={(e) => setCompany((p) => ({ ...p, service_area: e.target.value }))} placeholder="Ex: São Paulo, Rio de Janeiro" />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Profissão / Tipo de Negócio</Label>
                <p className="text-sm text-muted-foreground">Selecione uma ou mais opções. Cada seleção habilita a seção correspondente no Portfolio.</p>
                <div className="flex flex-wrap gap-3">
                  {BUSINESS_TYPES.map((bt) => (
                    <label key={bt.value} className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox checked={selectedTypes.includes(bt.value)} onCheckedChange={() => toggleType(bt.value)} />
                      <span className="text-sm font-medium">{bt.label}</span>
                    </label>
                  ))}
                </div>
                {selectedTypes.length > 0 && (
                  <div className="flex gap-2">
                    {selectedTypes.map((t) => (
                      <Badge key={t} variant="secondary">{BUSINESS_TYPES.find((bt) => bt.value === t)?.label}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSaveCompany} disabled={savingCompany} className="gap-2">
                <Save className="h-4 w-4" /> {savingCompany ? "Salvando..." : "Salvar Empresa"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ATENDIMENTO === */}
        <TabsContent value="atendimento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-primary" /> Horários de Atendimento</CardTitle>
              <CardDescription>Defina múltiplos blocos de horário para cada dia da semana.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {schedule.map((day) => (
                <div key={day.day_of_week} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Switch checked={day.is_active} onCheckedChange={(v) => toggleDay(day.day_of_week, v)} />
                    <span className={`text-sm font-semibold ${day.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                      {DAYS[day.day_of_week]}
                    </span>
                    {!day.is_active && <span className="text-xs text-muted-foreground italic ml-auto">Fechado</span>}
                  </div>

                  {day.is_active && (
                    <div className="space-y-2 pl-12">
                      {day.blocks.map((block, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={block.start_time}
                            onChange={(e) => updateBlock(day.day_of_week, idx, "start_time", e.target.value)}
                            className="w-28"
                          />
                          <span className="text-xs text-muted-foreground">às</span>
                          <Input
                            type="time"
                            value={block.end_time}
                            onChange={(e) => updateBlock(day.day_of_week, idx, "end_time", e.target.value)}
                            className="w-28"
                          />
                          {day.blocks.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeBlock(day.day_of_week, idx)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => addBlock(day.day_of_week)}>
                        <Plus className="h-3 w-3" /> Adicionar bloco
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <Button onClick={handleSaveHours} disabled={savingHours} className="gap-2">
                <Save className="h-4 w-4" /> {savingHours ? "Salvando..." : "Salvar Horários"}
              </Button>
            </CardContent>
          </Card>

          {/* Weekly Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5 text-primary" /> Prévia da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {schedule.map((day) => (
                  <div key={day.day_of_week} className={`rounded-lg border p-3 text-center transition-colors ${day.is_active ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                    <p className="text-xs font-bold text-foreground">{DAYS_SHORT[day.day_of_week]}</p>
                    {day.is_active ? (
                      <div className="mt-1 space-y-1">
                        {day.blocks.map((b, i) => (
                          <div key={i}>
                            <p className="text-[10px] text-primary font-medium">{b.start_time}-{b.end_time}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">—</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ASSINATURA === */}
        <TabsContent value="assinatura" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><CreditCard className="h-5 w-5 text-primary" /> Sua Assinatura</CardTitle>
              <CardDescription>Detalhes do seu plano atual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div>
                  <p className="text-sm text-muted-foreground">Plano Atual</p>
                  <h3 className="text-2xl font-bold text-primary">Pilot Pro</h3>
                  <p className="text-sm text-muted-foreground mt-1">Acesso completo a todas as funcionalidades</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-sm px-3 py-1">Ativo</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Próxima cobrança</p>
                  <p className="text-lg font-bold text-foreground mt-1">—</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Valor mensal</p>
                  <p className="text-lg font-bold text-foreground mt-1">—</p>
                </div>
                <div className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xs text-muted-foreground">Membro desde</p>
                  <p className="text-lg font-bold text-foreground mt-1">—</p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Button variant="destructive" onClick={() => navigate("/admin/cancelar-assinatura")} className="gap-2">
                  Solicitar Cancelamento
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Ao cancelar, você perderá o acesso ao final do período vigente.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
