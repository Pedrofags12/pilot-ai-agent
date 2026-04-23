import { CalendarIcon, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface LeadFiltersProps {
  nameFilter: string;
  setNameFilter: (v: string) => void;
  phoneFilter: string;
  setPhoneFilter: (v: string) => void;
  temperatureFilter: string;
  setTemperatureFilter: (v: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (v: DateRange | undefined) => void;
  onClear: () => void;
  activeCount: number;
}

export function LeadFilters({
  nameFilter, setNameFilter,
  phoneFilter, setPhoneFilter,
  temperatureFilter, setTemperatureFilter,
  dateRange, setDateRange,
  onClear, activeCount,
}: LeadFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[180px] max-w-[240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="min-w-[160px] max-w-[200px]">
        <Input
          placeholder="Telefone..."
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
        />
      </div>

      <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Termômetro" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="hot">🔥 Quente</SelectItem>
          <SelectItem value="warm">🌡️ Morno</SelectItem>
          <SelectItem value="cold">❄️ Frio</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("gap-2", dateRange?.from && "text-foreground")}>
            <CalendarIcon className="h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                `${format(dateRange.from, "dd/MM", { locale: ptBR })} - ${format(dateRange.to, "dd/MM", { locale: ptBR })}`
              ) : format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
            ) : "Período"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            locale={ptBR}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="gap-1 text-muted-foreground">
          <X className="h-4 w-4" />
          Limpar ({activeCount})
        </Button>
      )}
    </div>
  );
}
