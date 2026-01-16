import React, { useState, useEffect, useRef } from "react";
import { useThemedToast } from "@/hooks/useThemedToast";
import { Star, Flower, Settings, Plus, Tag, Download, CircleDollarSign, Trash, Edit, Check, CreditCard } from "lucide-react";
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
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { usePaymentMethodMutations } from "@/hooks/usePaymentMethodMutations";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Admin = () => {
  const toast = useThemedToast();
  const { categories, income, paymentMethods, loading, error, refreshData, transactions } = useSupabaseData();
  const { createPaymentMethod, updatePaymentMethod, deletePaymentMethod, isCreating, isUpdating, isDeleting } = usePaymentMethodMutations();
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [isAddIncomeDialogOpen, setIsAddIncomeDialogOpen] = useState(false);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");

  // Form states
  const [newCategory, setNewCategory] = useState({ name: "", color: "#FF69B4" }); // Default pink color
  const [editingCategory, setEditingCategory] = useState({ id: 0, name: "", color: "" });
  const [newIncome, setNewIncome] = useState({ source: "", amount: "", date: new Date() });
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: "" });
  const [isAddPaymentMethodDialogOpen, setIsAddPaymentMethodDialogOpen] = useState(false);

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

  // Estado para edición inline de payment methods
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState(null);
  const [editingPaymentMethodName, setEditingPaymentMethodName] = useState('');
  const [showCheckPaymentMethodId, setShowCheckPaymentMethodId] = useState(null);

  const handleAddCategory = async () => {
    if (!newCategory.name) {
      toast.error({ title: "Error", description: "Por favor completa el nombre de la categoría" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name: newCategory.name, color: newCategory.color || "#FF69B4" }])
        .select();

      if (error) throw error;

      setIsAddCategoryDialogOpen(false);
      setNewCategory({ name: "", color: "#FF69B4" });

      toast.success({ title: "Categoría añadida", description: "La categoría ha sido añadida con éxito" });
      await refreshData();
    } catch (error) {
      toast.error({ title: "Error", description: "No se pudo añadir la categoría" });
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory.name || !editingCategory.color) {
      toast.error({ title: "Error", description: "Por favor completa todos los campos" });
      return;
    }

    try {
      const { error } = await supabase
        .from("categories")
        .update({ name: editingCategory.name, color: editingCategory.color })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setIsEditCategoryDialogOpen(false);

      toast.success({ title: "Categoría actualizada", description: "La categoría ha sido actualizada con éxito" });
      await refreshData();
    } catch (error) {
      toast.error({ title: 'Error', description: 'No se pudo actualizar el ingreso' });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;

      toast.deleted({ title: "Categoría eliminada", description: "La categoría ha sido eliminada con éxito" });
      await refreshData();
    } catch (error) {
      toast.error({ title: "Error", description: "No se pudo eliminar la categoría" });
    }
  };

  const handleStartEditCategory = category => {
    setEditingCategory(category);
    setIsEditCategoryDialogOpen(true);
  };

  const handleAddIncome = async () => {
    if (!newIncome.source || !newIncome.amount) {
      toast.error({ title: 'Error', description: 'Por favor completa los campos requeridos' });
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

      toast.success({ title: "Ingreso añadido", description: "El ingreso ha sido añadido con éxito" });
      await refreshData();
    } catch (error) {
      toast.error({ title: "Error", description: "No se pudo añadir el ingreso" });
    }
  };

  const handleExportData = () => {
    toast.info({ title: "Exportación lista", description: "Se ha descargado el archivo CSV con éxito" });
  };


  const handleCurrencyChange = (value: string) => {
    setCurrency(value);
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
    toast.success({ title: 'Nombre actualizado', description: 'El nombre del sidebar/navbar ha sido actualizado.' });
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
      toast.error({ title: 'Error', description: 'Por favor completa los campos requeridos' });
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
      toast.success({ title: 'Ingreso actualizado', description: 'El ingreso ha sido actualizado con éxito' });
      await refreshData();
    } catch (error) {
      toast.error({ title: 'Error', description: 'No se pudo actualizar el ingreso' });
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      const { error } = await supabase.from('income').delete().eq('id', id);
      if (error) throw error;
      toast.deleted({ title: 'Ingreso eliminado', description: 'El ingreso ha sido eliminado con éxito' });
      await refreshData();
    } catch (error) {
      toast.error({ title: 'Error', description: 'No se pudo eliminar el ingreso' });
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
      } catch (e) { /* opcional: toast.error */ }
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
      } catch (e) { /* opcional: toast.error */ }
    }
    setEditingColorId(null);
  };

  // Payment Method handlers
  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.name) {
      toast.error({ title: "Error", description: "Por favor completa el nombre" });
      return;
    }
    try {
      await createPaymentMethod({ name: newPaymentMethod.name });
      setIsAddPaymentMethodDialogOpen(false);
      setNewPaymentMethod({ name: "" });
      toast.success({ title: "Método de pago añadido", description: "El método de pago ha sido añadido con éxito" });
      await refreshData();
    } catch (error: any) {
      // Check for duplicate name error (409 Conflict)
      if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        toast.error({ title: "Nombre duplicado", description: `El método de pago "${newPaymentMethod.name}" ya existe` });
      } else {
        toast.error({ title: "Error", description: "No se pudo añadir el método de pago" });
      }
    }
  };

  const handleDeletePaymentMethod = async (id: number) => {
    try {
      await deletePaymentMethod(id);
      toast.deleted({ title: "Método de pago eliminado", description: "Se eliminó correctamente" });
      await refreshData();
    } catch (error) {
      toast.error({ title: 'Error', description: 'No se pudo eliminar el ingreso' });
    }
  };

  const handleInlineEditPaymentMethod = (paymentMethod) => {
    setEditingPaymentMethodId(paymentMethod.id);
    setEditingPaymentMethodName(paymentMethod.name);
  };

  const saveInlineEditPaymentMethod = async (paymentMethod, cancel = false) => {
    if (!cancel && editingPaymentMethodName.trim() && editingPaymentMethodName !== paymentMethod.name) {
      try {
        await updatePaymentMethod({ id: paymentMethod.id, name: editingPaymentMethodName });
        setShowCheckPaymentMethodId(paymentMethod.id);
        setTimeout(() => setShowCheckPaymentMethodId(null), 1200);
        await refreshData();
      } catch (e) { /* toast if needed */ }
    }
    setEditingPaymentMethodId(null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="text-primary">Administración</span>
          <Flower className="inline ml-2 w-5 h-5 text-pastel-green" />
        </h1>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="categories" className="data-[state=active]:bg-pastel-pink/20 data-[state=inactive]:text-gray-600">
            <Tag className="w-4 h-4 mr-2" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="data-[state=active]:bg-pastel-blue/20 data-[state=inactive]:text-gray-600">
            <CreditCard className="w-4 h-4 mr-2" />
            Métodos de Pago
          </TabsTrigger>
          <TabsTrigger value="incomes" className="data-[state=active]:bg-pastel-green/20 data-[state=inactive]:text-gray-600">
            <CircleDollarSign className="w-4 h-4 mr-2" />
            Ingresos
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-pastel-yellow/20 data-[state=inactive]:text-gray-600">
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
                  <Button>
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
                    <Button onClick={handleAddCategory}>
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
                  className="flex justify-between items-center p-4 bg-white/70 rounded-xl border border-pastel-pink/20 shadow-sm transition-colors hover:bg-pastel-pink/10 hover:border-pastel-pink/40 transition-transform duration-150 hover:scale-[0.99]"
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

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods">
          <Card className="p-6 border-pastel-blue/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-pastel-blue" />
                Administrar Métodos de Pago
              </h2>
              <Dialog open={isAddPaymentMethodDialogOpen} onOpenChange={setIsAddPaymentMethodDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-pastel-blue hover:bg-pastel-blue/80">
                    <Plus className="w-4 h-4 mr-2" /> Añadir Método
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-blue/30">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-pastel-blue" />
                      Nuevo Método de Pago
                    </DialogTitle>
                    <DialogDescription>Crea un nuevo método de pago para tus transacciones.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="payment-method-name">Nombre</Label>
                      <Input
                        id="payment-method-name"
                        value={newPaymentMethod.name}
                        onChange={e => setNewPaymentMethod({ name: e.target.value })}
                        className="border-pastel-blue/30"
                        placeholder="Ej. Tarjeta de crédito, Efectivo..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddPaymentMethodDialogOpen(false)}
                      className="border-pastel-blue/30"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAddPaymentMethod} disabled={isCreating}>
                      {isCreating ? "Guardando..." : "Guardar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paymentMethods.map(paymentMethod => (
                <div
                  key={paymentMethod.id}
                  className="flex justify-between items-center p-4 bg-white/70 rounded-xl border border-pastel-blue/20 shadow-sm transition-colors hover:bg-pastel-blue/10 hover:border-pastel-blue/40 transition-transform duration-150 hover:scale-[0.99]"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full mr-3 bg-pastel-blue/20 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-pastel-blue" />
                    </div>
                    {editingPaymentMethodId === paymentMethod.id ? (
                      <input
                        type="text"
                        value={editingPaymentMethodName}
                        onChange={e => setEditingPaymentMethodName(e.target.value)}
                        onBlur={() => saveInlineEditPaymentMethod(paymentMethod)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveInlineEditPaymentMethod(paymentMethod);
                          if (e.key === 'Escape') saveInlineEditPaymentMethod(paymentMethod, true);
                        }}
                        className="font-medium border-b-2 border-pastel-blue/60 bg-transparent outline-none px-1 text-pastel-blue"
                        autoFocus
                        maxLength={30}
                      />
                    ) : (
                      <span
                        className="font-medium cursor-pointer hover:underline"
                        onDoubleClick={() => handleInlineEditPaymentMethod(paymentMethod)}
                      >
                        {paymentMethod.name}
                      </span>
                    )}
                    {showCheckPaymentMethodId === paymentMethod.id && (
                      <Check className="ml-2 w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeletePaymentMethod(paymentMethod.id)}
                      disabled={isDeleting}
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
                  <Button variant="success">
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
                    <Button variant="outline" onClick={() => setIsAddIncomeDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddIncome}>
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              <div className="bg-white/70 rounded-xl border border-pastel-green/20 shadow-sm p-6">
                <h3 className="text-lg font-medium mb-4">Historial de Ingresos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-gray-500 border-b">
                        <th className="text-left p-3">Fuente</th>
                        <th className="text-left p-3">Fecha</th>
                        <th className="text-right p-3">Monto</th>
                        <th className="text-center p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map(inc => (
                        <tr key={inc.id} className="border-b border-pastel-green/10">
                          <td className="p-3">{inc.source}</td>
                          <td className="p-3">{new Date(inc.date).toLocaleDateString()}</td>
                          <td className="p-3 text-right font-medium">${inc.amount.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <Button size="icon" variant="ghost" className="text-pastel-blue hover:bg-pastel-blue/10 mr-1" onClick={() => handleStartEditIncome(inc)}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteIncome(inc.id)}><Trash className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-pastel-green/10">
                        <td className="p-3 font-bold" colSpan={3}>Total</td>
                        <td className="p-3 text-right font-bold">${income.reduce((sum, inc) => sum + inc.amount, 0).toFixed(2)}</td>
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
                  <Button variant="success" onClick={handleSaveProfilePic}>
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
                  variant="success"
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
