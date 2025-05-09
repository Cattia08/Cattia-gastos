import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
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
  Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardCard from "@/components/ui/DashboardCard";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart as PieChartComponent, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip, Legend } from "recharts";
import InteractiveCalendar from "@/components/ui/InteractiveCalendar";
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

const COLORS = ["#FFB7B2", "#A8E6CF", "#FDFFAB", "#B5D8EB", "#E5C5F1"];

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span>¡Hola, Catt, bienvenida!</span>
            <Star className="inline ml-2 w-5 h-5 text-pastel-yellow" />
          </h1>
          <h2 className="text-xl text-primary mt-1">Dashboard</h2>
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

      {/* Filter section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <InputWithIcon
            placeholder="Buscar gastos"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full border-pastel-pink/30"
            icon={<Search className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
        <div className="relative w-full">
          <Button
            variant="outline"
            className="w-full border-pastel-pink/30 flex justify-between items-center"
            onClick={() => setShowCategoryDropdown(v => !v)}
          >
            {selectedCategories.length === categories.length
              ? "Todas las categorías"
              : selectedCategories.length === 0
              ? "Ninguna categoría"
              : `${selectedCategories.length} seleccionadas`}
            <ChevronDown className="ml-2 w-4 h-4" />
          </Button>
          {showCategoryDropdown && (
            <div className="absolute z-10 mt-2 w-full bg-white border border-pastel-pink/30 rounded shadow-lg max-h-60 overflow-auto">
              {categories.map(cat => (
                <label key={cat.id} className="flex items-center px-3 py-2 cursor-pointer hover:bg-pastel-pink/10">
                  <Checkbox
                    checked={selectedCategories.includes(cat.id)}
                    onCheckedChange={() => handleCategoryCheck(cat.id)}
                    className="mr-2"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          )}
        </div>
        <div>
          <InteractiveCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            rangeDate={endDate}
            onRangeSelect={setEndDate}
            onReset={handleResetFilters}
            expenses={transactions.map(expense => ({
              date: new Date(expense.date),
              amount: expense.amount
            }))}
            mode={endDate ? "range" : "single"}
          />
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        <div className="relative">
          <DashboardCard
            title="Total del Mes"
            value={totalMonth}
            icon={<CircleDollarSign className="w-5 h-5 text-white" />}
            iconColor="bg-pastel-pink"
          />
        </div>

        <DashboardCard
          title="Promedio Diario"
          value={dailyAvg.toFixed(2)}
          icon={<CreditCard className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-green"
        />

        <DashboardCard
          title="Día con Mayor Gasto"
          value={maxExpenseDay}
          isCurrency={false}
          icon={<Calendar className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-blue"
        />

        <DashboardCard
          title="Categoría Más Usada"
          value={topCategory}
          isCurrency={false}
          icon={<PieChart className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-purple"
        />

        {/* New Income Card */}
        <div className="relative">
          <DashboardCard
            title="Ingresos del Mes"
            value={totalIncome}
            icon={<Wallet className="w-5 h-5 text-white" />}
            iconColor="bg-pastel-green"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-pastel p-4 md:p-6 dark:bg-gray-800 dark:border-pastel-pink/20">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-pastel-pink" />
            Gastos por Categoría
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChartComponent>
                <Pie
                  data={categoryDataForChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryDataForChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [`S/ ${Number(value).toFixed(2)}`, "Monto"]} />
              </PieChartComponent>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {categoryDataForChart.map((cat, index) => (
              <div key={cat.name} className="flex items-center text-sm">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: cat.color || COLORS[index % COLORS.length] }}
                ></div>
                <span>
                  {cat.name}: S/ {cat.value.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-pastel p-4 md:p-6 dark:bg-gray-800 dark:border-pastel-pink/20">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <ArrowUp className="w-5 h-5 mr-2 text-pastel-green" />
              Gastos Diarios
            </h3>
            <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} className="mt-2 sm:mt-0" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <LineTooltip formatter={value => [`S/ ${Number(value).toFixed(2)}`, "Monto"]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="amount"
                  name={`Gastos de ${format(currentMonth, "MMMM yyyy", { locale: es })}`}
                  stroke="#FFB7B2"
                  strokeWidth={2}
                  dot={{ stroke: "#FFB7B2", strokeWidth: 2, r: 4, fill: "white" }}
                  activeDot={{ r: 6, fill: "#FFB7B2" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-center text-sm text-muted-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: es }).charAt(0).toUpperCase() +
              format(currentMonth, "MMMM yyyy", { locale: es }).slice(1)}
          </div>
        </div>
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
