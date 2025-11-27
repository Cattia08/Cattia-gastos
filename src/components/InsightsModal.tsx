import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, differenceInCalendarDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight } from "lucide-react";

type Tx = { id: number; name: string; amount: number; date: string; categories?: { id: number; name: string; color: string } };

interface InsightsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactions: Tx[];
  periodStart?: Date;
  periodEnd?: Date;
  matchingTransactions?: Tx[];
}

const InsightItem = ({ icon, title, description, className }: { icon: React.ReactNode; title: string; description: React.ReactNode; className?: string }) => (
  <Card className={cn("p-3 rounded-xl border-pastel-pink/30 bg-white shadow-card", className)}>
    <div className="flex items-start gap-3">
      <div className="shrink-0" style={{ fontSize: '1.2rem', color: '#444' }}>{icon}</div>
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-[#444]">{title}</div>
        <div className="text-sm text-[#444]">{description}</div>
      </div>
    </div>
  </Card>
);

const InsightsModal = ({ open, onOpenChange, transactions, periodStart, periodEnd, matchingTransactions }: InsightsModalProps) => {
  const dates = transactions.map(t => new Date(t.date));
  const computedStart = periodStart || (dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date());
  const computedEnd = periodEnd || (dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date());
  const durationDays = Math.max(1, differenceInCalendarDays(computedEnd, computedStart) + 1);

  const currentTotal = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions]);

  // 1) Variación del gasto total vs período anterior equivalente
  const prevStart = subDays(computedStart, durationDays);
  const prevEnd = subDays(computedEnd, durationDays);
  const prevTransactions = useMemo(() => {
    if (!matchingTransactions || matchingTransactions.length === 0) return [] as Tx[];
    return matchingTransactions.filter(t => {
      const d = new Date(t.date);
      return isWithinInterval(d, { start: prevStart, end: prevEnd });
    });
  }, [matchingTransactions, prevStart, prevEnd]);
  const prevTotal = useMemo(() => prevTransactions.reduce((s, t) => s + t.amount, 0), [prevTransactions]);
  const changeEmoji = useMemo(() => {
    if (prevTransactions.length === 0 || prevTotal === 0) return "📊";
    const diff = currentTotal - prevTotal;
    return diff < 0 ? "📉" : "📈";
  }, [currentTotal, prevTotal, prevTransactions]);
  const changeDescription = useMemo(() => {
    if (prevTransactions.length === 0 || prevTotal === 0) return "Sin datos suficientes para comparar.";
    const diff = currentTotal - prevTotal;
    const absDiff = Math.abs(diff).toFixed(2);
    const pct = Math.abs((diff / prevTotal) * 100).toFixed(1);
    if (diff < 0) {
      return (
        <>Gastaste <span className="font-bold">S/ {absDiff}</span> menos que el mes anterior ({pct}%).</>
      );
    }
    return (
      <>Gastaste <span className="font-bold">S/ {Number(diff).toFixed(2)}</span> más que el mes anterior (+{pct}%).</>
    );
  }, [currentTotal, prevTotal, prevTransactions]);

  

  // 3) Categoría con mayor variación vs período anterior
  const categoryIncrease = useMemo(() => {
    if (!matchingTransactions || matchingTransactions.length === 0) return "Sin datos suficientes";
    const curr: Record<number, number> = {};
    const prev: Record<number, number> = {};
    matchingTransactions.forEach(t => {
      const id = t.categories?.id;
      if (id === undefined || id === null) return;
      const d = new Date(t.date);
      if (isWithinInterval(d, { start: computedStart, end: computedEnd })) {
        curr[id] = (curr[id] || 0) + t.amount;
      }
      if (isWithinInterval(d, { start: prevStart, end: prevEnd })) {
        prev[id] = (prev[id] || 0) + t.amount;
      }
    });
    const candidates: Array<{ id: number; name: string; inc: number }> = [];
    Object.keys(curr).forEach(k => {
      const id = Number(k);
      const c = curr[id] || 0;
      const p = prev[id] || 0;
      const inc = c - p;
      if (inc > 0) {
        const name = transactions.find(t => t.categories?.id === id)?.categories?.name || "Sin categoría";
        candidates.push({ id, name, inc });
      }
    });
    if (!candidates.length) return "Sin datos suficientes";
    const maxInc = candidates.slice().sort((a, b) => b.inc - a.inc)[0];
    return maxInc;
  }, [matchingTransactions, transactions, computedStart, computedEnd, prevStart, prevEnd]);

  // 4) Racha de días sin gastos
  const noExpenseStreak = useMemo(() => {
    let streak = 0;
    const endRef = new Date(Math.min(new Date().getTime(), computedEnd.getTime()));
    const startRef = computedStart;
    const hasTxOn = (d: Date) => transactions.some(t => isSameDay(new Date(t.date), d));
    for (let i = 0; i < 365; i++) {
      const day = subDays(endRef, i);
      if (day < startRef) break;
      if (hasTxOn(day)) break;
      streak++;
    }
    return streak;
  }, [transactions, computedStart, computedEnd]);

  // 5) Promedio por día
  const daysCount = Math.max(1, differenceInCalendarDays(computedEnd, computedStart) + 1);
  const dailyAvg = currentTotal / daysCount;

  // 6) Día más fuerte / más ligero
  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = format(d, "yyyy-MM-dd");
      map[key] = (map[key] || 0) + t.amount;
    });
    return map;
  }, [transactions]);
  const strongestDay = useMemo(() => {
    const entries = Object.entries(byDay);
    if (!entries.length) return null;
    const max = entries.slice().sort((a, b) => b[1] - a[1])[0];
    return { date: new Date(max[0]), total: max[1] };
  }, [byDay]);
  const lightestDay = useMemo(() => {
    const entries = Object.entries(byDay);
    if (!entries.length) return null;
    const min = entries.slice().sort((a, b) => a[1] - b[1])[0];
    return { date: new Date(min[0]), total: min[1] };
  }, [byDay]);

  // 7) Proyección del mes (solo si el rango es < 30 días)
  const projectionText = useMemo(() => {
    if (daysCount >= 30) return "";
    const monthStart = startOfMonth(computedStart);
    const monthEnd = endOfMonth(computedStart);
    const daysInMonth = Math.max(1, differenceInCalendarDays(monthEnd, monthStart) + 1);
    const projected = dailyAvg * daysInMonth;
    return `Proyección al cierre del mes: S/ ${projected.toFixed(2)}`;
  }, [daysCount, computedStart, dailyAvg]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl border-pastel-pink/30">
        <DialogHeader>
          <DialogTitle>✨ Insights del período</DialogTitle>
          <DialogDescription>
            {format(computedStart, "dd 'de' MMMM, yyyy", { locale: es })}
            {" "}
            <ChevronRight className="inline w-4 h-4 text-muted-foreground" />
            {" "}
            {format(computedEnd, "dd 'de' MMMM, yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InsightItem
            icon={<span> {changeEmoji} </span>}
            title="Cambio total de gasto"
            description={changeDescription}
          />
          <InsightItem
            icon={<span> 📈 </span>}
            title="Categoría con mayor aumento"
            description={typeof categoryIncrease === 'string' ? "Sin datos suficientes" : (<><span className="font-bold">{categoryIncrease.name}</span> aumentó +S/ {categoryIncrease.inc.toFixed(2)} respecto al período anterior.</>)}
          />
          <InsightItem
            icon={<span> 🌱 </span>}
            title="Racha sin gastos"
            description={`Llevas ${noExpenseStreak} días sin gastar.`}
          />
          <InsightItem
            icon={<span> 📊 </span>}
            title="Promedio diario"
            description={<>
              Promedio por día: <span className="font-bold">S/ {dailyAvg.toFixed(2)}</span>.
            </>}
          />
          <InsightItem
            icon={<span> 🔥 </span>}
            title="Día más fuerte"
            description={strongestDay ? <>Tu día más fuerte fue el {format(strongestDay.date, "dd/MM", { locale: es })} (S/ <span className="font-bold">{strongestDay.total.toFixed(2)}</span>).</> : "Sin datos"}
          />
          <InsightItem
            icon={<span> 🧊 </span>}
            title="Día más tranquilo"
            description={lightestDay ? <>Tu día más tranquilo fue el {format(lightestDay.date, "dd/MM", { locale: es })} (S/ <span className="font-bold">{lightestDay.total.toFixed(2)}</span>).</> : "Sin datos"}
          />
          {/* Proyección no solicitada en esta versión compacta */}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InsightsModal;
