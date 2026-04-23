import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  CheckCircle2,
  Zap,
  LayoutDashboard,
  Users,
  Bot,
  CalendarCheck,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: LayoutDashboard, label: "Painel completo de gestão" },
  { icon: Users, label: "Gestão de Clientes integrada" },
  { icon: Bot, label: "Atendimento por IA 24/7" },
  { icon: CalendarCheck, label: "Gestão de Agendamentos" },
  { icon: MessageCircle, label: "Suporte por WhatsApp" },
  { icon: Wrench, label: "Manutenções Prioritárias" },
];

export default function Precos() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      const saved = localStorage.getItem("pilot-theme");
      if (saved !== "dark") document.documentElement.classList.remove("dark");
    };
  }, []);

  const handleCTA = () => {
    window.open(
      "https://wa.me/5511999999999?text=Quero%20assinar%20o%20plano%20Pilot%20AI",
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
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              Voltar ao Início
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
            <span>Plano Único</span>
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl leading-[1.1]">
            Um plano.{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Tudo incluso.
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground">
            Sem surpresas, sem funcionalidades travadas. Acesso completo a toda a
            plataforma por um único valor.
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section className="relative pb-20 lg:pb-32">
        <div className="container px-4 flex justify-center">
          <div
            className="relative w-full max-w-lg rounded-3xl border border-white/[0.08] p-8 sm:p-10"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
              backdropFilter: "blur(20px)",
              boxShadow:
                "0 0 80px hsl(14 60% 60% / 0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" />
              Acesso Completo
            </div>

            {/* Price */}
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white sm:text-6xl">
                R$ 599
              </span>
              <span className="text-2xl font-semibold text-white/60">,90</span>
              <span className="ml-1 text-base text-muted-foreground">/mês</span>
            </div>
            <p className="mb-8 text-sm text-muted-foreground">
              Todas as funcionalidades da plataforma incluídas
            </p>

            {/* Divider */}
            <div className="mb-8 h-px w-full bg-white/[0.06]" />

            {/* Features */}
            <ul className="mb-10 space-y-4">
              {features.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-3 text-sm text-white/80"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-4 w-4" />
                  </div>
                  {f.label}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              onClick={handleCTA}
              size="lg"
              className="w-full h-14 gap-3 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all text-white"
            >
              Começar Agora
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Sem fidelidade · Cancele quando quiser
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t border-white/5 py-10"
        style={{ background: "#0a0a0a" }}
      >
        <div className="container px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Pilot AI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
