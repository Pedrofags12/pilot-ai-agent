import { Bot, Hand, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIToggleProps {
  isAiActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function AIToggle({ isAiActive, onToggle, disabled }: AIToggleProps) {
  return (
    <Button
      size="sm"
      variant={isAiActive ? "destructive" : "default"}
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "gap-1.5 text-xs font-semibold transition-all",
        isAiActive 
          ? "bg-destructive hover:bg-destructive/90" 
          : "bg-success hover:bg-success/90 text-success-foreground"
      )}
    >
      {isAiActive ? (
        <>
          <Hand className="h-3.5 w-3.5" />
          Pausar IA
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" />
          Reativar IA
        </>
      )}
    </Button>
  );
}

export function AIStatusBanner({ isAiActive }: { isAiActive: boolean }) {
  if (isAiActive) {
    return (
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <Bot className="h-4 w-4" />
          🤖 IA Pilot atendendo automaticamente
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-success/30 bg-success/10 px-4 py-2">
      <p className="flex items-center gap-2 text-sm font-medium text-success">
        <Hand className="h-4 w-4" />
        👤 Você está no controle
      </p>
    </div>
  );
}
