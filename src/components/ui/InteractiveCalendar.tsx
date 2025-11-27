
import * as React from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InteractiveCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
  expenses?: Array<{date: Date, amount: number}>;
  className?: string;
  mode?: "single" | "range";
  rangeDate?: Date | undefined;
  onRangeSelect?: (date: Date | undefined) => void;
  onReset?: () => void;
  inline?: boolean;
}

const InteractiveCalendar = ({
  selectedDate,
  onDateSelect,
  expenses = [],
  className,
  mode = "single",
  rangeDate,
  onRangeSelect,
  onReset,
  inline = false
}: InteractiveCalendarProps) => {
  const [calendarMode, setCalendarMode] = React.useState<"single" | "range">(mode);
  const handleModeChange = (value: string) => {
    setCalendarMode(value as "single" | "range");
    onDateSelect(undefined);
    if (onRangeSelect) onRangeSelect(undefined);
  };

  const handleReset = () => {
    onDateSelect(undefined);
    if (onRangeSelect) onRangeSelect(undefined);
    if (onReset) onReset();
  };

  if (inline) {
    return (
      <div className={cn("w-auto", className)}>
        <div className="p-3 border-b border-border/20">
          <div className="flex items-center justify-between mb-2">
            <Select value={calendarMode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-[160px] h-8 text-xs border-pastel-pink/30">
                <SelectValue placeholder="Tipo de selección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Fecha única</SelectItem>
                <SelectItem value="range">Rango de fechas</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          </div>
        </div>
        {calendarMode === "single" ? (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            initialFocus
            className="p-3 pointer-events-auto bg-white border border-pastel-pink/20 rounded-xl dark:bg-gray-800"
          />
        ) : (
          <Calendar
            mode="range"
            selected={{ from: selectedDate, to: rangeDate }}
            onSelect={(range) => {
              if (!range) {
                onDateSelect(undefined);
                if (onRangeSelect) onRangeSelect(undefined);
                return;
              }
              if ('from' in range && range.from) {
                onDateSelect(range.from);
              }
              if ('to' in range && range.to && onRangeSelect) {
                onRangeSelect(range.to);
              }
            }}
            initialFocus
            className="p-3 pointer-events-auto bg-white border border-pastel-pink/20 rounded-xl dark:bg-gray-800"
          />
        )}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full md:w-[240px] justify-start text-left font-normal border-pastel-pink/30 hover:bg-pastel-pink/10",
            !selectedDate && !rangeDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate && calendarMode === "single" && (
            <span>{format(selectedDate, "PPP")}</span>
          )}
          {selectedDate && rangeDate && calendarMode === "range" && (
            <span>
              {format(selectedDate, "PP")} - {format(rangeDate, "PP")}
            </span>
          )}
          {selectedDate && !rangeDate && calendarMode === "range" && (
            <span>Desde {format(selectedDate, "PP")}</span>
          )}
          {!selectedDate && !rangeDate && (
            <span>Seleccionar fecha</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b border-border/20">
          <div className="flex items-center justify-between mb-2">
            <Select value={calendarMode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-[160px] h-8 text-xs border-pastel-pink/30">
                <SelectValue placeholder="Tipo de selección" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Fecha única</SelectItem>
                <SelectItem value="range">Rango de fechas</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={handleReset}>
              <X className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          </div>
        </div>
        {calendarMode === "single" ? (
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={onDateSelect}
            initialFocus
            className="p-3 pointer-events-auto bg-white border border-pastel-pink/20 rounded-xl dark:bg-gray-800"
          />
        ) : (
          <Calendar
            mode="range"
            selected={{ from: selectedDate, to: rangeDate }}
            onSelect={(range) => {
              if (!range) {
                onDateSelect(undefined);
                if (onRangeSelect) onRangeSelect(undefined);
                return;
              }
              if ('from' in range && range.from) {
                onDateSelect(range.from);
              }
              if ('to' in range && range.to && onRangeSelect) {
                onRangeSelect(range.to);
              }
            }}
            initialFocus
            className="p-3 pointer-events-auto bg-white border border-pastel-pink/20 rounded-xl dark:bg-gray-800"
          />
        )}
      </PopoverContent>
    </Popover>
  );
};

export default InteractiveCalendar;
