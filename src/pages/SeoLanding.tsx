import { useEffect } from "react";
import { ArrowRight, Search, MapPin, TrendingUp, Target, ShoppingCart, Rocket, CheckCircle2, ArrowUpRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
{
  icon: Search,
  title: "SEO Ininterrupto",
  text: "Enquanto você dorme, nossa IA analisa milhões de dados para manter seu site no topo. Sem pausas, sem erros."
},
{
  icon: MapPin,
  title: "Autoridade Local",
  text: "Domine as buscas no mapa. Transforme seu Perfil de Empresas no ímã de clientes mais potente da sua região."
},
{
  icon: TrendingUp,
  title: "Adeus ao CPC",
  text: "Pare de pagar por cada clique. Construa um fluxo de tráfego que pertence a você, não às plataformas de anúncio."
},
{
  icon: Target,
  title: "Ranking de Elite",
  text: "Chega de ficar na segunda página. Nossa tecnologia de precisão identifica as brechas dos seus concorrentes e te coloca na frente."
},
{
  icon: ShoppingCart,
  title: "Intenção de Compra",
  text: "Atraia quem já está com o cartão na mão. Posicionamos você exatamente onde a jornada de compra do seu cliente começa."
},
{
  icon: Rocket,
  title: "Escalabilidade Real",
  text: "Um investimento fixo, um crescimento infinito. Diferente dos anúncios, o SEO se acumula e gera mais valor com o tempo."
}];


const benefits = [
"Otimização On-Page automática",
"Relatórios mensais detalhados",
"Monitoramento de palavras-chave",
"Suporte dedicado via WhatsApp",
"Análise de concorrentes",
"Google Meu Negócio otimizado"];


export default function SeoLanding() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      const saved = localStorage.getItem("pilot-theme");
      if (saved !== "dark") document.documentElement.classList.remove("dark");
    };
  }, []);

  const whatsappUrl = "https://api.whatsapp.com/send/?phone=5511988498268&text=Ol%C3%A1%21+Vim+pelo+site+e+quero+mais+informa%C3%A7%C3%B5es.&type=phone_number&app_absent=0";

  const handleCTA = () => window.open(whatsappUrl, "_blank");
  const handleAnalise = () => window.open(whatsappUrl, "_blank");

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl" style={{ background: "rgba(10,10,10,0.8)" }}>
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ArrowUpRight className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">Pilot <span className="text-primary">SEO AI</span></span>
          </div>
          <Button onClick={handleCTA} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Começar agora
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-24 lg:py-36">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, hsl(14 60% 60% / 0.15), transparent 70%)" }} />

        <div className="container relative px-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 px-4 py-2 text-sm text-primary" style={{ background: "hsl(14 60% 60% / 0.08)" }}>
              <Zap className="h-4 w-4" />
              <span>Inteligência Artificial para SEO</span>
            </div>

            <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.1]">
              Domine o Google: A Inteligência Artificial que Posiciona sua Empresa na{" "}
              <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold">
                Primeira Página, 24/7
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg sm:text-xl" style={{ color: "#a1a1aa" }}>
              Construa um fluxo constante de clientes orgânicos e livre-se da dependência dos anúncios pagos. SEO de elite por um valor que cabe no seu bolso.
            </p>

            <Button onClick={handleCTA} size="lg" className="h-14 gap-3 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-10 text-lg font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/40 hover:scale-105 text-white">
              Quero meu site no topo
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pillar Cards */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, transparent, hsl(14 60% 60% / 0.03) 50%, transparent)" }} />
        <div className="container relative px-4">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
            Por que a Pilot SEO AI é <span className="text-primary">diferente?</span>
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center" style={{ color: "#a1a1aa" }}>
            Seis pilares de tecnologia que trabalham 24 horas para você dominar o Google.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) =>
            <div
              key={p.title}
              className="group relative rounded-2xl border border-white/[0.06] p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}>

                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>{p.text}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none" style={{ background: "radial-gradient(circle, hsl(14 60% 60% / 0.1), transparent 70%)" }} />

        <div className="container relative px-4">
          <h2 className="mb-4 text-center text-3xl font-bold text-white sm:text-4xl">
            Investimento <span className="text-primary">inteligente</span>
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center" style={{ color: "#a1a1aa" }}>
            Menos que um cafezinho por dia para estar no topo do Google.
          </p>

          <div className="mx-auto max-w-md">
            <div
              className="relative rounded-2xl border-2 border-primary/40 p-8 text-center transition-all hover:border-primary/60"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 0 60px hsl(14 60% 60% / 0.12), inset 0 1px 0 rgba(255,255,255,0.05)"
              }}>

              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                ⚡ Mais popular
              </div>
              <p className="mb-1 text-sm font-medium" style={{ color: "#a1a1aa" }}>Plano Anual</p>
              <p className="mb-1 text-lg font-bold text-white">
                Invista <span className="text-primary">R$ 1,90 por dia</span> para estar no topo do Google
              </p>
              <div className="my-6">
                <span className="text-5xl font-extrabold text-white">R$ 59</span>
                <span className="text-2xl font-semibold text-white/60">,90</span>
                <span className="text-lg text-white/60">/mês</span>
              </div>

              <ul className="mb-8 space-y-3 text-left">
                {benefits.map((b) =>
                <li key={b} className="flex items-start gap-2 text-sm text-white/80">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {b}
                  </li>
                )}
              </ul>

              <Button onClick={handleCTA} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-orange-500 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] transition-all text-white">
                Contratar Crescimento Orgânico
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Handoff */}
      <section className="relative py-20 lg:py-28" style={{ background: "linear-gradient(180deg, transparent, hsl(14 60% 60% / 0.06) 40%, transparent)" }}>
        <div className="container px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Pronto para <span className="text-primary">dominar o Google?</span>
          </h2>
          <p className="mx-auto mb-10 max-w-lg" style={{ color: "#a1a1aa" }}>
            Converse com nosso time ou solicite uma análise gratuita do seu site. Sem compromisso.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button onClick={handleCTA} size="lg" className="h-14 gap-3 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-8 text-lg font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all text-white">
              Falar com Especialista
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button onClick={handleAnalise} size="lg" variant="outline" className="h-14 gap-3 rounded-xl border-white/10 px-8 text-lg font-semibold text-white hover:bg-white/5 hover:border-primary/30 transition-all">
              Solicitar Análise Gratuita de SEO
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10" style={{ background: "#0a0a0a" }}>
        <div className="container px-4 text-center">
          <p className="text-sm" style={{ color: "#71717a" }}>
            © {new Date().getFullYear()} Pilot SEO AI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>);

}