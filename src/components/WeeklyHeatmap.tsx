import React, { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import FilteredTransactionsDialog from "@/components/FilteredTransactionsDialog";
import { cn } from "@/lib/utils";
import { format, isSameDay, startOfWeek, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider as UiTooltipProvider, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";

type Tx = { id: number; name?: string; amount: number; date: string; categories?: { id: number; name: string; color?: string } };

interface WeeklyHeatmapProps {
  transactions: Tx[];
  className?: string;
}

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const DAY_FULL = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

function mixColors(hexA: string, hexB: string, t: number) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bC = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bC})`;
}

const WeeklyHeatmap: React.FC<WeeklyHeatmapProps> = ({ transactions, className }) => {
  const navigate = useNavigate();
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStarts = [3, 2, 1, 0].map(w => subDays(currentWeekStart, w * 7));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Dark mode detection
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const handler = () => setIsDark(document.documentElement.classList.contains('dark'));
    window.addEventListener('themechange', handler);
    // Also observe class changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      window.removeEventListener('themechange', handler);
      observer.disconnect();
    };
  }, []);

  const grid = useMemo(() => {
    return weekStarts.map(weekStart => {
      return Array.from({ length: 7 }, (_, d) => {
        const date = addDays(weekStart, d);
        const dayTx = transactions.filter(t => isSameDay(new Date(t.date), date));
        const total = dayTx.reduce((s, t) => s + t.amount, 0);
        const count = dayTx.length;
        // principal category by amount
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
  }, [transactions]);

  const maxValue = useMemo(() => {
    const vals = grid.flat().map(c => c.total);
    return Math.max(0, ...vals);
  }, [grid]);

  const weekdayTotals = useMemo(() => {
    const sums = Array(7).fill(0);
    grid.forEach(week => week.forEach((cell, idx) => { sums[idx] += cell.total; }));
    return sums;
  }, [grid]);

  const habitualDayIndex = useMemo(() => {
    const max = Math.max(...weekdayTotals);
    if (max <= 0) return -1;
    return weekdayTotals.indexOf(max);
  }, [weekdayTotals]);

  const valuesByDay = useMemo(() => {
    const arr = Array(7).fill(0).map(() => [] as number[]);
    grid.forEach(week => week.forEach((cell, idx) => { arr[idx].push(cell.total); }));
    return arr;
  }, [grid]);
  const avgByDay = useMemo(() => valuesByDay.map(a => (a.reduce((s, v) => s + v, 0) / (a.length || 1))), [valuesByDay]);
  const std = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const m = arr.reduce((s, v) => s + v, 0) / arr.length;
    const v = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
    return Math.sqrt(v);
  };
  const stdByDay = useMemo(() => valuesByDay.map(std), [valuesByDay]);
  const maxAvgIdx = useMemo(() => avgByDay.indexOf(Math.max(...avgByDay)), [avgByDay]);
  const maxStdIdx = useMemo(() => stdByDay.indexOf(Math.max(...stdByDay)), [stdByDay]);
  const weekendAvg = useMemo(() => (avgByDay[5] + avgByDay[6]) / 2, [avgByDay]);
  const weekdayAvg = useMemo(() => (avgByDay[0] + avgByDay[1] + avgByDay[2] + avgByDay[3] + avgByDay[4]) / 5, [avgByDay]);
  const patternText = useMemo(() => {
    if (Math.abs(weekendAvg - weekdayAvg) < Math.max(1, weekdayAvg) * 0.1) return "Fines de semana estables";
    if (maxAvgIdx >= 1 && maxAvgIdx <= 4) return "Picos entre semana";
    return "Variación mixta";
  }, [weekendAvg, weekdayAvg, maxAvgIdx]);

  // Theme-aware palette
  const palette = isDark ? {
    zero: "#0f172a",      // Slate dark base (matches new theme)
    low: "#1a3329",       // Dark green tint
    medium: "#3D3520",    // Dark amber
    high: "#4A2A1A",      // Dark orange
    veryhigh: "#5C1E1E"   // Dark red
  } : {
    zero: "#F3F4F6",
    low: "#E8F5E9",
    medium: "#FFF59D",
    high: "#FFB74D",
    veryhigh: "#E53935"
  };

  const colorFor = (v: number) => {
    if (v <= 0) return palette.zero;
    if (maxValue <= 0) return palette.low;
    const t = Math.min(1, v / maxValue);
    if (t <= 0.33) return palette.low;
    if (t <= 0.66) return palette.medium;
    if (t <= 0.85) return palette.high;
    return palette.veryhigh;
  };

  return (
    <Card className={cn("rounded-2xl shadow-card p-5 bg-white dark:bg-card", className)}>
      <div className="text-sm font-semibold text-foreground mb-3">Patrón de gasto por día</div>
      <div className="grid mb-2" style={{ gridTemplateColumns: "96px repeat(7, 24px)", columnGap: "8px" }}>
        <div />
        {DAYS.map((d, i) => (
          <div key={`lab-${i}`} className="text-[11px] text-muted-foreground text-center">{d}</div>
        ))}
      </div>
      <UiTooltipProvider delayDuration={80}>
        <div className="grid" style={{ gridTemplateColumns: "96px repeat(7, 24px)", rowGap: "10px", columnGap: "8px" }}>
          {grid.map((week, wi) => (
            <React.Fragment key={`w-${wi}`}>
              <div className="flex flex-col items-start justify-center leading-tight">
                <div className="text-xs font-semibold text-foreground">Sem {wi + 1}</div>
                <div className="text-[11px] text-muted-foreground">
                  {(() => {
                    const startTxt = format(weekStarts[wi], "LLL dd", { locale: es });
                    const endTxt = format(addDays(weekStarts[wi], 6), "dd", { locale: es });
                    const cap = startTxt.charAt(0).toUpperCase() + startTxt.slice(1);
                    return `${cap}-${endTxt}`;
                  })()}
                </div>
              </div>
              {week.map((cell, di) => {
                const bg = colorFor(cell.total);
                const key = format(cell.date, "yyyy-MM-dd");
                const isSelected = selectedKey === key;
                const delay = wi * 80 + di * 30;
                return (
                  <UiTooltip key={`c-${wi}-${di}`}>
                    <UiTooltipTrigger asChild>
                      <button
                        className={cn(
                          "h-6 w-6 rounded-full transition-transform duration-200 hover:scale-105 animate-in fade-in-50 zoom-in-95 justify-self-center",
                          isSelected && "ring-2 ring-[#A594F9] shadow-sm"
                        )}
                        style={{ backgroundColor: bg, animationDelay: `${delay}ms` }}
                        onClick={() => { setSelectedKey(key); setSelectedDate(cell.date); setIsDialogOpen(true); }}
                        aria-label={`Gasto ${format(cell.date, "dd/MM", { locale: es })}`}
                      />
                    </UiTooltipTrigger>
                    <UiTooltipContent className="text-xs">
                      <div className="font-medium text-foreground">
                        {DAY_FULL[new Date(cell.date).getDay() === 0 ? 6 : new Date(cell.date).getDay() - 1]} · {format(cell.date, "dd/MM", { locale: es })}
                      </div>
                      <div className="text-muted-foreground">S/ {cell.total.toFixed(2)}{cell.principalCategory ? ` · ${cell.principalCategory}` : ""} · {cell.count} transacciones</div>
                    </UiTooltipContent>
                  </UiTooltip>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </UiTooltipProvider>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.zero }} /> Sin gasto
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.low }} /> Bajo
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.medium }} /> Medio
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.high }} /> Alto
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.veryhigh }} /> Muy alto
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] text-muted-foreground">Mayor Gasto</div>
          <div className="text-lg font-semibold text-foreground">{habitualDayIndex >= 0 ? DAY_FULL[habitualDayIndex] : "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Promedio más alto</div>
          <div className="text-lg font-semibold text-foreground">{maxAvgIdx >= 0 ? DAY_FULL[maxAvgIdx] : "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Mayor variabilidad</div>
          <div className="text-lg font-semibold text-foreground">{maxStdIdx >= 0 ? DAY_FULL[maxStdIdx] : "-"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">Patrón</div>
          <div className="text-lg font-semibold text-foreground">{patternText}</div>
        </div>
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
