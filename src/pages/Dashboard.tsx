import React, { useState, useEffect, useMemo } from "react";
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
  FileSpreadsheet,
  FileType2,
  Wallet,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import DashboardCard from "@/components/ui/DashboardCard";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { ResponsiveContainer, Tooltip, BarChart, Bar } from "recharts";
import { XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip, Legend } from "recharts";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import MonthSelector from "@/components/ui/MonthSelector";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import FilterBar from "@/components/FilterBar";
import { Tooltip as UiTooltip, TooltipContent as UiTooltipContent, TooltipProvider as UiTooltipProvider, TooltipTrigger as UiTooltipTrigger } from "@/components/ui/tooltip";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [exportCategories, setExportCategories] = useState([]);
  const [exportMode, setExportMode] = useState('all');
  const uniqueMonths: string[] = Array.from(
    new Set<string>(
      transactions.map(t => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a));
  const [exportMonths, setExportMonths] = useState<string[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));
  const [isRadarOpen, setIsRadarOpen] = useState(false);

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

  // Calculate filtered stats
  const totalMonth = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dailyAvg = filteredExpenses.length > 0 ? totalMonth / filteredExpenses.length : 0;

  // Find day with max expense
  const maxExpense = filteredExpenses.reduce((max, expense) => (expense.amount > max.amount ? expense : max), {
    amount: 0,
    date: new Date()
  });

  const maxExpenseDate = filteredExpenses.length > 0 ? new Date(maxExpense.date) : new Date();
  const maxExpenseDay = filteredExpenses.length > 0 ? format(maxExpenseDate, "EEEE d 'de' MMMM", { locale: es }) : "-";

  // Find top category
  const categoryCount: { [key: string]: number } = {};
  filteredExpenses.forEach(expense => {
    const categoryName = expense.categories?.name || "Sin categoría";
    categoryCount[categoryName] = (categoryCount[categoryName] || 0) + 1;
  });

  const topCategory =
    filteredExpenses.length > 0
      ? Object.entries(categoryCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0]
      : "-";

  // Calculate category data for pie chart
  const categoryDataForChart = calculateCategoryData(filteredExpenses);

  const rankingData = useMemo(() => {
    const sorted = categoryDataForChart.slice().sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 4);
    const others = sorted.slice(4);
    const othersTotal = others.reduce((sum, e) => sum + e.value, 0);
    if (othersTotal > 0) {
      return [...top, { name: 'Otros', value: othersTotal, color: '#A3A3A3', list: others.map(o => ({ name: o.name, value: o.value })) }];
    }
    return sorted.slice(0, 5);
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30">
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar a Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenExportDialog}>
                <FileType2 className="w-4 h-4 mr-2" /> Exportar a PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="rounded-full px-3 text-sm border-pastel-pink/30"
          >
            <RefreshCcw className="w-3 h-3 mr-1" /> Restablecer
          </Button>
        </div>
      </div>

      

      {/* Show selected date expenses if a date is selected */}
      {selectedDate && (
        <div className="card-pastel p-4 animate-fade-in dark:bg-gray-800 dark:border-pastel-pink/20">
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-pastel-blue" />
            Gastos del {format(selectedDate, "dd 'de' MMMM, yyyy")}
            {endDate && ` al ${format(endDate, "dd 'de' MMMM, yyyy")}`}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Concepto</th>
                  <th className="text-left py-2 px-3 font-medium">Categoría</th>
                  <th className="text-right py-2 px-3 font-medium">Monto (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3">{expense.name}</td>
                      <td className="py-2 px-3">{expense.categories?.name}</td>
                      <td className="py-2 px-3 text-right font-medium">S/ {expense.amount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      No hay gastos para el período seleccionado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Fila 1: Resumen */}
        <DashboardCard
          title="Gasto Total del Mes"
          value={totalMonth}
          icon={<CircleDollarSign className="w-7 h-7 text-pastel-pink" />}
          iconColor="bg-pastel-pink/10"
          className="shadow-soft-glow"
          subtext={`vs. mes anterior`}
        />
        <div data-catwalker="rest-daily">
          <DashboardCard
            title="Gasto Diario Promedio"
            value={dailyAvg.toFixed(2)}
            icon={<CreditCard className="w-7 h-7 text-pastel-green" />}
            iconColor="bg-pastel-green/10"
            className="shadow-soft-glow"
            subtext={`Periodo: ${format(currentMonth, 'MMMM yyyy', { locale: es })}`}
          />
        </div>
        <DashboardCard
          title="Categoría Top"
          value={topCategory}
          isCurrency={false}
          icon={<PieChart className="w-7 h-7 text-pastel-purple" />}
          iconColor="bg-pastel-purple/10"
          className="shadow-soft-glow"
          subtext={`Más gasto este mes`}
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
              <button onClick={() => setTrendPeriod('week')} className={`px-3 py-1 rounded-full ${trendPeriod==='week' ? 'bg-pastel-pink/20 text-primary' : 'hover:bg-pastel-pink/10'}`}>Semana</button>
              <button onClick={() => setTrendPeriod('month')} className={`px-3 py-1 rounded-full ${trendPeriod==='month' ? 'bg-pastel-pink/20 text-primary' : 'hover:bg-pastel-pink/10'}`}>Mes</button>
              <button onClick={() => setTrendPeriod('year')} className={`px-3 py-1 rounded-full ${trendPeriod==='year' ? 'bg-pastel-pink/20 text-primary' : 'hover:bg-pastel-pink/10'}`}>Año</button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} key={trendPeriod}>
                  <CartesianGrid vertical={false} stroke={isDark ? "#372f45" : "#e5e7eb"} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: isDark ? "#E9E1EF" : "#4A404E" }} axisLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} tickLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} />
                  <YAxis tick={{ fill: isDark ? "#E9E1EF" : "#4A404E" }} axisLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} tickLine={{ stroke: isDark ? '#372f45' : '#e5e7eb' }} />
                  <LineTooltip formatter={value => [
                    `S/ ${Number(value).toFixed(2)}`,
                    "Monto"
                  ]} />
                  <Bar dataKey="amount" fill="#FFB7B2" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={500} />
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
                  const isOthers = entry.name === 'Otros' && 'list' in entry;
                  return (
                    <div key={`${entry.name}-${index}`} className="group relative flex items-center justify-between gap-3 overflow-visible">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: `${color}1A` }} />
                        <div className="w-40">
                          <div className="text-sm font-medium">
                            {isOthers ? (
                              <span className="cursor-help" onMouseEnter={e => {
                                const el = (e.currentTarget.parentElement as HTMLElement);
                                el?.setAttribute('data-hover', 'true');
                              }} onMouseLeave={e => {
                                const el = (e.currentTarget.parentElement as HTMLElement);
                                el?.removeAttribute('data-hover');
                              }}>Otros</span>
                            ) : entry.name}
                          </div>
                          <div className="h-2 rounded-full bg-pink-100/60">
                            <div className={`h-full ${["bg-green-300","bg-orange-300","bg-blue-300"][index % 3]}`} style={{ width: `${pct}%` }} />
                          </div>
                          {isOthers && (
                            <div className="absolute z-50 mt-2 left-0 top-6 hidden group-hover:block [data-hover=true]:block">
                              <div className="bg-gray-900 text-white dark:bg-[#1E1226] dark:text-[#E9E1EF] border border-pink-300/30 shadow-md rounded-md px-3 py-2 text-xs max-w-xs">
                                {(entry as any).list.map((i: any) => `${i.name}: ${Number(i.value).toFixed(0)}`).join(', ')}
                              </div>
                            </div>
                          )}
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

      

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl border-pastel-yellow/30">
          <DialogHeader>
            <DialogTitle>Exportar gastos</DialogTitle>
            <DialogDescription>Elige toda la data, un rango de fechas, meses y las categorías que deseas exportar. El PDF tendrá un formato de informe profesional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={exportMode} onValueChange={setExportMode} className="flex gap-4">
              <RadioGroupItem value="all" id="all" />
              <label htmlFor="all" className="mr-4">Toda la data</label>
              <RadioGroupItem value="range" id="range" />
              <label htmlFor="range" className="mr-4">Rango de fechas</label>
              <RadioGroupItem value="months" id="months" />
              <label htmlFor="months">Meses</label>
            </RadioGroup>
            {exportMode === 'range' && (
              <div className="flex items-center gap-2">
                <label className="block font-medium">Fecha</label>
                <InputWithIcon type="date" value={exportStartDate ? format(exportStartDate, 'yyyy-MM-dd') : ''} onChange={e => setExportStartDate(e.target.value ? new Date(e.target.value) : undefined)} />
                <span>a</span>
                <InputWithIcon type="date" value={exportEndDate ? format(exportEndDate, 'yyyy-MM-dd') : ''} onChange={e => setExportEndDate(e.target.value ? new Date(e.target.value) : undefined)} />
              </div>
            )}
            {exportMode === 'months' && (
              <div>
                <label className="block font-medium mb-1">Meses</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {uniqueMonths.map((month: string) => (
                    <label key={month} className="flex items-center gap-1 bg-pastel-blue/10 rounded px-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={exportMonths.includes(month)}
                        onCheckedChange={checked => {
                          setExportMonths(prev => checked ? [...prev, month] : prev.filter(m => m !== month));
                        }}
                      />
                      <span className="text-sm">{format(new Date(month + '-01'), 'MMMM yyyy', { locale: es })}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block font-medium mb-1">Categorías</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {categories.map(category => (
                  <label key={category.id} className="flex items-center gap-1 bg-pastel-pink/10 rounded px-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={exportCategories.includes(category.id)}
                      onCheckedChange={checked => {
                        setExportCategories(prev => checked ? [...prev, category.id] : prev.filter(id => id !== category.id));
                      }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={handleExportConfirm} className="bg-pastel-green hover:bg-pastel-pink/80 text-white font-bold rounded-full px-6 py-2 shadow">
              Exportar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
