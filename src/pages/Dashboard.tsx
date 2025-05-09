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
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
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
    </div>
  );
};

export default Dashboard;
