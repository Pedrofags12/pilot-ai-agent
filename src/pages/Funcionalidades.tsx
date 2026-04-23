import { useEffect } from "react";
import {
  Clock,
  Flame,
  Hand,
  Brain,
  PiggyBank,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  MessageSquare,
  BarChart3,
  Shield,
  Zap,
  TrendingDown,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Clock,
    badge: "24/7",
    title: "Atendimento 24 Horas, 7 Dias por Semana",
    subtitle: "Nunca mais perca um lead por falta de resposta.",
    description:
      "Sua IA responde instantaneamente a qualquer mensagem — seja às 3h da manhã de um domingo ou durante o horário de pico. Enquanto seus concorrentes deixam clientes esperando, você oferece uma experiência de atendimento premium em tempo real, sem depender de plantões humanos.",
    highlights: [
      "Resposta média em menos de 5 segundos",
      "Cobertura total de feriados e finais de semana",
      "Atendimento simultâneo ilimitado — sem filas",
      "Mensagens personalizadas com o tom da sua marca",
    ],
    accentIcon: MessageSquare,
  },
  {
    icon: Flame,
    badge: "Smart",
    title: "Qualificação Automática de Leads",
    subtitle: "Saiba exatamente quem está pronto para comprar.",
    description:
      "A IA analisa cada conversa em tempo real e classifica automaticamente seus leads como Hot, Warm ou Cold com base em sinais reais de intenção de compra. Isso permite que sua equipe comercial foque 100% do tempo nos contatos com maior probabilidade de conversão.",
    highlights: [
      "Classificação inteligente: Hot, Warm e Cold",
      "Detecção de intenção de compra por contexto",
      "Priorização automática no painel de oportunidades",
      "Histórico completo de cada interação para contexto",
    ],
    accentIcon: BarChart3,
  },
  {
    icon: Hand,
    badge: "1 clique",
    title: "Intervenção Instantânea",
    subtitle: "Você no controle, sempre que quiser.",
    description:
      "Com um único clique, pause a IA e assuma a conversa pessoalmente. Ideal para negociações complexas, clientes VIP ou situações que exigem o toque humano. Quando terminar, reative a IA e ela retoma de onde parou, com todo o contexto preservado.",
    highlights: [
      "Alternância IA ↔ Humano com um clique",
      "Contexto completo da conversa preservado",
      "Notificações em tempo real para intervenções",
      "Histórico unificado entre respostas da IA e humanas",
    ],
    accentIcon: Shield,
  },
  {
    icon: Brain,
    badge: "Personalizável",
    title: "Treinamento da IA",
    subtitle: "Uma IA que fala a língua do seu negócio.",
    description:
      "Configure o tom de voz, o conhecimento sobre seu negócio e as regras de atendimento da sua IA sem precisar de código. A IA usa as instruções que você definir para responder com precisão e autoridade.",
    highlights: [
      "Personalização completa do tom de voz e personalidade",
      "Prompt de sistema editável para controle fino",
      "Regras de atendimento configuráveis",
      "A IA aprende continuamente com cada interação",
    ],
    accentIcon: Zap,
  },
  {
    icon: PiggyBank,
    badge: "ROI",
    title: "Redução Drástica de Custos",
    subtitle: "Faça mais com menos — muito menos.",
    description:
      "Elimine a necessidade de equipes de atendimento 24h, reduza o tempo de resposta a zero e aumente sua taxa de conversão. Um único agente de IA substitui múltiplos atendentes, mantendo a qualidade e a consistência em cada conversa, por uma fração do custo.",
    highlights: [
      "Até 80% de redução em custos operacionais",
      "Sem encargos trabalhistas ou turnover de equipe",
      "Escalabilidade infinita sem aumento de custo",
      "ROI positivo já no primeiro mês de operação",
    ],
    accentIcon: TrendingDown,
  },
];

export default function Funcionalidades() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      const saved = localStorage.getItem("pilot-theme");
      if (saved !== "dark") document.documentElement.classList.remove("dark");
    };
  }, []);

  const handleCTA = () => {
    window.open(
      "https://wa.me/5511999999999?text=Quero%20conhecer%20a%20Pilot%20AI",
      "_blank"
    );
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* Navbar */}
      <header
        className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl"
        style={{ background: "rgba(10,10,10,0.8)" }}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ArrowUpRight className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">
              Pilot <span className="text-primary">AI</span>
            </span>
          </Link>
          <Link to="/">
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Começar agora
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, hsl(14 60% 60% / 0.12), transparent 70%)",
          }}
        />
        <div className="container relative px-4 text-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm text-primary"
            style={{ background: "hsl(14 60% 60% / 0.08)" }}
          >
            <Zap className="h-4 w-4" />
            <span>Funcionalidades</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl leading-[1.1]">
            Tudo que você precisa para{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              automatizar suas vendas
            </span>
          </h1>
          <p
            className="mx-auto max-w-2xl text-lg sm:text-xl"
            style={{ color: "#a1a1aa" }}
          >
            Conheça em detalhes cada recurso que transforma sua operação
            comercial e coloca seu atendimento no piloto automático.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="relative py-8 lg:py-16">
        <div className="container px-4">
          <div className="space-y-20 lg:space-y-28">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`flex flex-col gap-10 lg:gap-16 lg:items-center ${
                  i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                {/* Text */}
                <div className="flex-1 space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <span
                      className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                    >
                      {f.badge}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-white sm:text-3xl lg:text-4xl leading-tight">
                    {f.title}
                  </h2>
                  <p className="text-lg font-medium text-primary">
                    {f.subtitle}
                  </p>
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: "#a1a1aa" }}
                  >
                    {f.description}
                  </p>

                  <ul className="space-y-3 pt-2">
                    {f.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2.5 text-sm text-white/80"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Visual card */}
                <div className="flex-1 flex justify-center">
                  <div
                    className="relative w-full max-w-md rounded-2xl border border-white/[0.06] p-10 flex flex-col items-center justify-center gap-6"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      backdropFilter: "blur(16px)",
                      boxShadow:
                        "0 0 80px hsl(14 60% 60% / 0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
                    }}
                  >
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <f.accentIcon className="h-10 w-10" />
                    </div>
                    <p className="text-center text-sm text-white/50">
                      {f.subtitle}
                    </p>
                    {/* Decorative dots */}
                    <div className="flex gap-2">
                      {[...Array(3)].map((_, j) => (
                        <div
                          key={j}
                          className="h-2 w-2 rounded-full"
                          style={{
                            background:
                              j === 0
                                ? "hsl(14 60% 60%)"
                                : "rgba(255,255,255,0.1)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="relative py-20 lg:py-28"
        style={{
          background:
            "linear-gradient(180deg, transparent, hsl(14 60% 60% / 0.06) 40%, transparent)",
        }}
      >
        <div className="container px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Pronto para <span className="text-primary">transformar</span> seu
            atendimento?
          </h2>
          <p
            className="mx-auto mb-10 max-w-lg"
            style={{ color: "#a1a1aa" }}
          >
            Comece hoje e veja resultados reais em poucos dias. Sem compromisso.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              onClick={handleCTA}
              size="lg"
              className="h-14 gap-3 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-8 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all text-white"
            >
              Falar com Especialista
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Link to="/">
              <Button
                size="lg"
                variant="outline"
                className="h-14 gap-3 rounded-xl border-white/10 px-8 text-lg font-semibold text-white hover:bg-white/5 hover:border-primary/30 transition-all"
              >
                Voltar ao Início
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t border-white/5 py-10"
        style={{ background: "#0a0a0a" }}
      >
        <div className="container px-4 text-center">
          <p className="text-sm" style={{ color: "#71717a" }}>
            © {new Date().getFullYear()} Pilot AI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
