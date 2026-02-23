import React, { useState, useEffect, useRef } from "react";
import { useThemedToast } from "@/hooks/useThemedToast";
import { Star, Flower, Settings, Plus, Tag, Download, CircleDollarSign, Trash, Edit, Check, CreditCard, Mail, Send, Bell, Shield } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { usePaymentMethodMutations } from "@/hooks/usePaymentMethodMutations";
import { useSettings } from "@/hooks/useSettings";
import { useBudgets } from "@/hooks/useBudgets";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const Admin = () => {
  const toast = useThemedToast();
  const { user } = useAuth();
  const { categories, income, paymentMethods, loading, error, refreshData, transactions } = useSupabaseData();
  const { createPaymentMethod, updatePaymentMethod, deletePaymentMethod, isCreating, isUpdating, isDeleting } = usePaymentMethodMutations();
  const { settings, updateSettings, isUpdating: isUpdatingSettings, sendReportNow } = useSettings();
  const { budgets, setBudget, removeBudget, isSaving: isSavingBudget } = useBudgets();
  const [sendingReport, setSendingReport] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Record<number, string>>({});
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
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1 mb-6 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger
            value="categories"
            className="flex-1 min-w-fit data-[state=active]:bg-pastel-pink/30 dark:data-[state=active]:bg-primary/20 data-[state=inactive]:text-muted-foreground rounded-lg px-3 py-2.5 lg:px-4"
          >
            <Tag className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Categorías</span>
          </TabsTrigger>
          <TabsTrigger
            value="payment-methods"
            className="flex-1 min-w-fit data-[state=active]:bg-pastel-blue/30 dark:data-[state=active]:bg-secondary/20 data-[state=inactive]:text-muted-foreground rounded-lg px-3 py-2.5 lg:px-4"
          >
            <CreditCard className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Métodos</span>
          </TabsTrigger>
          {/* Tab Ingresos oculta temporalmente */}
          {/* <TabsTrigger
            value="incomes"
            className="flex-1 min-w-fit data-[state=active]:bg-pastel-green/30 dark:data-[state=active]:bg-accent/20 data-[state=inactive]:text-muted-foreground rounded-lg px-3 py-2.5 lg:px-4"
          >
            <CircleDollarSign className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Ingresos</span>
          </TabsTrigger> */}
          <TabsTrigger
            value="notifications"
            className="flex-1 min-w-fit data-[state=active]:bg-violet-500/20 dark:data-[state=active]:bg-violet-500/20 data-[state=inactive]:text-muted-foreground rounded-lg px-3 py-2.5 lg:px-4"
          >
            <Mail className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Correos</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-1 min-w-fit data-[state=active]:bg-pastel-yellow/30 dark:data-[state=active]:bg-amber-500/20 data-[state=inactive]:text-muted-foreground rounded-lg px-3 py-2.5 lg:px-4"
          >
            <Settings className="w-4 h-4 lg:mr-2" />
            <span className="hidden lg:inline">Config</span>
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
                  className="flex justify-between items-center p-4 bg-white dark:bg-card rounded-xl border border-pastel-pink/20 dark:border-border shadow-sm transition-all hover:bg-pastel-pink/10 dark:hover:bg-muted/50 hover:border-pastel-pink/40 dark:hover:border-primary/30 duration-150 hover:scale-[0.99]"
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
                  className="flex justify-between items-center p-4 bg-white dark:bg-card rounded-xl border border-pastel-blue/20 dark:border-border shadow-sm transition-all hover:bg-pastel-blue/10 dark:hover:bg-muted/50 hover:border-pastel-blue/40 dark:hover:border-secondary/30 duration-150 hover:scale-[0.99]"
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
              <div className="bg-white dark:bg-card rounded-xl border border-pastel-green/20 dark:border-border shadow-sm p-6">
                <h3 className="text-lg font-medium mb-4">Historial de Ingresos</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm text-muted-foreground border-b border-border">
                        <th className="text-left p-3">Fuente</th>
                        <th className="text-left p-3">Fecha</th>
                        <th className="text-right p-3">Monto</th>
                        <th className="text-center p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {income.map(inc => (
                        <tr key={inc.id} className="border-b border-border dark:hover:bg-muted/30">
                          <td className="p-3">{inc.source}</td>
                          <td className="p-3">{new Date(inc.date).toLocaleDateString()}</td>
                          <td className="p-3 text-right font-medium">S/ {inc.amount.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <Button size="icon" variant="ghost" className="text-pastel-blue hover:bg-pastel-blue/10 mr-1" onClick={() => handleStartEditIncome(inc)}><Edit className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteIncome(inc.id)}><Trash className="w-4 h-4" /></Button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-pastel-green/10 dark:bg-accent/10">
                        <td className="p-3 font-bold" colSpan={3}>Total</td>
                        <td className="p-3 text-right font-bold">S/ {income.reduce((sum, inc) => sum + inc.amount, 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="p-6 border-violet-500/20 dark:border-border bg-gradient-to-br from-background to-violet-500/5">
            <h2 className="text-xl font-semibold flex items-center mb-8">
              <Mail className="w-5 h-5 mr-2 text-violet-500" />
              Reportes y Presupuestos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Email Reports + Send */}
              <div className="bg-white dark:bg-card rounded-2xl p-6 shadow-soft border border-border/50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Reportes por Email</h3>
                    <p className="text-xs text-muted-foreground">Envía un resumen de gastos a tu correo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Frecuencia</Label>
                    <Select
                      value={settings.report_frequency}
                      onValueChange={(value: 'weekly' | 'monthly') => updateSettings({ report_frequency: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">📅 Semanal</SelectItem>
                        <SelectItem value="monthly">🗓️ Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md"
                    onClick={async () => {
                      setSendingReport(true);
                      try {
                        await sendReportNow();
                        toast.success({ title: "¡Reporte enviado!", description: "Revisa tu bandeja de entrada 📧" });
                      } catch (err: any) {
                        toast.error({ title: "Error al enviar", description: err.message || "Intenta de nuevo más tarde" });
                      } finally {
                        setSendingReport(false);
                      }
                    }}
                    disabled={sendingReport}
                  >
                    {sendingReport ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Reporte Ahora
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Se enviará a <span className="font-medium text-foreground">cattia.ra99@gmail.com</span>
                  </p>
                </div>
              </div>

              {/* Notification Toggles */}
              <div className="bg-white dark:bg-card rounded-2xl p-6 shadow-soft border border-border/50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Preferencias</h3>
                    <p className="text-xs text-muted-foreground">Configura tus notificaciones</p>
                  </div>
                </div>

                <div className="space-y-1">
                  {/* Email Reports Toggle */}
                  <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-violet-500" />
                      <div>
                        <p className="text-sm font-medium">Reportes Automáticos</p>
                        <p className="text-xs text-muted-foreground">Enviar reporte según frecuencia</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.email_reports_enabled}
                      onCheckedChange={(checked) => updateSettings({ email_reports_enabled: checked })}
                    />
                  </div>

                  {/* Budget Alerts Toggle */}
                  <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium">Alertas de Presupuesto</p>
                        <p className="text-xs text-muted-foreground">Notificar al superar un límite</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.budget_alerts_enabled}
                      onCheckedChange={(checked) => updateSettings({ budget_alerts_enabled: checked })}
                    />
                  </div>

                  {/* Daily Digest Toggle */}
                  <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Resumen Diario</p>
                        <p className="text-xs text-muted-foreground">"Hoy gastaste $X" cada noche</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.daily_digest_enabled}
                      onCheckedChange={(checked) => updateSettings({ daily_digest_enabled: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Category Budgets Section */}
            <div className="mt-8">
              <div className="bg-white dark:bg-card rounded-2xl p-6 shadow-soft border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <span className="text-white text-lg">🎯</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Presupuestos por Categoría</h3>
                    <p className="text-xs text-muted-foreground">Define límites mensuales de gasto</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categories.map(category => {
                    const existingBudget = budgets.find(b => b.category_id === category.id);
                    const inputValue = budgetInputs[category.id] ?? (existingBudget?.monthly_limit?.toString() || '');

                    return (
                      <div
                        key={category.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-amber-500/30 transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: category.color || '#9ca3af' }}
                        />
                        <span className="text-sm font-medium flex-1 truncate">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={inputValue}
                            onChange={(e) => setBudgetInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                            onBlur={async () => {
                              const val = parseFloat(inputValue);
                              if (!isNaN(val) && val > 0) {
                                await setBudget(category.id, val);
                                toast.success({ title: "Presupuesto guardado", description: `${category.name}: $${val}` });
                              } else if (inputValue === '' && existingBudget?.id) {
                                await removeBudget(existingBudget.id);
                                toast.info({ title: "Presupuesto eliminado", description: category.name });
                              }
                              setBudgetInputs(prev => { const next = { ...prev }; delete next[category.id]; return next; });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            }}
                            className="w-24 h-8 text-right text-sm border-amber-500/20"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {categories.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-6">
                    Crea categorías primero en la pestaña "Categorías"
                  </p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="p-6 border-primary/20 dark:border-border bg-gradient-to-br from-background to-muted/30">
            <h2 className="text-xl font-semibold flex items-center mb-8">
              <Settings className="w-5 h-5 mr-2 text-primary" />
              Configuración
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Sección Perfil */}
              <div className="bg-white dark:bg-card rounded-2xl p-6 shadow-soft border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-pink to-pastel-purple/60 flex items-center justify-center">
                    <Star className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Tu Perfil</h3>
                    <p className="text-xs text-muted-foreground">Personaliza tu imagen y nombre</p>
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative mb-4 group">
                    <img
                      src="/Foto-Catt.jpg"
                      alt="Foto de perfil"
                      className="w-28 h-28 rounded-full shadow-lg border-4 border-white dark:border-border object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Edit className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleProfilePicChange}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/30 hover:bg-primary/10 mb-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Edit className="w-3.5 h-3.5 mr-2" />
                    Cambiar foto
                  </Button>
                  {selectedProfilePic && (
                    <Button variant="success" size="sm" onClick={handleSaveProfilePic}>
                      Guardar nueva foto
                    </Button>
                  )}
                  {profilePicMessage && (
                    <span className="text-xs text-muted-foreground mt-2 text-center max-w-[200px]">{profilePicMessage}</span>
                  )}
                </div>
              </div>

              {/* Sección Nombre */}
              <div className="bg-white dark:bg-card rounded-2xl p-6 shadow-soft border border-border/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pastel-blue to-pastel-green/60 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Nombre de Usuario</h3>
                    <p className="text-xs text-muted-foreground">Aparece en el menú lateral</p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="w-full">
                    <Label className="text-sm text-muted-foreground mb-2 block">Tu nombre</Label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      className="w-full border border-border rounded-xl px-4 py-3 text-center focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold text-lg bg-muted/30 dark:bg-muted/10 transition-all"
                      maxLength={20}
                      placeholder="Tu nombre..."
                    />
                  </div>
                  <Button
                    variant="success"
                    className="w-full"
                    onClick={handleUpdateSidebarName}
                    disabled={nameInput.trim() === sidebarName.trim() || nameInput.trim() === ''}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Actualizar nombre
                  </Button>
                </div>
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
