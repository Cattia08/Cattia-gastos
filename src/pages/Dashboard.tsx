import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Heart,
  Star,
  PieChart,
  ArrowUp,
  ArrowDown,
  Calendar,
  Search,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  RefreshCcw,
  Wallet,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import DashboardCard from "@/components/ui/DashboardCard";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import MonthSelector from "@/components/ui/MonthSelector";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, subMonths, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
// Export UI moved to reusable components
import { useSupabaseData } from "@/hooks/useSupabaseData";
// Local export libs removed here (handled inside ExportModal)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import ExportButton from "@/components/export/ExportButton";
import InsightsModal from "@/components/InsightsModal";
import FilterBar from "@/components/FilterBar";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider as UiTooltipProvider, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";
import WeeklyHeatmap from "@/components/WeeklyHeatmap";

const COLORS = ["#FF7597", "#A594F9", "#6BCB77", "#FFD93D", "#FF6B6B"];

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [isFilteredDialogOpen, setIsFilteredDialogOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  // Previous month data for comparison
  const previousMonth = subMonths(currentMonth, 1);

  // Generate expense data for chart
  const generateExpenseData = (month: Date, filteredExpenses = transactions) => {
    const startDate = startOfMonth(month);
    const endDate = endOfMonth(month);
    const daysInMonth = endDate.getDate();

    const dailyData = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(month.getFullYear(), month.getMonth(), i);
      const dayExpenses = filteredExpenses.filter(expense => isSameDay(new Date(expense.date), currentDate));

      const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

      dailyData.push({
        day: i.toString().padStart(2, "0"),
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

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(expense => expense.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Apply category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(expense => selectedCategories.includes(expense.categories?.id));
    }

    // Apply date filter
    if (selectedDate) {
      if (endDate) {
        // Range selection
        filtered = filtered.filter(expense =>
          isWithinInterval(new Date(expense.date), {
            start: selectedDate,
            end: endDate
          })
        );
      } else {
        // Single date selection
        filtered = filtered.filter(expense => isSameDay(new Date(expense.date), selectedDate));
      }
    } else {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      filtered = filtered.filter(expense => isWithinInterval(new Date(expense.date), { start, end }));
    }

    setFilteredExpenses(filtered);
    setExpenseData(generateExpenseData(currentMonth, filtered));

    // Show toast when filters are applied
    if (searchQuery || selectedCategories.length > 0 || selectedDate) {
      toast({
        title: "Filtros aplicados",
        description: "Los datos han sido filtrados según tus preferencias"
      });
    }
  }, [searchQuery, selectedCategories, selectedDate, endDate, currentMonth, transactions, loading]);

  // Calculate current vs previous month totals (ignoring explicit date range filter)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const prevStart = startOfMonth(previousMonth);
  const prevEnd = endOfMonth(previousMonth);

  const baseFiltered = useMemo(() => {
    return transactions.filter(expense => {
      const matchesSearch = !searchQuery || expense.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(expense.categories?.id);
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchQuery, selectedCategories]);

  const totalMonth = useMemo(() => {
    return baseFiltered
      .filter(expense => isWithinInterval(new Date(expense.date), { start: monthStart, end: monthEnd }))
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [baseFiltered, monthStart, monthEnd]);

  const previousMonthTotal = useMemo(() => {
    return baseFiltered
      .filter(expense => isWithinInterval(new Date(expense.date), { start: prevStart, end: prevEnd }))
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [baseFiltered, prevStart, prevEnd]);

  const hasDateFilter = !!selectedDate;
  const periodTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const periodStart = hasDateFilter ? (selectedDate as Date) : monthStart;
  const periodEnd = hasDateFilter ? (endDate || (selectedDate as Date)) : monthEnd;
  const daysCount = Math.max(1, differenceInCalendarDays(periodEnd, periodStart) + 1);
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

  // Últimos 7 días para BarChart
  const last7Data = useMemo(() => {
    const today = new Date();
    const data = [] as { day: string; amount: number }[];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const totalAmount = filteredExpenses
        .filter(exp => isSameDay(new Date(exp.date), d))
        .reduce((sum, exp) => sum + exp.amount, 0);
      data.push({ day: format(d, "dd/MM"), amount: totalAmount });
    }
    return data;
  }, [filteredExpenses]);

  const monthData = useMemo(() => {
    return expenseData.map(d => ({ day: d.day, amount: d.amount }));
  }, [expenseData]);

  const yearData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = format(d, 'MMM');
      map[key] = (map[key] || 0) + t.amount;
    });
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months.map(m => ({ day: m, amount: map[m] || 0 }));
  }, [transactions]);

  const trendData = trendPeriod === 'week' ? last7Data : trendPeriod === 'month' ? monthData : yearData;

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
      if (isWithinInterval(d, { start: monthStart, end: monthEnd })) {
        currTotals[catId] = (currTotals[catId] || 0) + t.amount;
      }
      if (isWithinInterval(d, { start: prevStart, end: prevEnd })) {
        prevTotals[catId] = (prevTotals[catId] || 0) + t.amount;
      }
    });
    const hasPrevData = Object.values(prevTotals).some(v => v > 0);
    if (!hasPrevData) return "Sin datos suficientes";
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
    if (!growthByCat.length) return "Sin datos suficientes";
    const mostUp = growthByCat.slice().sort((a, b) => b.pct - a.pct)[0];
    const mostDown = growthByCat.slice().sort((a, b) => a.pct - b.pct)[0];
    const upText = mostUp ? `${mostUp.name} ${mostUp.pct >= 0 ? '+' : ''}${Math.round(mostUp.pct)}%` : '';
    const downText = mostDown ? `${mostDown.name} ${mostDown.pct >= 0 ? '+' : ''}${Math.round(mostDown.pct)}%` : '';
    return `${upText}${mostDown ? ' • ' + downText : ''}`;
  }, [transactions, categories, monthStart, monthEnd, prevStart, prevEnd]);

  // Calculate income data
  const totalIncome = income.reduce((sum, inc) => sum + inc.amount, 0);
  const incomeTarget = 1500; // Este valor podría venir de una configuración
  const incomeTargetDiff = totalIncome - incomeTarget;
  const incomeTargetPercentage = incomeTarget ? (incomeTargetDiff / incomeTarget) * 100 : 0;
  const isIncomeTargetExceeded = incomeTargetDiff > 0;

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDate(undefined);
    setEndDate(undefined);
    toast({
      title: "Filtros restablecidos",
      description: "Se ha vuelto a la vista general"
    });
  };

  const handleExport = (format: "excel" | "pdf") => {
    if (filteredExpenses.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay gastos en el período seleccionado",
        variant: "destructive"
      });
      return;
    }
    if (format === "excel") {
      // Exportar a Excel
      const ws = XLSX.utils.json_to_sheet(filteredExpenses.map(exp => ({
        Nombre: exp.name,
        Monto: exp.amount,
        Fecha: new Date(exp.date).toLocaleDateString(),
        Categoría: exp.categories?.name || "Sin categoría"
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gastos");
      XLSX.writeFile(wb, "gastos_dashboard.xlsx");
      toast({
        title: "Exportado a Excel",
        description: `Se han exportado ${filteredExpenses.length} gastos en formato Excel`
      });
    } else if (format === "pdf") {
      // Exportar a PDF
      const doc = new jsPDF();
      doc.setFontSize(12);
      doc.text("Gastos exportados", 10, 10);
      let y = 20;
      filteredExpenses.forEach((exp, idx) => {
        doc.text(
          `${idx + 1}. ${exp.name} | S/ ${exp.amount} | ${new Date(exp.date).toLocaleDateString()} | ${exp.categories?.name || "Sin categoría"}`,
          10,
          y
        );
        y += 8;
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });
      doc.save("gastos_dashboard.pdf");
      toast({
        title: "Exportado a PDF",
        description: `Se han exportado ${filteredExpenses.length} gastos en formato PDF`
      });
    }
  };

  // Total de gastos acumulados (toda la data)
  const totalAll = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(categories.map(cat => cat.id));
    }
  }, [categories]);

  const handleCategoryCheck = (id) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleOpenExportDialog = () => {
    setExportCategories(categories.map(cat => cat.id));
    setExportMode('all');
    setExportMonths([]);
    setExportStartDate(undefined);
    setExportEndDate(undefined);
    setIsExportDialogOpen(true);
  };

  const handleExportConfirm = async () => {
    let filtered = [...transactions];
    if (exportMode === 'range' && exportStartDate) {
      if (exportEndDate) {
        filtered = filtered.filter(t => new Date(t.date) >= exportStartDate && new Date(t.date) <= exportEndDate);
      } else {
        filtered = filtered.filter(t => isSameDay(new Date(t.date), exportStartDate));
      }
    }
    if (exportMode === 'months' && exportMonths.length > 0) {
      filtered = filtered.filter(t => exportMonths.includes(`${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}`));
    }
    if (exportCategories.length > 0) {
      filtered = filtered.filter(t => exportCategories.includes(t.categories?.id));
    }
    if (filtered.length === 0) {
      toast({ title: 'No hay datos para exportar', description: 'No hay gastos en el período seleccionado', variant: 'destructive' });
      return;
    }
    if (exportMode === 'excel') {
      const sortedForExcel = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const ws = XLSX.utils.json_to_sheet(sortedForExcel.map(t => ({
        Nombre: t.name,
        Monto: t.amount,
        Categoría: t.categories?.name || 'Sin categoría',
        Fecha: new Date(t.date).toLocaleDateString()
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gastos");
      XLSX.writeFile(wb, "gastos_dashboard.xlsx");
      toast({ title: "Exportado a Excel", description: `Se han exportado ${sortedForExcel.length} gastos en formato Excel` });
      setIsExportDialogOpen(false);
      return;
    }
    // Exportar a PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFillColor(255, 183, 178);
    doc.rect(0, 0, 210, 36, 'F');
    const img = new Image();
    img.src = '/Foto-Catt.jpg';
    await new Promise(res => { img.onload = res; });
    doc.addImage(img, 'JPEG', 10, 6, 24, 24, undefined, 'FAST');
    doc.setFontSize(22);
    doc.setTextColor(255, 87, 127);
    doc.text('Reporte de gastos de Catt<3', 40, 20);
    let dateText = '';
    if (exportMode === 'all') {
      dateText = 'Todas las fechas';
    } else if (exportMode === 'range' && exportStartDate) {
      if (exportEndDate) {
        dateText = `Del ${exportStartDate.toLocaleDateString()} al ${exportEndDate.toLocaleDateString()}`;
      } else {
        dateText = `Día: ${exportStartDate.toLocaleDateString()}`;
      }
    } else if (exportMode === 'months' && exportMonths.length > 0) {
      dateText = exportMonths
        .map(month => format(new Date(month + '-01'), 'MMMM yyyy', { locale: es }))
        .join(', ');
    }
    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(dateText, 40, 28);
    // Cards resumen igual que en transacciones
    const total = filtered.reduce((sum, t) => sum + t.amount, 0);
    const uniqueDays = Array.from(new Set(filtered.map(t => new Date(t.date).toLocaleDateString())));
    const dailyAvg = uniqueDays.length > 0 ? total / uniqueDays.length : 0;
    const maxDay = uniqueDays.map(day => ({
      day,
      total: Number(filtered.filter(t => new Date(t.date).toLocaleDateString() === day).reduce((sum, t) => sum + t.amount, 0))
    })).sort((a, b) => b.total - a.total)[0];
    const categoryCount = {};
    filtered.forEach(t => {
      const cat = t.categories?.name || 'Sin categoría';
      categoryCount[cat] = (categoryCount[cat] || 0) + t.amount;
    });
    const topCategory = Object.entries(categoryCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    const cardY = 40;
    const cardH = 36;
    const cardW = 90;
    const cardPad = 6;
    // Total
    doc.setFillColor(232, 246, 239); // pastel green
    doc.roundedRect(12, cardY, cardW, cardH, 8, 8, 'F');
    doc.setFontSize(15);
    doc.setTextColor(46, 125, 50);
    doc.text('Total', 12 + cardW / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`S/ ${total.toFixed(2)}`, 12 + cardW / 2, cardY + 24, { align: 'center' });
    // Promedio diario
    doc.setFillColor(255, 255, 204); // pastel yellow
    doc.roundedRect(108, cardY, cardW, cardH, 8, 8, 'F');
    doc.setFontSize(15);
    doc.setTextColor(255, 193, 7);
    doc.text('Promedio diario', 108 + cardW / 2, cardY + 12, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`S/ ${dailyAvg.toFixed(2)}`, 108 + cardW / 2, cardY + 24, { align: 'center' });
    // Día con más gasto
    doc.setFillColor(255, 224, 178); // pastel orange
    doc.roundedRect(12, cardY + cardH + cardPad, cardW, cardH, 8, 8, 'F');
    doc.setFontSize(15);
    doc.setTextColor(255, 152, 0);
    doc.text('Día con más gasto', 12 + cardW / 2, cardY + cardH + cardPad + 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${maxDay ? maxDay.day + ' (S/ ' + Number(maxDay.total).toFixed(2) + ')' : '-'}`, 12 + cardW / 2, cardY + cardH + cardPad + 24, { align: 'center' });
    // Categoría con más gasto
    doc.setFillColor(197, 225, 165); // pastel lime
    doc.roundedRect(108, cardY + cardH + cardPad, cardW, cardH, 8, 8, 'F');
    doc.setFontSize(15);
    doc.setTextColor(85, 139, 47);
    doc.text('Categoría top', 108 + cardW / 2, cardY + cardH + cardPad + 12, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${topCategory ? topCategory[0] + ' (S/ ' + Number(topCategory[1]).toFixed(2) + ')' : '-'}`, 108 + cardW / 2, cardY + cardH + cardPad + 24, { align: 'center' });
    // Separador
    const sepY = cardY + cardH * 2 + 18;
    doc.setDrawColor(255, 183, 178);
    doc.line(12, sepY, 198, sepY);
    // Tabla de detalle de gastos (ordenada por fecha)
    const sortedFiltered = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const tableY = sepY + 8;
    doc.setFontSize(13);
    doc.setTextColor(80, 80, 80);
    doc.text('Detalle de gastos', 14, tableY);
    const tableHeaders = ['Fecha', 'Nombre', 'Monto', 'Categoría'];
    const colWidths = [32, 70, 28, 50];
    let y = tableY + 6;
    doc.setFillColor(255, 183, 178);
    doc.setTextColor(255, 87, 127);
    doc.roundedRect(12, y - 5, 186, 8, 2, 2, 'F');
    let x = 14;
    tableHeaders.forEach((h, i) => {
      doc.text(h, x, y);
      x += colWidths[i];
    });
    doc.setFontSize(11);
    sortedFiltered.forEach((t, idx) => {
      y += 7;
      x = 14;
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(12, y - 5, 186, 7, 'F');
      } else {
        doc.setFillColor(245, 245, 245);
        doc.rect(12, y - 5, 186, 7, 'F');
      }
      doc.setTextColor(80, 80, 80);
      doc.text(new Date(t.date).toLocaleDateString(), x, y);
      x += colWidths[0];
      doc.text(t.name, x, y);
      x += colWidths[1];
      doc.text(`S/ ${t.amount.toFixed(2)}`, x, y);
      x += colWidths[2];
      doc.text(t.categories?.name || 'Sin categoría', x, y);
    });
    // Pie de página
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text('Generado por ControlGastos-Catt', 12, 287);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 120, 287);
    doc.save('reporte-gastos-dashboard.pdf');
    toast({ title: "Exportado a PDF", description: `Se han exportado ${filtered.length} gastos.` });
    setIsExportDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">Error al cargar los datos: {error.message}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              Hola, Catt!
              <Heart className="inline ml-2 w-6 h-6 text-pastel-pink" />
            </h1>
            <div className="mt-2 flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2 text-pastel-blue" />
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <ExportButton transactions={transactions} categories={categories} />

          <Button
            variant="default"
            onClick={handleResetFilters}
            className="rounded-full px-3 text-sm"
          >
            <RefreshCcw className="w-3 h-3 mr-1" /> Restablecer
          </Button>
          <Button
            variant="outline"
            className="rounded-full px-3 text-sm border-pastel-pink/30"
            onClick={() => setIsInsightsOpen(true)}
          >
            ✨ Insights
          </Button>
        </div>
      </div>

      

      {/* Resumen del rango filtrado con botón para ver detalle en popup */}
      {selectedDate && (
        <div className="card-pastel p-4 animate-fade-in dark:bg-gray-800 dark:border-pastel-pink/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium mb-3 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-pastel-blue" />
              Gastos del {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}
              {endDate && ` al ${format(endDate, "dd 'de' MMMM, yyyy", { locale: es })}`}
            </h3>
            <Button
              variant="outline"
              className="rounded-full px-3 text-sm border-pastel-pink/30"
              onClick={() => setIsFilteredDialogOpen(true)}
            >
              Ver transacciones filtradas
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredExpenses.length} transacciones • Total S/ {filteredExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}
          </div>
        </div>
      )}

      <Dialog open={isFilteredDialogOpen} onOpenChange={setIsFilteredDialogOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl border-pastel-pink/30">
          <DialogHeader>
            <DialogTitle>Transacciones filtradas</DialogTitle>
            <DialogDescription>
              {selectedDate && (
                <>Periodo: {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: es })}{endDate && ` al ${format(endDate, "dd 'de' MMMM, yyyy", { locale: es })}`}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Fecha</th>
                    <th className="text-left py-2 px-3 font-medium">Concepto</th>
                    <th className="text-left py-2 px-3 font-medium">Categoría</th>
                    <th className="text-right py-2 px-3 font-medium">Monto (S/)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredExpenses.length > 0 ? (
                    [...filteredExpenses]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(expense => (
                        <tr key={expense.id} className="hover:bg-muted/50">
                          <td className="py-2 px-3">{new Date(expense.date).toLocaleDateString()}</td>
                          <td className="py-2 px-3">{expense.name}</td>
                          <td className="py-2 px-3">{expense.categories?.name || 'Sin categoría'}</td>
                          <td className="py-2 px-3 text-right font-medium">S/ {expense.amount.toFixed(2)}</td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-muted-foreground">
                        No hay gastos para el período seleccionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsFilteredDialogOpen(false)} className="rounded-full px-3 text-sm border-pastel-pink/30">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-7 mt-6">
        {/* Fila 1: Resumen */}
        <DashboardCard
          title="Gasto Total"
          value={periodTotal}
          icon={<Wallet className="w-7 h-7 text-pastel-blue" />}
          iconColor="bg-pastel-blue/10"
          className="shadow-soft-glow"
          interactive
          emphasis
          onClick={() => navigate('/transacciones', { state: { quickFilter: { type: 'all' } } })}
        />
        <DashboardCard
          title={hasDateFilter ? "Gasto en Rango" : "Gasto Total del Mes"}
          value={periodTotal}
          icon={<CircleDollarSign className="w-7 h-7 text-pastel-pink" />}
          iconColor="bg-pastel-pink/10"
          className="shadow-soft-glow"
          subtext={hasDateFilter ? undefined : `vs. mes anterior: S/ ${previousMonthTotal.toFixed(2)}`}
          interactive
          emphasis
          onClick={() => navigate('/transacciones', { state: { quickFilter: { type: 'month', start: monthStart, end: monthEnd } } })}
        />
        <DashboardCard
          title="Gasto Diario Promedio"
          value={dailyAvg.toFixed(2)}
          icon={<CreditCard className="w-7 h-7 text-pastel-green" />}
          iconColor="bg-pastel-green/10"
          className="shadow-soft-glow"
          subtext={`Periodo: ${format(currentMonth, 'MMMM yyyy', { locale: es })}`}
          interactive
        />
        <DashboardCard
          title="Categoría Top"
          value={topCategory}
          isCurrency={false}
          icon={<PieChart className="w-7 h-7 text-pastel-purple" />}
          iconColor="bg-pastel-purple/10"
          className="shadow-soft-glow"
          subtext={monthlyGrowthText}
          interactive
          emphasis
          onClick={() => topCategoryId && navigate('/transacciones', { state: { quickFilter: { type: 'category', id: topCategoryId } } })}
        />

        

        
        </div>

      <div className="mt-4">
        <FilterBar
          categories={categories}
          selectedCategories={selectedCategories}
          onSelectedCategoriesChange={setSelectedCategories}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedDate={selectedDate}
          endDate={endDate}
          onDateSelect={setSelectedDate}
          onRangeSelect={setEndDate}
          onReset={() => { setSearchQuery(''); setSelectedDate(undefined); setEndDate(undefined); setSelectedCategories(categories.map(c=>c.id)); }}
          expenses={transactions.map(t => ({ date: new Date(t.date), amount: t.amount }))}
        />
      </div>

      {/* Grid de gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
      <Card className="md:col-span-2">
        <CardHeader className="pb-3 flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Tendencias</CardTitle>
          <div className="flex items-center gap-2">
              <button onClick={() => setTrendPeriod('week')} className={`px-3 py-1 rounded-full ${trendPeriod==='week' ? 'bg-pastel-pink/20 text-primary ring-1 ring-pastel-pink/40' : 'hover:bg-pastel-pink/10'}`}>Semana</button>
              <button onClick={() => setTrendPeriod('month')} className={`px-3 py-1 rounded-full ${trendPeriod==='month' ? 'bg-pastel-pink/20 text-primary ring-1 ring-pastel-pink/40' : 'hover:bg-pastel-pink/10'}`}>Mes</button>
              <button onClick={() => setTrendPeriod('year')} className={`px-3 py-1 rounded-full ${trendPeriod==='year' ? 'bg-pastel-pink/20 text-primary ring-1 ring-pastel-pink/40' : 'hover:bg-pastel-pink/10'}`}>Año</button>
          </div>
        </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 cursor-pointer">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} key={trendPeriod}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFC6C2" />
                      <stop offset="100%" stopColor="#FFB7B2" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={isDark ? "#372f45" : "#e5e7eb"} />
                  <XAxis dataKey="day" padding={{ left: 20, right: 20 }} tick={{ fontSize: 12, fill: isDark ? "#E9E1EF" : "#4A404E" }} axisLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} tickLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} />
                  <YAxis tick={{ fill: isDark ? "#E9E1EF" : "#4A404E" }} axisLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} tickLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="amount" barSize={50} fill="url(#barGrad)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">Ranking de Categorías</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {rankingData.map((entry, index) => {
                  const total = rankingData.reduce((acc, e) => acc + e.value, 0);
                  const pct = total ? Math.round((entry.value / total) * 100) : 0;
                  const color = entry.color || COLORS[index % COLORS.length];
                  return (
                    <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: `${color}1A` }} />
                        <div className="w-40">
                          <div className="text-sm font-medium">{entry.name}</div>
                          <div className="h-2 rounded-full bg-pink-100/60">
                            <div className={`h-full ${["bg-green-300","bg-orange-300","bg-blue-300"][index % 3]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold">S/ {entry.value.toFixed(2)}</div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Estrella de Gastos</CardTitle>
              <Button variant="outline" size="icon" className="rounded-full border-pink-200 hover:bg-pink-50 hover:border-pink-300" onClick={() => setIsRadarOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-pink-500"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryDataForChart.map(d => ({ category: d.name, value: d.value }))}>
                  <PolarGrid gridType="circle" stroke={isDark ? "rgba(233,225,239,0.25)" : "#f5f5f5"} />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={45} tick={false} />
                  <Tooltip content={renderRadarTooltip} />
                  <Radar dataKey="value" stroke="#FF7597" fill="#FF7597" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <WeeklyHeatmap
          transactions={filteredExpenses.map(e => ({ id: e.id, amount: e.amount, date: e.date }))}
          className="md:col-span-1"
        />
        <Dialog open={isRadarOpen} onOpenChange={setIsRadarOpen}>
          <DialogContent className="max-w-4xl bg-white rounded-2xl border-pink-200">
            <DialogHeader>
              <DialogTitle>Estrella de Gastos</DialogTitle>
              <DialogDescription>Explora tus gastos por categoría con detalle.</DialogDescription>
            </DialogHeader>
            <div className="h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={categoryDataForChart.map(d => ({ category: d.name, value: d.value }))}>
                  <PolarGrid gridType="circle" stroke={isDark ? "rgba(233,225,239,0.25)" : "#f5f5f5"} />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: isDark ? "#E9E1EF" : "#4A404E" }} />
                  <PolarRadiusAxis angle={45} tick={{ fill: isDark ? "#E9E1EF" : "#4A404E" }} />
                  <Tooltip content={renderRadarTooltip} />
                  <Legend />
                  <Radar dataKey="value" stroke="#FF7597" fill="#FF7597" fillOpacity={0.4} />
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
        periodStart={periodStart}
        periodEnd={periodEnd}
        matchingTransactions={baseFiltered}
      />

      

      
    </div>
  );
};

export default Dashboard;
