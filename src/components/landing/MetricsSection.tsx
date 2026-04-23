import { Clock, Flame, Hand, MessageSquare, TrendingUp, Users } from "lucide-react";

const metrics = [
  {
    icon: Clock,
    title: "Atendimento 24/7",
    description: "Nunca perca um lead. Sua IA responde instantaneamente, mesmo às 3h da manhã.",
    highlight: "24h",
  },
  {
    icon: Flame,
    title: "Qualificação Automática",
    description: "Leads classificados automaticamente como Hot, Warm ou Cold baseado em intenção.",
    highlight: "Hot/Cold",
  },
  {
    icon: Hand,
    title: "Intervenção Instantânea",
    description: "Um clique para pausar a IA e assumir a conversa quando você quiser.",
    highlight: "1 clique",
  },
];

const stats = [
  { value: "3x", label: "Mais conversões", icon: TrendingUp },
  { value: "24/7", label: "Disponibilidade", icon: Clock },
  { value: "< 5s", label: "Tempo de resposta", icon: MessageSquare },
  { value: "100%", label: "Controle humano", icon: Users },
];

export function MetricsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container relative px-4">
        {/* Section header */}
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground sm:text-4xl">
            Resultados em Tempo Real
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Métricas que importam para seu negócio, atualizadas instantaneamente.
          </p>
        </div>

        {/* Stats row */}
        <div className="mb-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-2xl border border-border bg-card/50 p-6 text-center backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-glow"
            >
              <stat.icon className="mx-auto mb-3 h-6 w-6 text-primary" />
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-glow"
            >
              {/* Gradient accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              
              <div className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <metric.icon className="h-7 w-7 text-primary" />
                </div>
                
                <div className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {metric.highlight}
                </div>
                
                <h3 className="mb-3 text-xl font-bold text-foreground">
                  {metric.title}
                </h3>
                
                <p className="text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
