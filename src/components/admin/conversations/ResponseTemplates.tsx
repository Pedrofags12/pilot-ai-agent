import { useState, useEffect } from "react";
import { MessageSquareText, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";

interface Template {
  id: string;
  title: string;
  content: string;
  category: string;
}

interface ResponseTemplatesProps {
  onSelectTemplate: (content: string) => void;
  disabled?: boolean;
}

const categoryLabels: Record<string, string> = {
  greeting: "Saudações",
  contact: "Contato",
  sales: "Vendas",
  closing: "Fechamento",
  general: "Geral",
};

export function ResponseTemplates({ onSelectTemplate, disabled }: ResponseTemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      const { data } = await supabase
        .from("response_templates")
        .select("*")
        .order("category", { ascending: true });
      
      if (data) setTemplates(data);
      setLoading(false);
    }
    fetchTemplates();
  }, []);

  const groupedTemplates = templates.reduce((acc, template) => {
    const category = template.category || "general";
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className="gap-1.5 text-xs"
        >
          <MessageSquareText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Respostas Rápidas</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
        {Object.entries(groupedTemplates).map(([category, items]) => (
          <div key={category}>
            <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
              {categoryLabels[category] || category}
            </DropdownMenuLabel>
            {items.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => onSelectTemplate(template.content)}
                className="flex flex-col items-start gap-1 py-3 cursor-pointer"
              >
                <span className="font-medium">{template.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {template.content}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
        
        {templates.length === 0 && !loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhum modelo cadastrado ainda.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
