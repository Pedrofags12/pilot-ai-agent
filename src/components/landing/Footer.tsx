import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 py-12">
      <div className="container px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ArrowUpRight className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Pilot</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              Termos de Uso
            </a>
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              Privacidade
            </a>
            <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
              Suporte
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Pilot. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
