import React, { useMemo } from "react";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTitle,
  ThemedDialogDescription,
} from "@/components/ui/ThemedDialog";
import { cn } from "@/lib/utils";
import { format, getDay, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { Sparkles } from "lucide-react";

type Tx = { id: number; name: string; amount: number; date: string; categories?: { id: number; name: string; color: string } };

interface InsightsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactions: Tx[];
  periodStart?: Date;
  periodEnd?: Date;
  matchingTransactions?: Tx[];
}

// Day names in Spanish
const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Insight card with personality
const InsightCard = ({
  emoji,
  title,
  highlight,
  detail,
  gradient = "from-primary/10 to-primary/5"
}: {
  emoji: string;
  title: string;
  highlight: string;
  detail?: string;
  gradient?: string;
}) => (
  <div className={cn(
    "rounded-2xl p-5 border transition-all hover:scale-[1.02]",
    `bg-gradient-to-br ${gradient} border-border/40`
  )}>
    <div className="text-3xl mb-3">{emoji}</div>
    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</div>
    <div className="text-xl font-bold text-foreground leading-tight">{highlight}</div>
    {detail && <div className="text-sm text-muted-foreground mt-1">{detail}</div>}
  </div>
);

// Spending personality based on patterns
const getSpendingPersonality = (weekdayPct: number, avgAmount: number, txCount: number) => {
  if (txCount === 0) return { emoji: "🌱", name: "Minimalista", desc: "Casi no has gastado" };

  if (weekdayPct > 80) return { emoji: "💼", name: "Planificador", desc: "Gastas principalmente entre semana" };
  if (weekdayPct < 40) return { emoji: "🎉", name: "Fin de semanero", desc: "Te gusta darte gustos el finde" };
  if (avgAmount < 20) return { emoji: "🐜", name: "Hormiguita", desc: "Muchas compras pequeñas" };
  if (avgAmount > 100) return { emoji: "🦁", name: "León", desc: "Pocas pero grandes compras" };
  return { emoji: "⚖️", name: "Equilibrado", desc: "Balance entre semana y finde" };
};

const InsightsModal = ({ open, onOpenChange, transactions, periodStart, periodEnd }: InsightsModalProps) => {
  const dates = transactions.map(t => new Date(t.date));
  const computedStart = periodStart || (dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date());
  const computedEnd = periodEnd || (dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date());

  const currentTotal = useMemo(() => transactions.reduce((s, t) => s + t.amount, 0), [transactions]);

  // Find favorite day of the week to spend
  const favoriteDay = useMemo(() => {
    if (!transactions.length) return null;
    const byDay: Record<number, number> = {};
    transactions.forEach(t => {
      const day = getDay(new Date(t.date));
      byDay[day] = (byDay[day] || 0) + t.amount;
    });
    const sorted = Object.entries(byDay).sort((a, b) => Number(b[1]) - Number(a[1]));
    if (!sorted.length) return null;
    const dayNum = Number(sorted[0][0]);
    return { day: dayNames[dayNum], amount: sorted[0][1] };
  }, [transactions]);

  // Most repeated purchase name (what do you buy the most?)
  const mostRepeated = useMemo(() => {
    if (!transactions.length) return null;
    const byName: Record<string, number> = {};
    transactions.forEach(t => {
      const name = t.name.toLowerCase().trim();
      byName[name] = (byName[name] || 0) + 1;
    });
    const sorted = Object.entries(byName).sort((a, b) => b[1] - a[1]);
    if (!sorted.length || sorted[0][1] < 2) return null;
    return { name: sorted[0][0], count: sorted[0][1] };
  }, [transactions]);

  // Biggest single purchase (splurge)
  const biggestPurchase = useMemo(() => {
    if (!transactions.length) return null;
    const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
    return sorted[0];
  }, [transactions]);

  // Weekday vs weekend analysis for personality
  const { weekdayPct, weekendTotal, weekdayTotal } = useMemo(() => {
    let weekday = 0, weekend = 0;
    transactions.forEach(t => {
      const day = getDay(new Date(t.date));
      if (day === 0 || day === 6) weekend += t.amount;
      else weekday += t.amount;
    });
    const total = weekday + weekend || 1;
    return {
      weekdayPct: (weekday / total) * 100,
      weekdayTotal: weekday,
      weekendTotal: weekend
    };
  }, [transactions]);

  // Average per transaction
  const avgPerTx = transactions.length ? currentTotal / transactions.length : 0;

  // Personality
  const personality = getSpendingPersonality(weekdayPct, avgPerTx, transactions.length);

  // Longest streak without spending (in period)
  const longestStreak = useMemo(() => {
    if (!transactions.length) return 0;
    const txDates = new Set(transactions.map(t => format(new Date(t.date), "yyyy-MM-dd")));
    let maxStreak = 0;
    let currentStreak = 0;
    const totalDays = differenceInCalendarDays(computedEnd, computedStart) + 1;

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(computedStart);
      d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      if (txDates.has(key)) {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 0;
      } else {
        currentStreak++;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);
    return maxStreak;
  }, [transactions, computedStart, computedEnd]);

  // Fun fact: what could you buy with this money
  const funFact = useMemo(() => {
    const options = [
      { min: 10, icon: "🍦", item: "helados", price: 8 },
      { min: 30, icon: "📚", item: "libros", price: 35 },
      { min: 50, icon: "🎮", item: "juegos", price: 60 },
      { min: 100, icon: "👟", item: "zapatillas", price: 150 },
      { min: 200, icon: "✈️", item: "vuelos nacionales", price: 250 },
      { min: 500, icon: "📱", item: "smartphones", price: 800 },
    ];

    // Find appropriate comparison
    const suitable = options.filter(o => currentTotal >= o.min).pop();
    if (!suitable) return null;

    const count = Math.floor(currentTotal / suitable.price);
    if (count < 1) return null;

    return { icon: suitable.icon, count, item: suitable.item };
  }, [currentTotal]);

  // No data state
  if (transactions.length === 0) {
    return (
      <ThemedDialog open={open} onOpenChange={onOpenChange}>
        <ThemedDialogContent size="lg" className="max-w-lg">
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔮</div>
            <div className="text-lg font-semibold text-foreground mb-2">Sin datos todavía</div>
            <div className="text-sm text-muted-foreground">
              Registra algunos gastos para descubrir tus insights
            </div>
          </div>
        </ThemedDialogContent>
      </ThemedDialog>
    );
  }

  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent size="lg" className="max-w-lg max-h-[90vh] overflow-y-auto">
        <ThemedDialogHeader>
          <ThemedDialogTitle icon={<Sparkles className="w-5 h-5" />}>
            Tus Insights
          </ThemedDialogTitle>
          <ThemedDialogDescription>
            {format(computedStart, "d 'de' MMMM", { locale: es })} — {format(computedEnd, "d 'de' MMMM", { locale: es })}
          </ThemedDialogDescription>
        </ThemedDialogHeader>

        <div className="space-y-4 mt-2">

          {/* Personality - The main insight */}
          <div className="bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-fuchsia-500/15 rounded-2xl p-6 border border-purple-500/20 text-center">
            <div className="text-5xl mb-3">{personality.emoji}</div>
            <div className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">Tu personalidad de gasto</div>
            <div className="text-2xl font-bold text-foreground mb-1">{personality.name}</div>
            <div className="text-sm text-muted-foreground">{personality.desc}</div>
          </div>

          {/* Grid of curious insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Favorite day */}
            {favoriteDay && (
              <InsightCard
                emoji="📅"
                title="Tu día favorito para gastar"
                highlight={favoriteDay.day}
                detail={`S/ ${favoriteDay.amount.toFixed(0)} en total`}
                gradient="from-blue-500/10 to-cyan-500/10"
              />
            )}

            {/* Most repeated purchase */}
            {mostRepeated && (
              <InsightCard
                emoji="🔁"
                title="Lo que más repites"
                highlight={mostRepeated.name}
                detail={`${mostRepeated.count} veces`}
                gradient="from-amber-500/10 to-orange-500/10"
              />
            )}

            {/* Biggest splurge */}
            {biggestPurchase && biggestPurchase.amount > avgPerTx * 1.5 && (
              <InsightCard
                emoji="💸"
                title="Tu mayor capricho"
                highlight={biggestPurchase.name}
                detail={`S/ ${biggestPurchase.amount.toFixed(2)}`}
                gradient="from-rose-500/10 to-pink-500/10"
              />
            )}

            {/* Longest streak without spending */}
            {longestStreak >= 2 && (
              <InsightCard
                emoji="🌿"
                title="Tu mejor racha de ahorro"
                highlight={`${longestStreak} días`}
                detail="sin gastar"
                gradient="from-emerald-500/10 to-green-500/10"
              />
            )}
          </div>

          {/* Fun fact at the bottom */}
          {funFact && (
            <div className="bg-muted/40 rounded-xl p-4 border border-border/30 text-center">
              <div className="text-sm text-muted-foreground">
                Con S/ {currentTotal.toFixed(0)} podrías comprar{" "}
                <span className="font-semibold text-foreground">
                  {funFact.count} {funFact.icon} {funFact.item}
                </span>
              </div>
            </div>
          )}

        </div>
      </ThemedDialogContent>
    </ThemedDialog>
  );
};

export default InsightsModal;
