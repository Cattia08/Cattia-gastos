import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, isSameDay, startOfWeek, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider as UiTooltipProvider, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";

type Tx = { id: number; amount: number; date: string; categories?: { id: number; name: string; color?: string } };

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
  const [hover, setHover] = useState<{ date: Date; total: number; count: number; category?: string } | null>(null);

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

  const palette = {
    low: "#EAF3FF",       // azul muy claro
    medium: "#9EC5FF",    // azul medio
    high: "#C3A5F9",      // morado suave
    veryhigh: "#FF9FB0"    // rojo pastel para muy alto (no agresivo)
  };

  const colorFor = (v: number) => {
    if (maxValue <= 0) return palette.low;
    const t = Math.min(1, v / maxValue);
    if (t <= 0.25) return palette.low;
    if (t <= 0.5) return palette.medium;
    if (t <= 0.75) return palette.high;
    return palette.veryhigh;
  };

  return (
    <Card className={cn("rounded-2xl shadow-card p-5 bg-white", className)}>
      <div className="text-sm font-semibold text-[#4A404E] mb-3">Patrón de gasto por día</div>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-6" />
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((d, i) => (
            <div key={`lab-${i}`} className="text-[11px] text-muted-foreground">{d}</div>
          ))}
        </div>
      </div>
      <UiTooltipProvider delayDuration={80}>
      <div className="flex flex-col gap-2">
        {grid.map((week, wi) => (
          <div key={`w-${wi}`} className="flex items-center gap-3">
            <div className="text-[11px] text-muted-foreground">
              Semana {wi + 1}
              <span className="ml-1">· {format(weekStarts[wi], "dd/MM", { locale: es })} – {format(addDays(weekStarts[wi], 6), "dd/MM", { locale: es })}</span>
            </div>
            <div className="grid grid-cols-7 gap-2">
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
                          "h-5 w-5 md:h-6 md:w-6 rounded-full transition-transform duration-200 hover:scale-105 animate-in fade-in-50 zoom-in-95",
                          isSelected && "ring-2 ring-[#A594F9] shadow-sm"
                        )}
                        style={{ backgroundColor: bg, animationDelay: `${delay}ms` }}
                        onClick={() => { setSelectedKey(key); navigate(`/transacciones?fecha=${key}`); }}
                        aria-label={`Gasto ${format(cell.date, "dd/MM", { locale: es })}`}
                      />
                    </UiTooltipTrigger>
                    <UiTooltipContent className="text-xs">
                      <div className="font-medium text-[#4A404E]">
                        {DAY_FULL[new Date(cell.date).getDay() === 0 ? 6 : new Date(cell.date).getDay() - 1]} · {format(cell.date, "dd/MM", { locale: es })}
                      </div>
                      <div className="text-muted-foreground">S/ {cell.total.toFixed(2)}{cell.principalCategory ? ` · ${cell.principalCategory}` : ""} · {cell.count} transacciones</div>
                    </UiTooltipContent>
                  </UiTooltip>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      </UiTooltipProvider>

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.low }} /> Bajo
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.medium }} /> Medio
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.high }} /> Alto
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: palette.veryhigh }} /> Muy alto
      </div>

      {/* Insight habitual llamativo */}
      <div className="mt-3 text-[12px]">
        {habitualDayIndex >= 0 ? (
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded-full bg-pastel-purple/15 text-[#4A404E]">Tu día de mayor gasto habitual es: <span className="font-semibold">{DAY_FULL[habitualDayIndex]}</span></span>
          </div>
        ) : (
          <span className="text-muted-foreground">Sin datos para identificar un patrón.</span>
        )}
      </div>

      {/* Insights adicionales */}
      <div className="mt-2 text-[12px]">
        {(() => {
          // variabilidad por día (desviación estándar simple)
          const valuesByDay = Array(7).fill(0).map(() => [] as number[]);
          grid.forEach(week => week.forEach((cell, idx) => { valuesByDay[idx].push(cell.total); }));
          const std = (arr: number[]) => {
            if (arr.length === 0) return 0;
            const m = arr.reduce((s, v) => s + v, 0) / arr.length;
            const v = arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length;
            return Math.sqrt(v);
          };
          const avgByDay = valuesByDay.map(a => (a.reduce((s, v) => s + v, 0) / (a.length || 1)));
          const stdByDay = valuesByDay.map(std);
          const maxAvgIdx = avgByDay.indexOf(Math.max(...avgByDay));
          const maxStdIdx = stdByDay.indexOf(Math.max(...stdByDay));
          let pattern = "";
          const weekendAvg = (avgByDay[5] + avgByDay[6]) / 2;
          const weekdayAvg = (avgByDay[0] + avgByDay[1] + avgByDay[2] + avgByDay[3] + avgByDay[4]) / 5;
          if (Math.abs(weekendAvg - weekdayAvg) < Math.max(1, weekdayAvg) * 0.1) {
            pattern = "Patrón detectado: fines de semana estables.";
          } else if (maxAvgIdx >= 1 && maxAvgIdx <= 4) {
            pattern = "Patrón detectado: picos entre semana.";
          } else {
            pattern = "Patrón detectado: variación mixta.";
          }
          return <div className="grid gap-1">
            <div className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-pastel-blue/15 text-[#4A404E]">Día con mayor promedio:</span> <span className="font-semibold text-[#4A404E]">{DAY_FULL[maxAvgIdx]}</span>.</div>
            <div className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-pastel-pink/15 text-[#4A404E]">Día con mayor variabilidad:</span> <span className="font-semibold text-[#4A404E]">{DAY_FULL[maxStdIdx]}</span>.</div>
            <div className="inline-flex items-center gap-2"><span className="px-2 py-0.5 rounded-full bg-pastel-purple/15 text-[#4A404E]">{pattern}</span></div>
          </div>;
        })()}
      </div>
    </Card>
  );
};

export default WeeklyHeatmap;

