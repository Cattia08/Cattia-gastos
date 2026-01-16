import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  PieChart,
  Calendar,
  CircleDollarSign,
  CreditCard,
  RefreshCcw,
  Wallet,
  Tag,
  TrendingUp
} from "lucide-react";
import { DatePeriodSelector, MultiSelectFilter } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import DashboardCard from "@/components/ui/DashboardCard";

import { ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import ExportButton from "@/components/export/ExportButton";
import InsightsModal from "@/components/InsightsModal";
import WeeklyHeatmap from "@/components/WeeklyHeatmap";

const COLORS = ["#5DBE8A", "#E879A8", "#B8A9E8", "#F5C869", "#7CB899"];

interface Expense {
  id: number;
  name: string;
  amount: number;
  date: string;
  categories?: {
    id: number;
    name: string;
    color: string;
  };
}

const Dashboard = () => {
  const { toast } = useToast();
  const { transactions, income, categories, loading, error } = useSupabaseData();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isFilteredDialogOpen, setIsFilteredDialogOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Calculate available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    years.add(currentYear); // Always include current year
    return Array.from(years).sort((a, b) => b - a); // Descending
  }, [transactions]);

  // Computed date range based on selectedYear and selectedMonth
  const dateRange = useMemo(() => {
    if (selectedMonth !== null) {
      const monthDate = new Date(selectedYear, selectedMonth, 1);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate)
      };
    }
    // Full year
    return {
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31, 23, 59, 59)
    };
  }, [selectedYear, selectedMonth]);

  // Previous period for comparison
  const previousRange = useMemo(() => {
    if (selectedMonth !== null) {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const monthDate = new Date(prevYear, prevMonth, 1);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate)
      };
    }
    // Previous full year
    return {
      start: new Date(selectedYear - 1, 0, 1),
      end: new Date(selectedYear - 1, 11, 31, 23, 59, 59)
    };
  }, [selectedYear, selectedMonth]);

  // Generate expense data for chart (daily breakdown of selected month)
  const generateExpenseData = (startDate: Date, endDate: Date, expenses: Expense[]) => {
    const dailyData = [];
    const totalDays = Math.min(31, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dayExpenses = expenses.filter(expense => isSameDay(new Date(expense.date), currentDate));
      const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      dailyData.push({
        day: format(currentDate, 'dd'),
        amount: totalAmount
      });
    }
    return dailyData;
  };

  // Calculate category data for pie chart
  const calculateCategoryData = (expenses: Expense[]) => {
    const categorySums: { [key: string]: { value: number; color?: string } } = {};
    expenses.forEach(expense => {
      const categoryName = expense.categories?.name || "Sin categoría";
      if (!categorySums[categoryName]) {
        categorySums[categoryName] = { value: 0, color: expense.categories?.color };
      }
      categorySums[categoryName].value += expense.amount;
    });
    return Object.entries(categorySums).map(([name, { value, color }]) => ({
      name,
      value: Number(value),
      color
    }));
  };

  // Apply filters whenever any filter value changes
  useEffect(() => {
    if (loading) return;

    let filtered = [...transactions];

    // Apply year/month filter
    filtered = filtered.filter(expense => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start: dateRange.start, end: dateRange.end });
    });

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(expense => expense.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Apply category filter
    if (selectedCategories.length > 0 && selectedCategories.length < categories.length) {
      filtered = filtered.filter(expense => selectedCategories.includes(expense.categories?.id));
    }

    setFilteredExpenses(filtered);
    if (selectedMonth !== null) {
      setExpenseData(generateExpenseData(dateRange.start, dateRange.end, filtered));
    }
  }, [searchQuery, selectedCategories, selectedYear, selectedMonth, transactions, loading, categories.length]);

  // Base filtered for calculations (without date filter for totals)
  const baseFiltered = useMemo(() => {
    return transactions.filter(expense => {
      const expenseDate = new Date(expense.date);
      const matchesDate = isWithinInterval(expenseDate, { start: dateRange.start, end: dateRange.end });
      const matchesSearch = !searchQuery || expense.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(expense.categories?.id);
      return matchesDate && matchesSearch && matchesCategory;
    });
  }, [transactions, dateRange, searchQuery, selectedCategories]);

  const totalMonth = useMemo(() => {
    return baseFiltered.reduce((sum, expense) => sum + expense.amount, 0);
  }, [baseFiltered]);

  const previousMonthTotal = useMemo(() => {
    return transactions.filter(expense => {
      const expenseDate = new Date(expense.date);
      return isWithinInterval(expenseDate, { start: previousRange.start, end: previousRange.end });
    }).reduce((sum, expense) => sum + expense.amount, 0);
  }, [transactions, previousRange]);

  // Period info for display
  const periodTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const daysCount = Math.max(1, differenceInCalendarDays(dateRange.end, dateRange.start) + 1);
  const dailyAvg = daysCount ? periodTotal / daysCount : 0;

  // Find day with max expense
  const maxExpense = filteredExpenses.reduce((max, expense) => (expense.amount > max.amount ? expense : max), {
    amount: 0,
    date: new Date()
  });

  const maxExpenseDate = filteredExpenses.length > 0 ? new Date(maxExpense.date) : new Date();
  const maxExpenseDay = filteredExpenses.length > 0 ? format(maxExpenseDate, "EEEE d 'de' MMMM", { locale: es }) : "-";

  // Calculate category data for pie chart
  const categoryDataForChart = calculateCategoryData(filteredExpenses);
  const topCategory = useMemo(() => {
    return categoryDataForChart.length > 0 ? categoryDataForChart.slice().sort((a, b) => b.value - a.value)[0].name : "-";
  }, [categoryDataForChart]);
  const topCategoryId = useMemo(() => {
    if (!filteredExpenses.length) return undefined;
    const sumById: Record<number, number> = {};
    filteredExpenses.forEach(exp => {
      const id = exp.categories?.id;
      if (!id && id !== 0) return;
      sumById[id] = (sumById[id] || 0) + exp.amount;
    });
    const entries = Object.entries(sumById).sort((a, b) => Number(b[1]) - Number(a[1]));
    const top = entries[0]?.[0];
    return top ? Number(top) : undefined;
  }, [filteredExpenses]);

  const rankingData = useMemo(() => {
    return categoryDataForChart.slice().sort((a, b) => b.value - a.value);
  }, [categoryDataForChart]);

  // Últimos 7 días para BarChart - usa transactions directamente para no depender del filtro de mes
  const last7Data = useMemo(() => {
    const today = new Date();
    const data = [] as { day: string; amount: number }[];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const totalAmount = transactions
        .filter(exp => isSameDay(new Date(exp.date), d))
        .reduce((sum, exp) => sum + exp.amount, 0);
      data.push({ day: format(d, "dd/MM"), amount: totalAmount });
    }
    return data;
  }, [transactions]);

  const monthData = useMemo(() => {
    return expenseData.map(d => ({ day: d.day, amount: d.amount }));
  }, [expenseData]);

  // Vista anual - filtra solo el año seleccionado
  const yearData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => new Date(t.date).getFullYear() === selectedYear)
      .forEach(t => {
        const d = new Date(t.date);
        const key = format(d, 'MMM', { locale: es });
        map[key] = (map[key] || 0) + t.amount;
      });
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return months.map(m => ({ day: m.charAt(0).toUpperCase() + m.slice(1), amount: map[m] || 0 }));
  }, [transactions, selectedYear]);

  // Datos del gráfico: mes seleccionado o año completo
  const trendData = selectedMonth !== null ? monthData : yearData;

  // Subtítulo del período para el gráfico de tendencias
  const trendSubtitle = useMemo(() => {
    if (selectedMonth !== null) {
      const monthDate = new Date(selectedYear, selectedMonth, 1);
      return format(monthDate, "MMMM yyyy", { locale: es });
    }
    return `Año ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = Number(payload[0].value || 0);
      return (
        <div className="bg-white rounded-lg shadow-card px-3 py-2 text-sm">
          <div className="font-medium">Fecha: {label}</div>
          <div className="text-gray-600">Monto: S/ {val.toFixed(2)}</div>
        </div>
      );
    }
    return null;
  };

  const renderRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const category = p.payload?.category;
      const value = Number(p.value || 0).toFixed(2);
      return (
        <div className="bg-white rounded-md shadow-md px-3 py-2 text-sm">
          <div className="font-medium">{category}</div>
          <div className="text-gray-600">S/ {value}</div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const applyTheme = () => setIsDark(document.documentElement.classList.contains('dark'));
    applyTheme();
    const handler = () => applyTheme();
    window.addEventListener('themechange', handler as any);
    return () => window.removeEventListener('themechange', handler as any);
  }, []);

  // Monthly category growth comparison
  const monthlyGrowthText = useMemo(() => {
    const currTotals: Record<number, number> = {};
    const prevTotals: Record<number, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const catId = t.categories?.id;
      if (!catId && catId !== 0) return;
      if (isWithinInterval(d, { start: dateRange.start, end: dateRange.end })) {
        currTotals[catId] = (currTotals[catId] || 0) + t.amount;
      }
      if (isWithinInterval(d, { start: previousRange.start, end: previousRange.end })) {
        prevTotals[catId] = (prevTotals[catId] || 0) + t.amount;
      }
    });
    const hasPrevData = Object.values(prevTotals).some(v => v > 0);
    if (!hasPrevData) return "Sin datos previos";
    const growthByCat: Array<{ id: number; name: string; pct: number }> = [];
    Object.keys(currTotals).forEach(k => {
      const id = Number(k);
      const curr = currTotals[id] || 0;
      const prev = prevTotals[id] || 0;
      const name = categories.find(c => c.id === id)?.name || "Sin categoría";
      if (prev > 0) {
        const pct = ((curr - prev) / prev) * 100;
        growthByCat.push({ id, name, pct });
      }
    });
    if (!growthByCat.length) return "Sin comparación";
    const mostUp = growthByCat.slice().sort((a, b) => b.pct - a.pct)[0];
    const mostDown = growthByCat.slice().sort((a, b) => a.pct - b.pct)[0];
    const upText = mostUp ? `${mostUp.name} ${mostUp.pct >= 0 ? '+' : ''}${Math.round(mostUp.pct)}%` : '';
    const downText = mostDown ? `${mostDown.name} ${mostDown.pct >= 0 ? '+' : ''}${Math.round(mostDown.pct)}%` : '';
    return `${upText}${mostDown ? ' • ' + downText : ''}`;
  }, [transactions, categories, dateRange, previousRange]);

  // Calculate income data
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const incomeTarget = 1500; // Este valor podría venir de una configuración
  const incomeTargetDiff = totalIncome - incomeTarget;
  const incomeTargetPercentage = incomeTarget ? (incomeTargetDiff / incomeTarget) * 100 : 0;
  const isIncomeTargetExceeded = incomeTargetDiff > 0;

  // Reset all filters
  const handleResetFilters = () => {
    const now = new Date();
    setSearchQuery("");
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setSelectedCategories(categories.map(cat => cat.id));
    toast({
      title: "Filtros restablecidos",
      description: "Se ha vuelto a la vista del mes actual"
    });
  };

  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(categories.map(cat => cat.id));
    }
  }, [categories]);

  // Generate sparkline data from historical months
  const sparklineMonthlyData = useMemo(() => {
    const data: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(selectedYear, (selectedMonth ?? 11) - i, 1);
      const monthEnd = endOfMonth(monthStart);
      const monthTotal = transactions
        .filter(t => {
          const d = new Date(t.date);
          return isWithinInterval(d, { start: monthStart, end: monthEnd });
        })
        .reduce((sum, t) => sum + t.amount, 0);
      data.push(monthTotal);
    }
    return data;
  }, [transactions, selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Skeleton header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="skeleton-shimmer h-14 w-64 rounded-xl" />
            <div className="skeleton-shimmer h-5 w-48 rounded-lg mt-3" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton-shimmer h-10 w-24 rounded-xl" />
            <div className="skeleton-shimmer h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Skeleton metric cards */}
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="skeleton-shimmer h-36 w-full max-w-lg rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="skeleton-shimmer h-24 rounded-2xl" />
            <div className="skeleton-shimmer h-24 rounded-2xl" />
            <div className="skeleton-shimmer h-24 rounded-2xl" />
          </div>
        </div>

        {/* Skeleton charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="skeleton-shimmer h-72 md:col-span-2 rounded-2xl" />
          <div className="skeleton-shimmer h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 view-transition">Error al cargar los datos: {error.message}</div>;
  }

  return (
    <div className="space-y-8 view-transition">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-text-emphasis dark:text-foreground">
              Hola, Catt!
              <Heart className="inline ml-3 w-8 h-8 text-theme-green animate-pulse" />
            </h1>
            <div className="mt-3 flex items-center text-text-secondary">
              <Calendar className="w-5 h-5 mr-2 text-theme-green" />
              <span className="text-base">{format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}</span>
            </div>
            {/* Year/Month selectors */}
            <DatePeriodSelector
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
              availableYears={availableYears}
              className="mt-4"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <ExportButton transactions={transactions} categories={categories} />
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="rounded-xl px-4 text-sm border-border hover:bg-pastel-mint/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Restablecer
          </Button>
          <Button
            variant="outline"
            className="rounded-xl px-4 text-sm border-border hover:bg-pastel-lavender/30 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all"
            onClick={() => setIsInsightsOpen(true)}
          >
            ✨ Insights
          </Button>
        </div>
      </div>

      {/* Metric Cards - Hierarchical Layout */}
      <div className="space-y-6">
        {/* Primary Metric: Gasto del Mes/Año */}
        <div className="flex justify-center">
          <DashboardCard
            title={selectedMonth !== null ? "Gasto del Mes" : "Gasto del Año"}
            value={periodTotal}
            icon={<CircleDollarSign className="w-10 h-10 text-theme-rose" />}
            iconColor="bg-pastel-rose"
            variant="primary"
            tint="rose"
            className="shadow-soft-md max-w-lg w-full"
            subtext={`vs. anterior: S/ ${previousMonthTotal.toFixed(2)}`}
            sparklineData={sparklineMonthlyData}
            interactive
            onClick={() => navigate('/transacciones', { state: { quickFilter: { type: 'period', start: dateRange.start, end: dateRange.end } } })}
          />
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <DashboardCard
            title="Gasto Total"
            value={periodTotal}
            icon={<Wallet className="w-6 h-6 text-theme-green" />}
            iconColor="bg-pastel-green"
            variant="secondary"
            tint="green"
            className="shadow-soft"
            interactive
            onClick={() => navigate('/transacciones', { state: { quickFilter: { type: 'all' } } })}
          />
          <DashboardCard
            title="Gasto Diario Promedio"
            value={dailyAvg.toFixed(2)}
            icon={<TrendingUp className="w-6 h-6 text-theme-sage" />}
            iconColor="bg-pastel-mint"
            variant="secondary"
            tint="sage"
            className="shadow-soft"
            subtext={`Periodo: ${trendSubtitle}`}
            interactive
          />
          <DashboardCard
            title="Categoría Top"
            value={topCategory}
            isCurrency={false}
            icon={<PieChart className="w-6 h-6 text-theme-lavender" />}
            iconColor="bg-pastel-lavender"
            variant="secondary"
            tint="lavender"
            className="shadow-soft"
            subtext={monthlyGrowthText}
            interactive
            onClick={() => topCategoryId && navigate('/transacciones', { state: { quickFilter: { type: 'category', id: topCategoryId } } })}
          />
        </div>
      </div>

      {/* Barra de filtros de categoría */}
      <div className="mt-2">
        <MultiSelectFilter
          label="Categorías"
          icon={Tag}
          iconColorClass="text-theme-lavender"
          items={categories}
          selectedIds={selectedCategories}
          onSelectionChange={setSelectedCategories}
          showCount={true}
        />
      </div>

      {/* Grid de gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">Tendencias</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{trendSubtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 cursor-pointer">
              {trendData.every(d => d.amount === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <span className="text-4xl mb-2">📊</span>
                  <p className="text-sm">No hay gastos en este período</p>
                  <p className="text-xs mt-1">¡Agrega tu primer gasto para ver las tendencias!</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFC6C2" />
                        <stop offset="100%" stopColor="#FFB7B2" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDark ? "#372f45" : "#e5e7eb"} />
                    <XAxis dataKey="day" padding={{ left: 20, right: 20 }} tick={{ fontSize: 12, fill: isDark ? "#E9E1EF" : "#4A404E" }} axisLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} tickLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} />
                    <YAxis tick={{ fill: isDark ? "#E9E1EF" : "##4A404E" }} axisLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} tickLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="amount" barSize={50} fill="url(#barGrad)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Ranking de Categorías</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {rankingData.length === 0 || rankingData.every(e => e.value === 0) ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <span className="text-4xl mb-2">🏆</span>
                <p className="text-sm">Sin categorías aún</p>
                <p className="text-xs mt-1">Tus gastos aparecerán aquí</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankingData.map((entry, index) => {
                  const total = rankingData.reduce((acc, e) => acc + e.value, 0);
                  const pct = total ? Math.round((entry.value / total) * 100) : 0;
                  const color = entry.color || COLORS[index % COLORS.length];
                  return (
                    <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}1A` }}>
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{entry.name}</div>
                          <div className="h-2 rounded-full bg-pink-100/60 w-full max-w-[120px]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold whitespace-nowrap">S/ {entry.value.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Estrella de Gastos</CardTitle>
              <Button variant="outline" size="icon" className="rounded-full border-pink-200 hover:bg-pink-50 hover:border-pink-300" onClick={() => setIsRadarOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-pink-500"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              {categoryDataForChart.length === 0 || categoryDataForChart.every(d => d.value === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <span className="text-4xl mb-2">⭐</span>
                  <p className="text-sm">Sin datos para mostrar</p>
                  <p className="text-xs mt-1">Tu estrella de gastos aparecerá aquí</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={categoryDataForChart.map(d => ({ category: d.name, value: d.value }))}>
                    <PolarGrid gridType="circle" stroke={isDark ? "rgba(233,225,239,0.25)" : "#f5f5f5"} />
                    <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={45} tick={false} />
                    <Tooltip content={renderRadarTooltip} />
                    <Radar dataKey="value" stroke="#FF7597" fill="#FF7597" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
        <WeeklyHeatmap
          transactions={filteredExpenses.map(e => ({ id: e.id, name: e.name, amount: e.amount, date: e.date, categories: e.categories }))}
          className="md:col-span-1"
        />
        <Dialog open={isRadarOpen} onOpenChange={setIsRadarOpen}>
          <DialogContent className="max-w-4xl bg-white rounded-2xl border-gray-200 shadow-soft-lg">
            <DialogHeader>
              <DialogTitle>Estrella de Gastos</DialogTitle>
              <DialogDescription>Explora tus gastos por categoría con detalle.</DialogDescription>
            </DialogHeader>
            <div className="h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryDataForChart.map(d => ({ category: d.name, value: d.value }))}>
                  <PolarGrid gridType="circle" stroke={isDark ? "rgba(233,225,239,0.25)" : "#e5e7eb"} />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: isDark ? "#E9E1EF" : "#4A404E" }} />
                  <PolarRadiusAxis angle={45} tick={{ fill: isDark ? "#E9E1EF" : "#4A404E" }} />
                  <Tooltip content={renderRadarTooltip} />
                  <Legend />
                  <Radar dataKey="value" stroke="#5DBE8A" fill="#5DBE8A" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <InsightsModal
        open={isInsightsOpen}
        onOpenChange={setIsInsightsOpen}
        transactions={filteredExpenses}
        periodStart={dateRange.start}
        periodEnd={dateRange.end}
        matchingTransactions={baseFiltered}
      />




    </div>
  );
};

export default Dashboard;
