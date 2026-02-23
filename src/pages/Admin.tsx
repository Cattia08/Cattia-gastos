import React, { useState, useEffect, useRef, useCallback } from "react";
import { useThemedToast } from "@/hooks/useThemedToast";
import { Star, Flower, Settings, Plus, Tag, Download, CircleDollarSign, Trash, Edit, Check, CreditCard, Mail, Send, Bell, Shield, Clock, Zap, CheckCircle2, XCircle, Sparkles, ArrowRight, Radio, MailCheck } from "lucide-react";
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
  const { settings, updateSettings, isUpdating: isUpdatingSettings, sendReportNow, testBudgetAlerts, testDailyDigest } = useSettings();
  const { budgets, setBudget, removeBudget, isSaving: isSavingBudget } = useBudgets();
  const [sendingReport, setSendingReport] = useState(false);
  const [sendingBudgetAlert, setSendingBudgetAlert] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);

  // Track test results per notification type
  type TestResult = { status: 'success' | 'error'; message: string; timestamp: Date } | null;
  const [reportResult, setReportResult] = useState<TestResult>(null);
  const [budgetResult, setBudgetResult] = useState<TestResult>(null);
  const [digestResult, setDigestResult] = useState<TestResult>(null);

  // Animated counter for "Test All" progress
  const [testAllProgress, setTestAllProgress] = useState(0);

  const handleTestAll = useCallback(async () => {
    setSendingAll(true);
    setTestAllProgress(0);
    const results: { report: boolean; budget: boolean; digest: boolean } = { report: false, budget: false, digest: false };

    // 1. Report
    try {
      setSendingReport(true);
      await sendReportNow();
      setReportResult({ status: 'success', message: 'Reporte enviado correctamente', timestamp: new Date() });
      results.report = true;
    } catch (err: any) {
      setReportResult({ status: 'error', message: err.message || 'Error al enviar', timestamp: new Date() });
    } finally {
      setSendingReport(false);
      setTestAllProgress(1);
    }

    // 2. Budget Alerts
    try {
      setSendingBudgetAlert(true);
      await testBudgetAlerts();
      setBudgetResult({ status: 'success', message: 'Verificación enviada correctamente', timestamp: new Date() });
      results.budget = true;
    } catch (err: any) {
      setBudgetResult({ status: 'error', message: err.message || 'Error al verificar', timestamp: new Date() });
    } finally {
      setSendingBudgetAlert(false);
      setTestAllProgress(2);
    }

    // 3. Daily Digest
    try {
      setSendingDigest(true);
      await testDailyDigest();
      setDigestResult({ status: 'success', message: 'Resumen enviado correctamente', timestamp: new Date() });
      results.digest = true;
    } catch (err: any) {
      setDigestResult({ status: 'error', message: err.message || 'Error al enviar', timestamp: new Date() });
    } finally {
      setSendingDigest(false);
      setTestAllProgress(3);
    }

    setSendingAll(false);

    const successCount = Object.values(results).filter(Boolean).length;
    if (successCount === 3) {
      toast.success({ title: '¡Todos enviados! 🎉', description: 'Los 3 correos se enviaron exitosamente' });
    } else {
      toast.info({ title: `${successCount}/3 enviados`, description: 'Revisa los resultados de cada tarjeta' });
    }
  }, [sendReportNow, testBudgetAlerts, testDailyDigest, toast]);
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

        {/* Notifications Tab — Premium Redesign */}
        <TabsContent value="notifications">
          <Card className="p-0 border-0 bg-transparent shadow-none overflow-visible">

            {/* ═══════════ HERO HEADER ═══════════ */}
            <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-6 sm:p-8">
              {/* Decorative background orbs */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl" />
              <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-cyan-400/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-lg" />

              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
                    <MailCheck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                      Centro de Correos
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </h2>
                    <p className="text-violet-200 text-sm mt-0.5">Configura, activa y prueba tus notificaciones</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Live status pill */}
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
                    <Radio className={`w-3.5 h-3.5 ${[settings.email_reports_enabled, settings.budget_alerts_enabled, settings.daily_digest_enabled].filter(Boolean).length > 0 ? 'text-emerald-400 animate-pulse' : 'text-white/40'}`} />
                    <span className="text-sm font-semibold text-white">
                      {[settings.email_reports_enabled, settings.budget_alerts_enabled, settings.daily_digest_enabled].filter(Boolean).length}/3 activas
                    </span>
                  </div>

                  {/* TEST ALL ★ Hero Button */}
                  <Button
                    onClick={handleTestAll}
                    disabled={sendingAll || sendingReport || sendingBudgetAlert || sendingDigest}
                    className="bg-white text-violet-700 hover:bg-violet-50 font-bold shadow-xl shadow-black/20 h-10 px-5 gap-2 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                  >
                    {sendingAll ? (
                      <>
                        <div className="w-4 h-4 border-2 border-violet-300 border-t-violet-700 rounded-full animate-spin" />
                        <span>{testAllProgress}/3</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Probar Todo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* ═══════════ NOTIFICATION CARDS GRID ═══════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

              {/* ─── Card 1: Reportes Automáticos ─── */}
              <div className={`group relative rounded-2xl border-2 transition-all duration-500 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 ${settings.email_reports_enabled
                  ? 'border-violet-500/30 bg-white dark:bg-card shadow-lg shadow-violet-500/5'
                  : 'border-border/50 bg-white/80 dark:bg-card/60 hover:border-violet-500/20'
                }`}>
                {/* Subtle top gradient bar */}
                <div className={`h-1 w-full transition-all duration-500 ${settings.email_reports_enabled ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${settings.email_reports_enabled ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 scale-100' : 'bg-gray-100 dark:bg-gray-800 scale-95'}`}>
                        <Mail className={`w-5 h-5 transition-colors ${settings.email_reports_enabled ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">Reportes Automáticos</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5 transition-colors ${settings.email_reports_enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${settings.email_reports_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {settings.email_reports_enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={settings.email_reports_enabled}
                      onCheckedChange={(checked) => updateSettings({ email_reports_enabled: checked })}
                    />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">Resumen completo con categorías, tendencias e insights enviado automáticamente.</p>

                  {/* Meta chips */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-500/20">
                      <Clock className="w-3 h-3" />
                      {settings.report_frequency === 'weekly' ? 'Lunes 9AM' : 'Día 1 · 9AM'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                      <Mail className="w-3 h-3" />
                      cattia.ra99@gmail.com
                    </span>
                  </div>

                  {/* Frequency selector */}
                  <Select
                    value={settings.report_frequency}
                    onValueChange={(value: 'weekly' | 'monthly') => updateSettings({ report_frequency: value })}
                  >
                    <SelectTrigger className="h-9 text-xs border-violet-200 dark:border-violet-500/20 mb-3">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">📅 Semanal (Lunes)</SelectItem>
                      <SelectItem value="monthly">🗓️ Mensual (Día 1)</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Test result indicator */}
                  {reportResult && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${reportResult.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                      }`}>
                      {reportResult.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{reportResult.message}</span>
                      <span className="ml-auto text-[10px] opacity-60 shrink-0">{reportResult.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  {/* Send button */}
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md shadow-violet-500/20 h-10 gap-2 transition-all hover:shadow-lg group-hover:shadow-violet-500/30"
                    onClick={async () => {
                      setSendingReport(true);
                      try {
                        await sendReportNow();
                        setReportResult({ status: 'success', message: 'Reporte enviado correctamente', timestamp: new Date() });
                        toast.success({ title: "¡Reporte enviado!", description: "Revisa tu bandeja de entrada 📧" });
                      } catch (err: any) {
                        setReportResult({ status: 'error', message: err.message || 'Error al enviar', timestamp: new Date() });
                        toast.error({ title: "Error al enviar", description: err.message || "Intenta de nuevo" });
                      } finally {
                        setSendingReport(false);
                      }
                    }}
                    disabled={sendingReport}
                  >
                    {sendingReport ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Enviando...</span></>
                    ) : (
                      <><Send className="w-4 h-4" /><span>Enviar Reporte</span><ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" /></>
                    )}
                  </Button>
                </div>
              </div>

              {/* ─── Card 2: Alertas de Presupuesto ─── */}
              <div className={`group relative rounded-2xl border-2 transition-all duration-500 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 ${settings.budget_alerts_enabled
                  ? 'border-amber-500/30 bg-white dark:bg-card shadow-lg shadow-amber-500/5'
                  : 'border-border/50 bg-white/80 dark:bg-card/60 hover:border-amber-500/20'
                }`}>
                <div className={`h-1 w-full transition-all duration-500 ${settings.budget_alerts_enabled ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-red-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${settings.budget_alerts_enabled ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30 scale-100' : 'bg-gray-100 dark:bg-gray-800 scale-95'}`}>
                        <Shield className={`w-5 h-5 transition-colors ${settings.budget_alerts_enabled ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">Alertas de Presupuesto</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5 transition-colors ${settings.budget_alerts_enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${settings.budget_alerts_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {settings.budget_alerts_enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={settings.budget_alerts_enabled}
                      onCheckedChange={(checked) => updateSettings({ budget_alerts_enabled: checked })}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">Alerta cuando una categoría se acerca o supera su límite mensual.</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-500/20">
                      <Clock className="w-3 h-3" />
                      Diario · 10AM
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                      🎯 {budgets.length} presupuesto{budgets.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Spacer to align with card 1 that has the frequency selector */}
                  <div className="h-[36px] mb-3" />

                  {budgetResult && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${budgetResult.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                      }`}>
                      {budgetResult.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{budgetResult.message}</span>
                      <span className="ml-auto text-[10px] opacity-60 shrink-0">{budgetResult.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 h-10 gap-2 transition-all hover:shadow-lg group-hover:shadow-amber-500/30"
                    onClick={async () => {
                      setSendingBudgetAlert(true);
                      try {
                        await testBudgetAlerts();
                        setBudgetResult({ status: 'success', message: 'Verificación enviada correctamente', timestamp: new Date() });
                        toast.success({ title: "¡Verificación enviada!", description: "Si tienes presupuestos en alerta, recibirás un email ⚡" });
                      } catch (err: any) {
                        setBudgetResult({ status: 'error', message: err.message || 'Error al verificar', timestamp: new Date() });
                        toast.error({ title: "Error al verificar", description: err.message || "Intenta de nuevo" });
                      } finally {
                        setSendingBudgetAlert(false);
                      }
                    }}
                    disabled={sendingBudgetAlert}
                  >
                    {sendingBudgetAlert ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Verificando...</span></>
                    ) : (
                      <><Shield className="w-4 h-4" /><span>Verificar Alertas</span><ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" /></>
                    )}
                  </Button>
                </div>
              </div>

              {/* ─── Card 3: Resumen Diario ─── */}
              <div className={`group relative rounded-2xl border-2 transition-all duration-500 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 ${settings.daily_digest_enabled
                  ? 'border-blue-500/30 bg-white dark:bg-card shadow-lg shadow-blue-500/5'
                  : 'border-border/50 bg-white/80 dark:bg-card/60 hover:border-blue-500/20'
                }`}>
                <div className={`h-1 w-full transition-all duration-500 ${settings.daily_digest_enabled ? 'bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`} />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${settings.daily_digest_enabled ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 scale-100' : 'bg-gray-100 dark:bg-gray-800 scale-95'}`}>
                        <Bell className={`w-5 h-5 transition-colors ${settings.daily_digest_enabled ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm">Resumen Diario</h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mt-0.5 transition-colors ${settings.daily_digest_enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${settings.daily_digest_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                          {settings.daily_digest_enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={settings.daily_digest_enabled}
                      onCheckedChange={(checked) => updateSettings({ daily_digest_enabled: checked })}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">Resumen nocturno con tus gastos del día, contexto semanal y top categoría.</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                      <Clock className="w-3 h-3" />
                      9PM diario
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                      🌙 "Hoy gastaste S/ X"
                    </span>
                  </div>

                  <div className="h-[36px] mb-3" />

                  {digestResult && (
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${digestResult.status === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                      }`}>
                      {digestResult.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                      <span className="truncate">{digestResult.message}</span>
                      <span className="ml-auto text-[10px] opacity-60 shrink-0">{digestResult.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 h-10 gap-2 transition-all hover:shadow-lg group-hover:shadow-blue-500/30"
                    onClick={async () => {
                      setSendingDigest(true);
                      try {
                        await testDailyDigest();
                        setDigestResult({ status: 'success', message: 'Resumen enviado correctamente', timestamp: new Date() });
                        toast.success({ title: "¡Resumen enviado!", description: "Revisa tu correo para ver el resumen 🌙" });
                      } catch (err: any) {
                        setDigestResult({ status: 'error', message: err.message || 'Error al enviar', timestamp: new Date() });
                        toast.error({ title: "Error al enviar", description: err.message || "Intenta de nuevo" });
                      } finally {
                        setSendingDigest(false);
                      }
                    }}
                    disabled={sendingDigest}
                  >
                    {sendingDigest ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Enviando...</span></>
                    ) : (
                      <><Bell className="w-4 h-4" /><span>Enviar Resumen</span><ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" /></>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* ═══════════ PRESUPUESTOS SECTION ═══════════ */}
            <div className="bg-white dark:bg-card rounded-2xl p-6 shadow-soft border border-border/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                  <span className="text-white text-lg">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Presupuestos por Categoría</h3>
                  <p className="text-xs text-muted-foreground">Define límites mensuales para recibir alertas</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map(category => {
                  const existingBudget = budgets.find(b => b.category_id === category.id);
                  const inputValue = budgetInputs[category.id] ?? (existingBudget?.monthly_limit?.toString() || '');

                  return (
                    <div
                      key={category.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-amber-500/30 transition-all duration-200 hover:bg-amber-50/30 dark:hover:bg-amber-500/5"
                    >
                      <div
                        className="w-4 h-4 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-white dark:ring-offset-card"
                        style={{ backgroundColor: category.color || '#9ca3af', ringColor: (category.color || '#9ca3af') + '40' }}
                      />
                      <span className="text-sm font-medium flex-1 truncate">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-medium">S/</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={inputValue}
                          onChange={(e) => setBudgetInputs(prev => ({ ...prev, [category.id]: e.target.value }))}
                          onBlur={async () => {
                            const val = parseFloat(inputValue);
                            if (!isNaN(val) && val > 0) {
                              await setBudget(category.id, val);
                              toast.success({ title: "Presupuesto guardado", description: `${category.name}: S/ ${val}` });
                            } else if (inputValue === '' || (!isNaN(val) && val === 0)) {
                              if (existingBudget?.id) {
                                await removeBudget(existingBudget.id);
                                toast.info({ title: "Presupuesto eliminado", description: category.name });
                              }
                            }
                            setBudgetInputs(prev => { const next = { ...prev }; delete next[category.id]; return next; });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          className="w-24 h-8 text-right text-sm border-amber-500/20 focus:border-amber-500/50"
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
