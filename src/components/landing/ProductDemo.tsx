import { Bot, Pause, User, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const flowSteps = [
  {
    icon: User,
    title: "Lead Chega",
    description: "Cliente envia mensagem no WhatsApp",
    color: "bg-info/10 text-info",
  },
  {
    icon: Bot,
    title: "IA Qualifica",
    description: "Conversa natural + classificação automática",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Pause,
    title: "Você Assume",
    description: "Um clique para controle total",
    color: "bg-success/10 text-success",
  },
];

export function ProductDemo() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container px-4">
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            O Cérebro da Operação
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Veja como a Pilot transforma cada conversa em oportunidade qualificada.
          </p>
        </div>

        {/* Flow steps */}
        <div className="mb-16 flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-0">
          {flowSteps.map((step, index) => (
            <div key={step.title} className="flex items-center">
              <div className="flex flex-col items-center text-center">
                <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${step.color}`}>
                  <step.icon className="h-8 w-8" />
                </div>
                <h3 className="mb-1 font-semibold text-foreground">{step.title}</h3>
                <p className="max-w-[140px] text-sm text-muted-foreground">{step.description}</p>
              </div>
              {index < flowSteps.length - 1 && (
                <ArrowRight className="mx-6 hidden h-6 w-6 text-muted-foreground md:block" />
              )}
            </div>
          ))}
        </div>

        {/* Mockup */}
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/20">
            {/* Window header */}
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-4">
              <div className="h-3 w-3 rounded-full bg-destructive/50" />
              <div className="h-3 w-3 rounded-full bg-warning/50" />
              <div className="h-3 w-3 rounded-full bg-success/50" />
              <span className="ml-4 text-sm text-muted-foreground">Conversas ao Vivo — Pilot</span>
            </div>

            {/* Chat mockup */}
            <div className="grid gap-4 md:grid-cols-[250px_1fr]">
              {/* Sidebar */}
              <div className="hidden rounded-xl border border-border bg-muted/30 p-3 md:block">
                <div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Leads Ativos</div>
                {[
                  { name: "Maria Silva", status: "hot", time: "agora" },
                  { name: "João Santos", status: "warm", time: "2min" },
                  { name: "Ana Costa", status: "cold", time: "5min" },
                ].map((lead) => (
                  <div
                    key={lead.name}
                    className={`mb-2 rounded-lg border p-3 ${
                      lead.status === "hot" ? "border-primary/50 bg-primary/5" : "border-border bg-card/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{lead.name}</span>
                      <span
                        className={`text-xs ${
                          lead.status === "hot" ? "text-hot" : lead.status === "warm" ? "text-warm" : "text-cold"
                        }`}
                      >
                        ●
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{lead.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat area */}
              <div className="space-y-4">
                {/* Pause AI button - HIGHLIGHTED */}
                <div className="flex items-center justify-between rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                      <Bot className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">IA Ativa</div>
                      <div className="text-xs text-muted-foreground">Respondendo automaticamente</div>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
                    <Pause className="h-4 w-4" />
                    Pausar IA
                  </Button>
                </div>

                {/* Messages */}
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-none bg-muted px-4 py-2">
                      <p className="text-sm text-foreground">Oi! Queria saber mais sobre o plano empresarial</p>
                      <span className="text-xs text-muted-foreground">Maria Silva • 10:42</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-none border-l-2 border-primary bg-card px-4 py-2">
                      <div className="mb-1 flex items-center gap-1 text-xs text-primary">
                        <Sparkles className="h-3 w-3" />
                        Resposta da IA
                      </div>
                      <p className="text-sm text-foreground">
                        Olá Maria! Fico feliz com seu interesse. O plano empresarial inclui atendentes ilimitados...
                      </p>
                      <span className="text-xs text-muted-foreground">10:42</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
