
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, Star, PieChart, ArrowUp, ArrowDown, Calendar, Search, 
  ChevronDown, CircleDollarSign, CreditCard, RefreshCcw
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

// Mock data
const mockCategoryData = [
  { name: "Comida", value: 400, color: "bg-pastel-pink text-foreground" },
  { name: "Ropa", value: 300, color: "bg-pastel-green text-foreground" },
  { name: "Entretenimiento", value: 200, color: "bg-pastel-yellow text-foreground" },
  { name: "Transporte", value: 150, color: "bg-pastel-blue text-foreground" },
  { name: "Otros", value: 100, color: "bg-pastel-purple text-foreground" },
];

// More detailed mock expense data with dates
const mockExpenseDetails = [
  { id: 1, name: "Supermercado", amount: 120, category: "Comida", date: new Date(2025, 4, 1) },
  { id: 2, name: "Camiseta nueva", amount: 45, category: "Ropa", date: new Date(2025, 4, 3) },
  { id: 3, name: "Cine", amount: 30, category: "Entretenimiento", date: new Date(2025, 4, 5) },
  { id: 4, name: "Taxi", amount: 25, category: "Transporte", date: new Date(2025, 4, 8) },
  { id: 5, name: "Restaurante", amount: 80, category: "Comida", date: new Date(2025, 4, 10) },
  { id: 6, name: "Zapatos", amount: 120, category: "Ropa", date: new Date(2025, 4, 12) },
  { id: 7, name: "Concierto", amount: 70, category: "Entretenimiento", date: new Date(2025, 4, 15) },
  { id: 8, name: "Bus", amount: 15, category: "Transporte", date: new Date(2025, 4, 17) },
  { id: 9, name: "Cafetería", amount: 35, category: "Comida", date: new Date(2025, 4, 20) },
  { id: 10, name: "Accesorios", amount: 60, category: "Ropa", date: new Date(2025, 4, 22) },
  { id: 11, name: "Streaming", amount: 20, category: "Entretenimiento", date: new Date(2025, 4, 25) },
  { id: 12, name: "Metro", amount: 10, category: "Transporte", date: new Date(2025, 4, 28) },
  { id: 13, name: "Panadería", amount: 15, category: "Comida", date: new Date(2025, 4, 30) },
];

// Create previous month expense data
const mockPreviousMonthExpenseDetails = [
  { id: 1, name: "Supermercado", amount: 150, category: "Comida", date: new Date(2025, 3, 5) },
  { id: 2, name: "Camiseta nueva", amount: 35, category: "Ropa", date: new Date(2025, 3, 8) },
  { id: 3, name: "Cine", amount: 40, category: "Entretenimiento", date: new Date(2025, 3, 12) },
  { id: 4, name: "Taxi", amount: 30, category: "Transporte", date: new Date(2025, 3, 15) },
  { id: 5, name: "Restaurante", amount: 100, category: "Comida", date: new Date(2025, 3, 17) },
  { id: 6, name: "Zapatos", amount: 90, category: "Ropa", date: new Date(2025, 3, 20) },
  { id: 7, name: "Concierto", amount: 85, category: "Entretenimiento", date: new Date(2025, 3, 22) },
  { id: 8, name: "Bus", amount: 12, category: "Transporte", date: new Date(2025, 3, 25) },
  { id: 9, name: "Cafetería", amount: 25, category: "Comida", date: new Date(2025, 3, 28) },
];

// Create daily expense data for chart
const generateExpenseData = (month: Date) => {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);
  const daysInMonth = endDate.getDate();
  
  const dailyData: { day: string; amount: number }[] = [];
  
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(month.getFullYear(), month.getMonth(), i);
    const dayExpenses = mockExpenseDetails.filter(expense => 
      isSameDay(expense.date, currentDate)
    );
    
    const totalAmount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    dailyData.push({
      day: i.toString().padStart(2, '0'),
      amount: totalAmount
    });
  }
  
  return dailyData;
};

const COLORS = ["#FFB7B2", "#A8E6CF", "#FDFFAB", "#B5D8EB", "#E5C5F1"];

const Dashboard = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expenseData, setExpenseData] = useState(generateExpenseData(currentMonth));
  const [filteredExpenses, setFilteredExpenses] = useState(mockExpenseDetails);
  
  // Previous month data for comparison
  const previousMonth = subMonths(currentMonth, 1);
  const totalPreviousMonth = mockPreviousMonthExpenseDetails.reduce(
    (sum, expense) => sum + expense.amount, 0
  );

  // Apply filters whenever any filter value changes
  useEffect(() => {
    let filtered = [...mockExpenseDetails];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(expense => 
        expense.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }
    
    // Apply date filter
    if (selectedDate) {
      if (endDate) {
        // Range selection
        filtered = filtered.filter(expense => 
          isWithinInterval(expense.date, {
            start: selectedDate,
            end: endDate
          })
        );
      } else {
        // Single date selection
        filtered = filtered.filter(expense => 
          isSameDay(expense.date, selectedDate)
        );
      }
    }
    
    setFilteredExpenses(filtered);
    
    // Show toast when filters are applied
    if (searchQuery || categoryFilter || selectedDate) {
      toast({
        title: "Filtros aplicados",
        description: "Los datos han sido filtrados según tus preferencias",
      });
    }
  }, [searchQuery, categoryFilter, selectedDate, endDate, toast]);

  // Update expense data when month changes
  useEffect(() => {
    setExpenseData(generateExpenseData(currentMonth));
  }, [currentMonth]);

  // Calculate filtered stats
  const totalMonth = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const dailyAvg = filteredExpenses.length > 0 ? totalMonth / filteredExpenses.length : 0;
  
  // Find day with max expense
  const maxExpense = filteredExpenses.reduce(
    (max, expense) => expense.amount > max.amount ? expense : max,
    { amount: 0, date: new Date() }
  );
  
  const maxExpenseDate = filteredExpenses.length > 0 ? maxExpense.date : new Date();
  const maxExpenseDay = filteredExpenses.length > 0 ? 
    format(maxExpenseDate, "EEEE d 'de' MMMM", { locale: es }) : "-";
  
  // Find top category
  const categoryCount: {[key: string]: number} = {};
  filteredExpenses.forEach(expense => {
    categoryCount[expense.category] = (categoryCount[expense.category] || 0) + 1;
  });
  
  const topCategory = filteredExpenses.length > 0
    ? Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    : "-";

  // Group expenses by category for pie chart
  const categorySums: {[key: string]: number} = {};
  filteredExpenses.forEach(expense => {
    categorySums[expense.category] = (categorySums[expense.category] || 0) + expense.amount;
  });
  
  const categoryDataForChart = Object.entries(categorySums).map(([name, value]) => ({
    name,
    value
  }));

  // Compare with previous month
  const totalDiff = totalMonth - totalPreviousMonth;
  const totalDiffPercentage = totalPreviousMonth ? (totalDiff / totalPreviousMonth) * 100 : 0;
  const isIncreasing = totalDiff > 0;

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("");
    setSelectedDate(undefined);
    setEndDate(undefined);
    
    toast({
      title: "Filtros restablecidos",
      description: "Se ha vuelto a la vista general",
    });
    
    setFilteredExpenses(mockExpenseDetails);
  };

  // Create monthly expense comparison chart data
  const monthlyComparisonData = [
    {
      name: format(previousMonth, "MMMM", { locale: es }),
      total: totalPreviousMonth
    },
    {
      name: format(currentMonth, "MMMM", { locale: es }),
      total: totalMonth
    }
  ];

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
          <Button 
            variant="outline"
            onClick={handleResetFilters}
            className="rounded-full px-3 text-sm border-pastel-pink/30"
          >
            <RefreshCcw className="w-3 h-3 mr-1" /> Restablecer
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 rounded-full px-4"
          >
            <Heart className="w-4 h-4 mr-2" /> Añadir Gasto
          </Button>
        </div>
      </div>

      {/* Filter section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <InputWithIcon
            placeholder="Buscar gastos"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-pastel-pink/30"
            icon={<Search className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
        <div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full border-pastel-pink/30">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {mockCategoryData.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <InteractiveCalendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            rangeDate={endDate}
            onRangeSelect={setEndDate}
            onReset={handleResetFilters}
            expenses={mockExpenseDetails.map(expense => ({
              date: expense.date,
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
                  <th className="text-right py-2 px-3 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/50">
                      <td className="py-2 px-3">{expense.name}</td>
                      <td className="py-2 px-3">{expense.category}</td>
                      <td className="py-2 px-3 text-right font-medium">${expense.amount}</td>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <DashboardCard 
            title="Total del Mes" 
            value={`$${totalMonth}`} 
            icon={<CircleDollarSign className="w-5 h-5 text-white" />}
            iconColor="bg-pastel-pink"
          />
          {/* Comparison indicator */}
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center bg-white dark:bg-gray-800 px-2 py-1 rounded-full shadow-sm border border-pastel-pink/20">
            {isIncreasing ? (
              <ArrowUp className="h-3 w-3 text-red-500 mr-1" />
            ) : (
              <ArrowDown className="h-3 w-3 text-green-500 mr-1" />
            )}
            <span className={`text-xs ${isIncreasing ? 'text-red-500' : 'text-green-500'}`}>
              {Math.abs(totalDiffPercentage).toFixed(1)}%
            </span>
          </div>
        </div>
        
        <DashboardCard 
          title="Promedio Diario" 
          value={`$${dailyAvg.toFixed(2)}`} 
          icon={<CreditCard className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-green"
        />
        
        <DashboardCard 
          title="Día con Mayor Gasto" 
          value={`${maxExpenseDay} ($${filteredExpenses.length > 0 ? maxExpense.amount : 0})`} 
          icon={<Calendar className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-blue"
        />
        
        <DashboardCard 
          title="Categoría Más Usada" 
          value={topCategory} 
          icon={<PieChart className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-purple"
        />
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
                  data={categoryDataForChart.length > 0 ? categoryDataForChart : mockCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryDataForChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChartComponent>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {(categoryDataForChart.length > 0 ? categoryDataForChart : mockCategoryData).map((cat, index) => (
              <div key={cat.name} className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{cat.name}: ${cat.value}</span>
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
            <MonthSelector 
              currentMonth={currentMonth}
              onChange={setCurrentMonth}
              className="mt-2 sm:mt-0"
            />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <LineTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  name={`Gastos de ${format(currentMonth, "MMMM yyyy", { locale: es })}`}
                  stroke="#FFB7B2" 
                  strokeWidth={2} 
                  dot={{ stroke: '#FFB7B2', strokeWidth: 2, r: 4, fill: 'white' }}
                  activeDot={{ r: 6, fill: "#FFB7B2" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-center text-sm text-muted-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: es }).charAt(0).toUpperCase() + format(currentMonth, "MMMM yyyy", { locale: es }).slice(1)}
          </div>
        </div>
      </div>

      {/* New Chart: Monthly Expense Comparison */}
      <div className="card-pastel p-4 md:p-6 dark:bg-gray-800 dark:border-pastel-pink/20">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <ArrowUp className="w-5 h-5 mr-2 text-pastel-blue" /> 
          Comparación Mensual de Gastos
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <LineTooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                name="Total de gastos"
                stroke="#B5D8EB" 
                strokeWidth={2} 
                dot={{ stroke: '#B5D8EB', strokeWidth: 2, r: 4, fill: 'white' }}
                activeDot={{ r: 6, fill: "#B5D8EB" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
