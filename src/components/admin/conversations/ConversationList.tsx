import { useState } from "react";
import { Bot, User, Flame, Snowflake, Thermometer, Search, Trash2, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  session_id: string;
  temperature: "hot" | "warm" | "cold";
  ai_active: boolean;
  status: string;
  updated_at: string;
}

interface ConversationListProps {
  leads: Lead[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  lastMessages?: Record<string, string>;
  unreadLeads?: Set<string>;
  unreadCounts?: Record<string, number>;
}

const temperatureConfig = {
  hot: { icon: Flame, color: "text-primary", bg: "bg-primary/10", label: "Quente" },
  warm: { icon: Thermometer, color: "text-warning", bg: "bg-warning/10", label: "Morno" },
  cold: { icon: Snowflake, color: "text-info", bg: "bg-info/10", label: "Frio" },
};

export function ConversationList({
  leads,
  selectedId,
  onSelect,
  onDelete,
  lastMessages = {},
  unreadLeads = new Set(),
  unreadCounts = {},
}: ConversationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.name || "").toLowerCase().includes(q) || (l.phone || "").includes(q);
  });

  const activeCount = leads.filter((l) => !l.ai_active || unreadLeads.has(l.id)).length;

  return (
    <Card className="w-80 flex-shrink-0 overflow-hidden lg:w-96">
      <CardHeader className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Contatos</h3>
          <Badge variant="secondary" className="text-xs">
            {leads.length} conversa{leads.length !== 1 ? "s" : ""} ativa{leads.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </CardHeader>
      <ScrollArea className="h-[calc(100%-7rem)]">
        {filtered.map((lead) => {
          const tempCfg = temperatureConfig[lead.temperature];
          const TempIcon = tempCfg.icon;
          const isUnread = unreadLeads.has(lead.id);

          return (
            <button
              key={lead.id}
              onClick={() => onSelect(lead.id)}
              className={cn(
                "group w-full border-b border-border p-4 text-left transition-colors hover:bg-muted",
                selectedId === lead.id && "bg-primary/5 border-l-4 border-l-primary",
                lead.temperature === "hot" && "shadow-glow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="relative mt-1.5">
                  {isUnread && (
                    <span className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
                  )}
                  <div className={cn("rounded-full p-1.5", tempCfg.bg)}>
                    <TempIcon className={cn("h-4 w-4", tempCfg.color)} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-medium text-foreground">
                      {lead.name || "Visitante"}
                    </p>
                    {lead.ai_active ? (
                      <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5">
                        <Bot className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">IA</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5">
                        <User className="h-3 w-3 text-success" />
                        <span className="text-xs font-medium text-success">Você</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="truncate text-sm text-muted-foreground">
                    {lead.phone || lead.session_id.slice(0, 8)}
                  </p>
                  
                  {lastMessages[lead.id] && (
                    <p className="mt-1 truncate text-sm text-muted-foreground/70">
                      {lastMessages[lead.id]}
                    </p>
                  )}
                </div>
                {(unreadCounts[lead.id] || 0) > 0 && (
                  <Badge className="shrink-0 h-5 min-w-[20px] justify-center rounded-full bg-primary text-[10px] text-primary-foreground px-1.5">
                    {unreadCounts[lead.id]}
                  </Badge>
                )}
                {onDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                        title="Deletar conversa"
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deletar conversa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso irá excluir permanentemente <strong>{lead.name || "Visitante"}</strong> e todo o histórico. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setDeletingId(lead.id);
                            await onDelete(lead.id);
                            setDeletingId(null);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sim, deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </button>
          );
        })}
        
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            {search ? "Nenhum contato encontrado." : "Nenhuma conversa ainda."}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
