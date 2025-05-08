
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, Flower, Settings, Plus, Tag, Download, 
  CircleDollarSign, Trash, Edit, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import CategoryBadge from "@/components/ui/CategoryBadge";

// Mock categories
const mockCategories = [
  { id: 1, name: "Comida", color: "bg-pastel-pink text-foreground" },
  { id: 2, name: "Ropa", color: "bg-pastel-green text-foreground" },
  { id: 3, name: "Entretenimiento", color: "bg-pastel-yellow text-foreground" },
  { id: 4, name: "Transporte", color: "bg-pastel-blue text-foreground" },
  { id: 5, name: "Otros", color: "bg-pastel-purple text-foreground" },
];

// Mock incomes
const mockIncomes = [
  { id: 1, description: "Salario", amount: 2500, date: new Date(2025, 4, 1) },
  { id: 2, description: "Freelance", amount: 600, date: new Date(2025, 4, 15) },
  { id: 3, description: "Reembolso", amount: 120, date: new Date(2025, 4, 22) },
];

// Available color options
const colorOptions = [
  { name: "Rosa", value: "bg-pastel-pink text-foreground" },
  { name: "Verde", value: "bg-pastel-green text-foreground" },
  { name: "Amarillo", value: "bg-pastel-yellow text-foreground" },
  { name: "Azul", value: "bg-pastel-blue text-foreground" },
  { name: "Púrpura", value: "bg-pastel-purple text-foreground" },
];

const Admin = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState(mockCategories);
  const [incomes, setIncomes] = useState(mockIncomes);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddIncomeDialogOpen, setIsAddIncomeDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState("USD");
  
  // Form states
  const [newCategory, setNewCategory] = useState({ name: "", color: "" });
  const [editingCategory, setEditingCategory] = useState({ id: 0, name: "", color: "" });
  const [newIncome, setNewIncome] = useState({ description: "", amount: "", date: new Date() });

  const handleAddCategory = () => {
    if (!newCategory.name || !newCategory.color) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    
    const newCat = {
      id: categories.length + 1,
      name: newCategory.name,
      color: newCategory.color,
    };
    
    setCategories([...categories, newCat]);
    setIsAddCategoryDialogOpen(false);
    setNewCategory({ name: "", color: "" });
    
    toast({
      title: "Categoría añadida",
      description: "La categoría ha sido añadida con éxito",
    });
  };

  const handleEditCategory = () => {
    if (!editingCategory.name || !editingCategory.color) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive",
      });
      return;
    }
    
    setCategories(
      categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...editingCategory } 
          : cat
      )
    );
    
    setIsEditCategoryDialogOpen(false);
    
    toast({
      title: "Categoría actualizada",
      description: "La categoría ha sido actualizada con éxito",
    });
  };

  const handleDeleteCategory = (id: number) => {
    setCategories(categories.filter(cat => cat.id !== id));
    
    toast({
      title: "Categoría eliminada",
      description: "La categoría ha sido eliminada con éxito",
    });
  };

  const handleStartEditCategory = (category: typeof categories[0]) => {
    setEditingCategory(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleAddIncome = () => {
    if (!newIncome.description || !newIncome.amount) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    
    const newEntry = {
      id: incomes.length + 1,
      description: newIncome.description,
      amount: parseFloat(newIncome.amount),
      date: newIncome.date,
    };
    
    setIncomes([...incomes, newEntry]);
    setIsAddIncomeDialogOpen(false);
    setNewIncome({ description: "", amount: "", date: new Date() });
    
    toast({
      title: "Ingreso añadido",
      description: "El ingreso ha sido añadido con éxito",
    });
  };

  const handleExportData = () => {
    // In a real app, this would generate and download a file
    toast({
      title: "Exportación de datos",
      description: "Tus datos han sido exportados con éxito",
    });
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast({
      title: checked ? "Modo oscuro activado" : "Modo claro activado",
      description: "La apariencia de la aplicación ha sido actualizada",
    });
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
    
    toast({
      title: "Moneda actualizada",
      description: `La moneda ha sido actualizada a ${value}`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="text-primary">Administración</span>
          <Flower className="inline ml-2 w-5 h-5 text-pastel-green" />
        </h1>
      </div>
      
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="categories" className="data-[state=active]:bg-pastel-pink/20">
            <Tag className="w-4 h-4 mr-2" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="incomes" className="data-[state=active]:bg-pastel-green/20">
            <CircleDollarSign className="w-4 h-4 mr-2" />
            Ingresos
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-pastel-yellow/20">
            <Settings className="w-4 h-4 mr-2" />
            Configuración
          </TabsTrigger>
        </TabsList>
        
        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card className="p-6 border-pastel-pink/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Tag className="w-5 h-5 mr-2 text-primary" />
                Administrar Categorías
              </h2>
              <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 rounded-full">
                    <Plus className="w-4 h-4 mr-2" /> Añadir Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-pink/30">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-pastel-yellow" />
                      Nueva Categoría
                    </DialogTitle>
                    <DialogDescription>
                      Crea una nueva categoría para organizar tus gastos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        className="border-pastel-pink/30"
                        placeholder="Ej. Alimentación"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="color">Color</Label>
                      <Select 
                        value={newCategory.color}
                        onValueChange={(value) => setNewCategory({...newCategory, color: value})}
                      >
                        <SelectTrigger className="border-pastel-pink/30">
                          <SelectValue placeholder="Selecciona un color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-2 ${color.value.split(' ')[0]}`}></div>
                                {color.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)} className="border-pastel-pink/30">
                      Cancelar
                    </Button>
                    <Button onClick={handleAddCategory} className="bg-primary hover:bg-primary/90">
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-pink/30">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-primary" />
                      Editar Categoría
                    </DialogTitle>
                    <DialogDescription>
                      Actualiza los detalles de esta categoría.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-name">Nombre</Label>
                      <Input
                        id="edit-name"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})}
                        className="border-pastel-pink/30"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-color">Color</Label>
                      <Select 
                        value={editingCategory.color}
                        onValueChange={(value) => setEditingCategory({...editingCategory, color: value})}
                      >
                        <SelectTrigger className="border-pastel-pink/30">
                          <SelectValue placeholder="Selecciona un color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center">
                                <div className={`w-4 h-4 rounded-full mr-2 ${color.value.split(' ')[0]}`}></div>
                                {color.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)} className="border-pastel-pink/30">
                      Cancelar
                    </Button>
                    <Button onClick={handleEditCategory} className="bg-primary hover:bg-primary/90">
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="flex justify-between items-center p-4 bg-white/70 rounded-xl border border-pastel-pink/20 shadow-sm">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full mr-3 ${category.color.split(' ')[0]}`}></div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-pastel-pink/10"
                      onClick={() => handleStartEditCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
        
        {/* Incomes Tab */}
        <TabsContent value="incomes">
          <Card className="p-6 border-pastel-green/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <CircleDollarSign className="w-5 h-5 mr-2 text-pastel-green" />
                Administrar Ingresos
              </h2>
              <Dialog open={isAddIncomeDialogOpen} onOpenChange={setIsAddIncomeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-pastel-green hover:bg-pastel-green/80 text-foreground rounded-full">
                    <Plus className="w-4 h-4 mr-2" /> Añadir Ingreso
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-green/30">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CircleDollarSign className="w-5 h-5 text-pastel-green" />
                      Nuevo Ingreso
                    </DialogTitle>
                    <DialogDescription>
                      Registra un nuevo ingreso en tu cuenta.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Input
                        id="description"
                        value={newIncome.description}
                        onChange={(e) => setNewIncome({...newIncome, description: e.target.value})}
                        className="border-pastel-green/30"
                        placeholder="Ej. Salario mensual"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Monto</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={newIncome.amount}
                        onChange={(e) => setNewIncome({...newIncome, amount: e.target.value})}
                        className="border-pastel-green/30"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date">Fecha</Label>
                      <CustomDatePicker
                        date={newIncome.date}
                        setDate={(date) => setNewIncome({...newIncome, date: date || new Date()})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddIncomeDialogOpen(false)} className="border-pastel-green/30">
                      Cancelar
                    </Button>
                    <Button onClick={handleAddIncome} className="bg-pastel-green hover:bg-pastel-green/80 text-foreground">
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/70 rounded-xl border border-pastel-green/20 shadow-sm p-4">
                <h3 className="text-lg font-medium mb-4">Historial de Ingresos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-muted-foreground border-b">
                        <th className="text-left p-2">Descripción</th>
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-right p-2">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomes.map((income) => (
                        <tr key={income.id} className="border-b border-pastel-green/10">
                          <td className="p-2">{income.description}</td>
                          <td className="p-2">{income.date.toLocaleDateString()}</td>
                          <td className="p-2 text-right font-medium">${income.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-pastel-green/10">
                        <td className="p-2 font-bold" colSpan={2}>Total</td>
                        <td className="p-2 text-right font-bold">
                          ${incomes.reduce((sum, income) => sum + income.amount, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="p-6 border-pastel-yellow/30">
            <h2 className="text-xl font-semibold flex items-center mb-6">
              <Settings className="w-5 h-5 mr-2 text-pastel-yellow" />
              Configuración
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Modo Oscuro</h3>
                  <p className="text-sm text-muted-foreground">Cambia la apariencia de la aplicación</p>
                </div>
                <Switch 
                  checked={isDarkMode} 
                  onCheckedChange={handleToggleDarkMode}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex flex-col space-y-2">
                <h3 className="font-medium">Moneda</h3>
                <p className="text-sm text-muted-foreground mb-2">Selecciona tu moneda preferida</p>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-full md:w-[180px] border-pastel-yellow/30">
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">Dólar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                    <SelectItem value="COP">Peso Colombiano (COP)</SelectItem>
                    <SelectItem value="ARS">Peso Argentino (ARS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="font-medium mb-2">Respaldo de Datos</h3>
                <p className="text-sm text-muted-foreground mb-4">Exporta tu información para respaldo</p>
                <div className="flex space-x-4">
                  <Button 
                    variant="outline" 
                    className="border-pastel-yellow/30 hover:bg-pastel-yellow/10"
                    onClick={handleExportData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-pastel-yellow/30 hover:bg-pastel-yellow/10"
                    onClick={handleExportData}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar JSON
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
