import React, { useMemo, useState, useEffect } from "react";
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

  // Dark mode detection
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  // Improved color palette with gradients
  const getColor = (value: number) => {
    if (value <= 0) return isDark ? "bg-slate-800/50" : "bg-gray-100";
    if (maxValue <= 0) return isDark ? "bg-emerald-900/50" : "bg-emerald-100";

    const intensity = Math.min(1, value / maxValue);

    if (intensity <= 0.25) return isDark ? "bg-emerald-900/60" : "bg-emerald-200";
    if (intensity <= 0.5) return isDark ? "bg-amber-900/60" : "bg-amber-200";
    if (intensity <= 0.75) return isDark ? "bg-orange-800/70" : "bg-orange-300";
    return isDark ? "bg-rose-800/80" : "bg-rose-400";
  };

  // Calculate period totals for quick summary
  const periodTotal = useMemo(() => grid.flat().reduce((s, c) => s + c.total, 0), [grid]);
  const daysWithExpenses = useMemo(() => grid.flat().filter(c => c.total > 0).length, [grid]);

  return (
    <Card className={cn("rounded-2xl shadow-card p-5 bg-white dark:bg-card", className)}>
      {/* Header with icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">Actividad del mes</div>
            <div className="text-[11px] text-muted-foreground">Últimas 4 semanas</div>
          </div>
        </div>
        {/* Mini summary */}
        <div className="text-right">
          <div className="text-lg font-bold text-foreground">S/ {periodTotal.toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground">{daysWithExpenses} días activos</div>
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
                          isFuture ? "bg-transparent border border-dashed border-border/30" : getColor(cell.total),
                          !isFuture && "hover:scale-110 hover:shadow-md cursor-pointer",
                          isSelected && "ring-2 ring-primary ring-offset-1",
                          isToday && "ring-2 ring-violet-500/50"
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

      {/* Gradient legend - more visual */}
      <div className="mt-4 flex items-center justify-center gap-1">
        <span className="text-[10px] text-muted-foreground mr-2">Menos</span>
        <div className={cn("w-4 h-4 rounded", isDark ? "bg-slate-800/50" : "bg-gray-100")} />
        <div className={cn("w-4 h-4 rounded", isDark ? "bg-emerald-900/60" : "bg-emerald-200")} />
        <div className={cn("w-4 h-4 rounded", isDark ? "bg-amber-900/60" : "bg-amber-200")} />
        <div className={cn("w-4 h-4 rounded", isDark ? "bg-orange-800/70" : "bg-orange-300")} />
        <div className={cn("w-4 h-4 rounded", isDark ? "bg-rose-800/80" : "bg-rose-400")} />
        <span className="text-[10px] text-muted-foreground ml-2">Más</span>
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
