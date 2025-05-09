import React, { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Star, Flower, Settings, Plus, Tag, Download, CircleDollarSign, Trash, Edit, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Admin = () => {
  const { toast } = useToast();
  const { categories, income, loading, error, refreshData, transactions } = useSupabaseData();
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddIncomeDialogOpen, setIsAddIncomeDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currency, setCurrency] = useState("USD");

  // Form states
  const [newCategory, setNewCategory] = useState({ name: "", color: "" });
  const [editingCategory, setEditingCategory] = useState({ id: 0, name: "", color: "" });
  const [newIncome, setNewIncome] = useState({ source: "", amount: "", date: new Date() });

  const fileInputRef = useRef(null);
  const [selectedProfilePic, setSelectedProfilePic] = useState(null);
  const [profilePicMessage, setProfilePicMessage] = useState("");

  // Estado para el nombre de usuario
  const [sidebarName, setSidebarName] = useState(() => localStorage.getItem('sidebarName') || 'Catt');
  const [nameInput, setNameInput] = useState(sidebarName);

  // 1. Estado para edición de ingresos
  const [isEditIncomeDialogOpen, setIsEditIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState({ id: 0, source: '', amount: '', date: new Date() });

  // Estado para edición inline
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingColorId, setEditingColorId] = useState(null);
  const [showCheckId, setShowCheckId] = useState(null);

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.color) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: newCategory.name, color: newCategory.color }])
        .select();

      if (error) throw error;

      setIsAddCategoryDialogOpen(false);
      setNewCategory({ name: "", color: "" });

      toast({
        title: "Categoría añadida",
        description: "La categoría ha sido añadida con éxito"
      });
      await refreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir la categoría",
        variant: "destructive"
      });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory.name || !editingCategory.color) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: editingCategory.name, color: editingCategory.color })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setIsEditCategoryDialogOpen(false);

      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada con éxito"
      });
      await refreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada con éxito"
      });
      await refreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const handleStartEditCategory = category => {
    setEditingCategory(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleAddIncome = async () => {
    if (!newIncome.source || !newIncome.amount) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.from("income").insert([
        {
          source: newIncome.source,
          amount: parseFloat(newIncome.amount),
          date: newIncome.date.toISOString()
        }
      ]);

      if (error) throw error;

      setIsAddIncomeDialogOpen(false);
      setNewIncome({ source: "", amount: "", date: new Date() });

      toast({
        title: "Ingreso añadido",
        description: "El ingreso ha sido añadido con éxito"
      });
      await refreshData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo añadir el ingreso",
        variant: "destructive"
      });
    }
  };

  const handleExportData = () => {
    toast({
      title: "Exportación de datos",
      description: "Tus datos han sido exportados con éxito"
    });
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    toast({
      title: checked ? "Modo oscuro activado" : "Modo claro activado",
      description: "La apariencia de la aplicación ha sido actualizada"
    });
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value);

    toast({
      title: "Moneda actualizada",
      description: `La moneda ha sido actualizada a ${value}`
    });
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedProfilePic(file);
      setProfilePicMessage("Haz clic en 'Guardar nueva foto' para actualizar tu imagen. Esto reemplazará la foto actual.");
    }
  };

  const handleSaveProfilePic = () => {
    // No se puede subir a /public desde el frontend, así que instruimos al usuario
    setProfilePicMessage("Por seguridad, debes reemplazar manualmente el archivo 'Foto-Catt.jpg' en la carpeta /public de tu proyecto con la nueva imagen seleccionada.");
  };

  const handleUpdateSidebarName = () => {
    setSidebarName(nameInput);
    localStorage.setItem('sidebarName', nameInput);
    toast({ title: 'Nombre actualizado', description: 'El nombre del sidebar/navbar ha sido actualizado.' });
  };

  // Obtener la última fecha de gasto correctamente de transactions
  const lastTransactionDate = transactions.length > 0
    ? format(new Date(Math.max(...transactions.map(t => new Date(t.date).getTime()))), "dd 'de' MMMM yyyy", { locale: es })
    : "Sin datos";

  const handleStartEditIncome = (inc) => {
    setEditingIncome({ ...inc, amount: inc.amount.toString(), date: new Date(inc.date) });
    setIsEditIncomeDialogOpen(true);
  };

  const handleEditIncome = async () => {
    if (!editingIncome.source || !editingIncome.amount) {
      toast({ title: 'Error', description: 'Por favor completa los campos requeridos', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('income').update({
        source: editingIncome.source,
        amount: parseFloat(editingIncome.amount),
        date: editingIncome.date.toISOString()
      }).eq('id', editingIncome.id);
      if (error) throw error;
      setIsEditIncomeDialogOpen(false);
      toast({ title: 'Ingreso actualizado', description: 'El ingreso ha sido actualizado con éxito' });
      await refreshData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el ingreso', variant: 'destructive' });
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      const { error } = await supabase.from('income').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Ingreso eliminado', description: 'El ingreso ha sido eliminado con éxito' });
      await refreshData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el ingreso', variant: 'destructive' });
    }
  };

  const handleInlineEditName = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const saveInlineEditName = async (category, cancel = false) => {
    if (!cancel && editingCategoryName.trim() && editingCategoryName !== category.name) {
      try {
        const { error } = await supabase.from('categories').update({ name: editingCategoryName }).eq('id', category.id);
        if (!error) {
          setShowCheckId(category.id);
          setTimeout(() => setShowCheckId(null), 1200);
          await refreshData();
        }
      } catch (e) { /* opcional: toast({ title: 'Error', description: 'No se pudo actualizar el nombre', variant: 'destructive' }); */ }
    }
    setEditingCategoryId(null);
  };

  const handleInlineEditColor = (category) => {
    setEditingColorId(category.id);
  };

  const saveInlineEditColor = async (category, color) => {
    if (color && color !== category.color) {
      try {
        const { error } = await supabase.from('categories').update({ color }).eq('id', category.id);
        if (!error) {
          setShowCheckId(category.id);
          setTimeout(() => setShowCheckId(null), 1200);
          await refreshData();
        }
      } catch (e) { /* opcional: toast({ title: 'Error', description: 'No se pudo actualizar el color', variant: 'destructive' }); */ }
    }
    setEditingColorId(null);
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
                    <DialogDescription>Crea una nueva categoría para organizar tus gastos.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre</Label>
                      <Input
                        id="name"
                        value={newCategory.name}
                        onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                        className="border-pastel-pink/30"
                        placeholder="Ej. Alimentación"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="color">Color</Label>
                      <input
                        id="color"
                        type="color"
                        value={newCategory.color || "#FFB7B2"}
                        onChange={e => setNewCategory({ ...newCategory, color: e.target.value })}
                        className="w-12 h-8 p-0 border-none bg-transparent"
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddCategoryDialogOpen(false)}
                      className="border-pastel-pink/30"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAddCategory} className="bg-primary hover:bg-primary/90">
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(category => (
                <div
                  key={category.id}
                  className="flex justify-between items-center p-4 bg-white/70 rounded-xl border border-pastel-pink/20 shadow-sm"
                >
                  <div className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full mr-3 border cursor-pointer relative group`}
                      style={category.color?.startsWith('#') ? { backgroundColor: category.color } : undefined}
                      {...(!category.color?.startsWith('#') && { className: `w-6 h-6 rounded-full mr-3 border ${category.color || "bg-pastel-pink"}` })}
                      onClick={() => handleInlineEditColor(category)}
                    >
                      {editingColorId === category.id && (
                        <input
                          type="color"
                          value={category.color || "#FFB7B2"}
                          onChange={e => saveInlineEditColor(category, e.target.value)}
                          className="absolute -top-2 -left-2 w-10 h-10 opacity-100 z-10 border-none bg-transparent cursor-pointer"
                          style={{ boxShadow: '0 0 0 2px #fff' }}
                          autoFocus
                          onBlur={() => setEditingColorId(null)}
                        />
                      )}
                      {showCheckId === category.id && (
                        <Check className="absolute -right-2 -top-2 w-4 h-4 text-green-500 bg-white rounded-full shadow" />
                      )}
                    </div>
                    {editingCategoryId === category.id ? (
                      <input
                        type="text"
                        value={editingCategoryName}
                        onChange={e => setEditingCategoryName(e.target.value)}
                        onBlur={() => saveInlineEditName(category)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveInlineEditName(category);
                          if (e.key === 'Escape') saveInlineEditName(category, true);
                        }}
                        className="font-medium border-b-2 border-pastel-pink/60 bg-transparent outline-none px-1 text-pastel-blue"
                        autoFocus
                        maxLength={20}
                      />
                    ) : (
                      <span
                        className="font-medium cursor-pointer hover:underline"
                        onDoubleClick={() => handleInlineEditName(category)}
                      >
                        {category.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
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
                    <DialogDescription>Registra un nuevo ingreso en tu cuenta.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="source">Fuente</Label>
                      <Input
                        id="source"
                        value={newIncome.source}
                        onChange={e => setNewIncome({ ...newIncome, source: e.target.value })}
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
                        onChange={e => setNewIncome({ ...newIncome, amount: e.target.value })}
                        className="border-pastel-green/30"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date">Fecha</Label>
                      <CustomDatePicker
                        date={newIncome.date}
                        setDate={date => setNewIncome({ ...newIncome, date: date || new Date() })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddIncomeDialogOpen(false)}
                      className="border-pastel-green/30"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddIncome}
                      className="bg-pastel-green hover:bg-pastel-green/80 text-foreground"
                    >
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
                        <th className="text-left p-2">Fuente</th>
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-right p-2">Monto</th>
                        <th className="text-center p-2">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map(inc => (
                        <tr key={inc.id} className="border-b border-pastel-green/10">
                          <td className="p-2">{inc.source}</td>
                          <td className="p-2">{new Date(inc.date).toLocaleDateString()}</td>
                          <td className="p-2 text-right font-medium">${inc.amount.toFixed(2)}</td>
                          <td className="p-2 text-center">
                            <Button size="icon" variant="ghost" className="text-pastel-blue hover:bg-pastel-blue/10 mr-1" onClick={() => handleStartEditIncome(inc)}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteIncome(inc.id)}><Trash className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-pastel-green/10">
                        <td className="p-2 font-bold" colSpan={3}>Total</td>
                        <td className="p-2 text-right font-bold">${income.reduce((sum, inc) => sum + inc.amount, 0).toFixed(2)}</td>
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
                <Switch checked={isDarkMode} onCheckedChange={handleToggleDarkMode} />
              </div>

              <Separator className="my-4" />

              <div className="flex flex-col items-center mb-6">
                <h3 className="font-medium mb-2">Foto de Perfil</h3>
                <img
                  src="/Foto-Catt.jpg"
                  alt="Foto de Catt"
                  className="w-24 h-24 rounded-full shadow-lg border-4 border-white object-cover mb-2"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleProfilePicChange}
                />
                <Button
                  variant="outline"
                  className="border-pastel-yellow/30 hover:bg-pastel-yellow/10 mb-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Cambiar foto
                </Button>
                {selectedProfilePic && (
                  <Button
                    className="bg-pastel-yellow hover:bg-pastel-yellow/80 text-foreground"
                    onClick={handleSaveProfilePic}
                  >
                    Guardar nueva foto
                  </Button>
                )}
                {profilePicMessage && (
                  <span className="text-xs text-muted-foreground mt-2">{profilePicMessage}</span>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex flex-col items-center gap-2 mb-8 w-full max-w-md mx-auto">
                <h3 className="font-medium mb-2 text-lg text-pastel-blue">Nombre en el menú lateral</h3>
                <input
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="border border-pastel-blue/60 rounded-lg px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-pastel-blue/40 font-semibold text-lg text-pastel-blue bg-white shadow"
                  maxLength={20}
                />
                <Button
                  className="bg-pastel-green hover:bg-pastel-green/50 text-foreground rounded-full"
                  onClick={handleUpdateSidebarName}
                  disabled={nameInput.trim() === sidebarName.trim() || nameInput.trim() === ''}
                >
                  Actualizar nombre
                </Button>
              </div>

              <div className="flex flex-col items-center mt-8 w-full max-w-md mx-auto bg-pastel-yellow/80 rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-2 text-pastel-foreground">Ingresar a make para actualizar los gastos</h3>
                <a
                  href="https://us2.make.com/855106/scenarios/1782501/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-pastel-green hover:bg-pastel-pink/90 hover:text-white text-pastel-foreground font-bold rounded-full px-6 py-2 shadow-lg transition-all duration-200 text-lg focus:ring-2 focus:ring-pastel-green/40 focus:outline-none active:scale-95 mb-2"
                >
                  Actualizar datos
                </a>
                <span className="text-sm text-pastel-foreground mt-2 font-semibold">El último día que se actualizó es: <span className="font-bold text-pastel-blue">{lastTransactionDate}</span></span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 3. Dialog para editar ingreso */}
      <Dialog open={isEditIncomeDialogOpen} onOpenChange={setIsEditIncomeDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-green/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-pastel-green" />
              Editar Ingreso
            </DialogTitle>
            <DialogDescription>Modifica los detalles de este ingreso.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-source">Fuente</Label>
              <Input id="edit-source" value={editingIncome.source} onChange={e => setEditingIncome({ ...editingIncome, source: e.target.value })} className="border-pastel-green/30" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-amount">Monto</Label>
              <Input id="edit-amount" type="number" value={editingIncome.amount} onChange={e => setEditingIncome({ ...editingIncome, amount: e.target.value })} className="border-pastel-green/30" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Fecha</Label>
              <CustomDatePicker date={editingIncome.date} setDate={date => setEditingIncome({ ...editingIncome, date: date || new Date() })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditIncomeDialogOpen(false)} className="border-pastel-green/30">Cancelar</Button>
            <Button onClick={handleEditIncome} className="bg-pastel-green hover:bg-pastel-green/80 text-foreground">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
