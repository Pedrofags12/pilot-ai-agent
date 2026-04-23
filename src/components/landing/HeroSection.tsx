import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
interface HeroSectionProps {
  onCTA: () => void;
}
export function HeroSection({
  onCTA
}: HeroSectionProps) {
  return <section className="relative overflow-hidden py-24 lg:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container relative px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Inteligência Artificial para Vendas</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            Sua operação comercial no{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent text-3xl font-normal">
              Piloto Automático
            </span>
          </h1>

          {/* Subhead */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            A inteligência que atende, qualifica e vende no seu WhatsApp 24/7, 
            com controle total humano a um clique de distância.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button onClick={onCTA} size="lg" className="h-14 gap-3 rounded-xl bg-gradient-to-r from-primary to-orange-500 px-8 text-lg font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30">
              Quero automatizar minhas vendas
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Setup em 5 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Sem código necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Teste grátis por 14 dias</span>
            </div>
          </div>
        </div>
      </div>
    </section>;
}