import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import FilteredTransactionsDialog from "@/components/FilteredTransactionsDialog";
import { cn } from "@/lib/utils";
import { format, isSameDay, startOfWeek, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider as UiTooltipProvider, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";

type Tx = { id: number; name?: string; amount: number; date: string; categories?: { id: number; name: string; color?: string } };

interface WeeklyHeatmapProps {
  transactions: Tx[];
  className?: string;
}

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const WeeklyHeatmap: React.FC<WeeklyHeatmapProps> = ({ transactions, className }) => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStarts = [3, 2, 1, 0].map(w => subDays(currentWeekStart, w * 7));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const grid = useMemo(() => {
    return weekStarts.map(weekStart => {
      return Array.from({ length: 7 }, (_, d) => {
        const date = addDays(weekStart, d);
        const dayTx = transactions.filter(t => isSameDay(new Date(t.date), date));
        const total = dayTx.reduce((s, t) => s + t.amount, 0);
        const count = dayTx.length;
        const catMap: Record<string, number> = {};
        dayTx.forEach(t => {
          const name = t.categories?.name || "";
          if (!name) return;
          catMap[name] = (catMap[name] || 0) + t.amount;
        });
        const principalCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0];
        return { date, total, count, principalCategory };
      });
    });
  }, [transactions, weekStarts]);

  const maxValue = useMemo(() => {
    const vals = grid.flat().map(c => c.total);
    return Math.max(0, ...vals);
  }, [grid]);

  // Monochromatic primary scale — depth via lightness, on-brand
  const getColor = (value: number) => {
    if (value <= 0) return "bg-muted/60";
    if (maxValue <= 0) return "bg-primary/10";

    const intensity = Math.min(1, value / maxValue);

    if (intensity <= 0.25) return "bg-primary/15";
    if (intensity <= 0.5) return "bg-primary/35";
    if (intensity <= 0.75) return "bg-primary/60";
    return "bg-primary";
  };

  // Calculate period totals for quick summary
  const periodTotal = useMemo(() => grid.flat().reduce((s, c) => s + c.total, 0), [grid]);
  const daysWithExpenses = useMemo(() => grid.flat().filter(c => c.total > 0).length, [grid]);

  return (
    <Card className={cn("rounded-2xl shadow-soft p-5 bg-card border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-emphasis">Actividad del mes</div>
            <div className="text-[11px] text-text-muted">Últimas 4 semanas</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-text-emphasis tabular-nums">
            <span className="text-sm font-medium text-text-secondary mr-0.5">S/</span>{periodTotal.toFixed(0)}
          </div>
          <div className="text-[10px] text-text-muted">{daysWithExpenses} días activos</div>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid mb-2" style={{ gridTemplateColumns: "72px repeat(7, 1fr)", gap: "4px" }}>
        <div />
        {DAYS.map((d, i) => (
          <div key={`lab-${i}`} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>
        ))}
      </div>

      {/* Heatmap grid */}
      <UiTooltipProvider delayDuration={100}>
        <div className="grid" style={{ gridTemplateColumns: "72px repeat(7, 1fr)", rowGap: "6px", gap: "4px" }}>
          {grid.map((week, wi) => (
            <React.Fragment key={`w-${wi}`}>
              {/* Week label */}
              <div className="flex items-center">
                <span className="text-[10px] text-muted-foreground">
                  {format(weekStarts[wi], "dd MMM", { locale: es })}
                </span>
              </div>
              {/* Day cells */}
              {week.map((cell, di) => {
                const key = format(cell.date, "yyyy-MM-dd");
                const isSelected = selectedKey === key;
                const isToday = isSameDay(cell.date, today);
                const isFuture = cell.date > today;

                return (
                  <UiTooltip key={`c-${wi}-${di}`}>
                    <UiTooltipTrigger asChild>
                      <button
                        className={cn(
                          "aspect-square w-full max-w-[28px] mx-auto rounded-md transition-all duration-200",
                          isFuture ? "bg-transparent border border-dashed border-border/40" : getColor(cell.total),
                          !isFuture && "hover:scale-110 cursor-pointer",
                          isSelected && "ring-2 ring-primary ring-offset-1",
                          isToday && "ring-2 ring-primary/60 ring-offset-1"
                        )}
                        onClick={() => {
                          if (!isFuture) {
                            setSelectedKey(key);
                            setSelectedDate(cell.date);
                            setIsDialogOpen(true);
                          }
                        }}
                        disabled={isFuture}
                        aria-label={`${format(cell.date, "dd/MM", { locale: es })}: S/ ${cell.total.toFixed(2)}`}
                      />
                    </UiTooltipTrigger>
                    {!isFuture && (
                      <UiTooltipContent side="top" className="text-xs px-3 py-2">
                        <div className="font-semibold text-foreground">
                          {DAY_FULL[cell.date.getDay() === 0 ? 6 : cell.date.getDay() - 1]}
                          <span className="font-normal text-muted-foreground ml-1">
                            {format(cell.date, "d 'de' MMM", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-bold text-foreground">S/ {cell.total.toFixed(2)}</span>
                          <span className="text-muted-foreground">· {cell.count} {cell.count === 1 ? "gasto" : "gastos"}</span>
                        </div>
                        {cell.principalCategory && (
                          <div className="text-muted-foreground mt-0.5">
                            Más en: {cell.principalCategory}
                          </div>
                        )}
                      </UiTooltipContent>
                    )}
                  </UiTooltip>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </UiTooltipProvider>

      {/* Legend — monochrome scale */}
      <div className="mt-4 flex items-center justify-center gap-1.5">
        <span className="text-[10px] text-text-muted mr-2">Menos</span>
        <div className="w-4 h-4 rounded bg-muted/60" />
        <div className="w-4 h-4 rounded bg-primary/15" />
        <div className="w-4 h-4 rounded bg-primary/35" />
        <div className="w-4 h-4 rounded bg-primary/60" />
        <div className="w-4 h-4 rounded bg-primary" />
        <span className="text-[10px] text-text-muted ml-2">Más</span>
      </div>

      <FilteredTransactionsDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transactions={(selectedDate ? transactions.filter(t => isSameDay(new Date(t.date), selectedDate)) : [])}
        periodStart={selectedDate || undefined}
        periodEnd={selectedDate || undefined}
        title="Gastos del día"
      />
    </Card>
  );
};

export default WeeklyHeatmap;
