import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageBubbleProps {
  content: string;
  role: "user" | "assistant";
  isAiResponse: boolean;
  createdAt: string;
}

export function MessageBubble({ content, role, isAiResponse, createdAt }: MessageBubbleProps) {
  const isUser = role === "user";
  const isHumanAssistant = role === "assistant" && !isAiResponse;
  const isAiAssistant = role === "assistant" && isAiResponse;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed",
          // User messages - muted background
          isUser && "bg-muted text-foreground",
          // AI assistant - subtle orange border
          isAiAssistant && "border-2 border-primary/30 bg-primary/5 text-foreground",
          // Human assistant - solid primary
          isHumanAssistant && "bg-primary text-primary-foreground"
        )}
      >
        {content}
      </div>
      
      <span className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        {role === "assistant" && (
          isAiResponse ? (
            <Bot className="h-3 w-3 text-primary" />
          ) : (
            <User className="h-3 w-3 text-green-600" />
          )
        )}
        {format(new Date(createdAt), "HH:mm", { locale: ptBR })}
        {role === "assistant" && (
          <span className="text-xs">
            {isAiResponse ? "• IA Pilot" : "• Você"}
          </span>
        )}
      </span>
    </div>
  );
}
