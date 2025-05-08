
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, Star, PieChart, ArrowUp, Calendar, Search, 
  ChevronDown, CircleDollarSign, CreditCard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardCard from "@/components/ui/DashboardCard";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart as PieChartComponent, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip } from "recharts";

// Mock data
const mockCategoryData = [
  { name: "Comida", value: 400, color: "bg-pastel-pink text-foreground" },
  { name: "Ropa", value: 300, color: "bg-pastel-green text-foreground" },
  { name: "Entretenimiento", value: 200, color: "bg-pastel-yellow text-foreground" },
  { name: "Transporte", value: 150, color: "bg-pastel-blue text-foreground" },
  { name: "Otros", value: 100, color: "bg-pastel-purple text-foreground" },
];

const mockExpenseData = [
  { day: "01", amount: 120 },
  { day: "05", amount: 200 },
  { day: "10", amount: 150 },
  { day: "15", amount: 80 },
  { day: "20", amount: 250 },
  { day: "25", amount: 170 },
  { day: "30", amount: 100 },
];

const COLORS = ["#FFB7B2", "#A8E6CF", "#FDFFAB", "#B5D8EB", "#E5C5F1"];

const Dashboard = () => {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Mock data for statistics
  const totalMonth = 1250;
  const dailyAvg = 41.67;
  const maxExpenseDay = "20";
  const topCategory = "Comida";

  const handleFilterApply = () => {
    toast({
      title: "Filtros aplicados",
      description: "Los datos han sido filtrados según tus preferencias",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="text-primary">Dashboard</span>
          <Star className="inline ml-2 w-5 h-5 text-pastel-yellow" />
        </h1>
        <Button 
          className="bg-primary hover:bg-primary/90 rounded-full px-4"
        >
          <Heart className="w-4 h-4 mr-2" /> Añadir Gasto
        </Button>
      </div>

      {/* Filter section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <Input
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
              <SelectItem value="">Todas</SelectItem>
              {mockCategoryData.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <CustomDatePicker date={date} setDate={setDate} />
        </div>
        <div className="md:col-span-4">
          <Button 
            variant="outline" 
            onClick={handleFilterApply}
            className="w-full border-pastel-pink/30 hover:bg-pastel-pink/10"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard 
          title="Total del Mes" 
          value={`$${totalMonth}`} 
          icon={<CircleDollarSign className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-pink"
        />
        <DashboardCard 
          title="Promedio Diario" 
          value={`$${dailyAvg}`} 
          icon={<CreditCard className="w-5 h-5 text-white" />}
          iconColor="bg-pastel-green"
        />
        <DashboardCard 
          title="Día con Mayor Gasto" 
          value={maxExpenseDay} 
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
        <div className="card-pastel p-4 md:p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2 text-pastel-pink" /> 
            Gastos por Categoría
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChartComponent>
                <Pie
                  data={mockCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChartComponent>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
            {mockCategoryData.map((cat, index) => (
              <div key={cat.name} className="flex items-center text-sm">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{cat.name}: ${cat.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-pastel p-4 md:p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <ArrowUp className="w-5 h-5 mr-2 text-pastel-green" /> 
            Gastos Diarios
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" />
                <YAxis />
                <LineTooltip />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#FFB7B2" 
                  strokeWidth={2} 
                  dot={{ stroke: '#FFB7B2', strokeWidth: 2, r: 4, fill: 'white' }}
                  activeDot={{ r: 6, fill: "#FFB7B2" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
