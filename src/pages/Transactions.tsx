import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Star,
  Heart,
  CircleAlert,
  RefreshCcw,
  Calendar,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import ExportButton from "@/components/export/ExportButton";
import FilterBar from "@/components/FilterBar";
import TransactionForm from "@/components/transactions/TransactionForm";
import { cn } from "@/lib/utils";

const Transactions = () => {
  const { toast } = useToast();
  const { transactions: supabaseTransactions, categories: supabaseCategories, loading, error, refreshData } = useSupabaseData();
  const { paymentMethods } = usePaymentMethods();
  const location = useLocation();
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<number[]>([]);
  
  // Period selector states (unified with Dashboard)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());

  // Transaction form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState({
    id: 0,
    name: "",
    amount: "",
    category_id: "",
    payment_method_id: undefined as number | undefined,
    date: new Date()
  });

  const [showNoCategoryDialog, setShowNoCategoryDialog] = useState(false);
  const [noCategoryEdits, setNoCategoryEdits] = useState<any[]>([]);
  const [savingNoCategory, setSavingNoCategory] = useState(false);

  // Pagination state
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Compute available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(supabaseTransactions.map(t => new Date(t.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [supabaseTransactions]);

  // Compute date range based on selected year/month
  const dateRange = useMemo(() => {
    if (selectedMonth !== null) {
      const monthDate = new Date(selectedYear, selectedMonth, 1);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate)
      };
    }
    return {
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31, 23, 59, 59)
    };
  }, [selectedYear, selectedMonth]);

  // Get filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let result = [...supabaseTransactions];

    // Filter by period (year/month) or custom date range
    if (selectedDate) {
      if (endDate) {
        result = result.filter(t =>
          isWithinInterval(new Date(t.date), { start: selectedDate, end: endDate })
        );
      } else {
        result = result.filter(t => isSameDay(new Date(t.date), selectedDate));
      }
    } else {
      result = result.filter(t =>
        isWithinInterval(new Date(t.date), { start: dateRange.start, end: dateRange.end })
      );
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by categories
    if (selectedCategories.length > 0 && selectedCategories.length < supabaseCategories.length) {
      result = result.filter(t => selectedCategories.includes(t.categories?.id));
    }

    // Filter by payment methods
    if (selectedPaymentMethods.length > 0 && selectedPaymentMethods.length < paymentMethods.length) {
      result = result.filter(t => t.payment_method_id && selectedPaymentMethods.includes(t.payment_method_id));
    }

    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [supabaseTransactions, selectedDate, endDate, dateRange, searchQuery, selectedCategories, supabaseCategories.length, selectedPaymentMethods, paymentMethods.length]);

  // Pagination calculations
  const totalRows = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Calculate totals for the period
  const periodTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = filteredTransactions.length;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedPaymentMethods, selectedDate, endDate, selectedYear, selectedMonth]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Initialize categories and payment methods selection
  useEffect(() => {
    if (supabaseCategories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(supabaseCategories.map(c => c.id));
    }
    if (paymentMethods.length > 0 && selectedPaymentMethods.length === 0) {
      setSelectedPaymentMethods(paymentMethods.map(m => m.id));
    }
  }, [supabaseCategories, paymentMethods]);

  // Handle quick filters from navigation
  useEffect(() => {
    const state = location.state as any;
    const quick = state?.quickFilter;
    if (!quick) return;
    
    if (quick.type === 'all') {
      setSearchQuery("");
      setSelectedCategories(supabaseCategories.map(c => c.id));
      setSelectedDate(undefined);
      setEndDate(undefined);
    } else if (quick.type === 'month' && quick.start && quick.end) {
      setSelectedDate(new Date(quick.start));
      setEndDate(new Date(quick.end));
    } else if (quick.type === 'category' && typeof quick.id === 'number') {
      setSelectedCategories([quick.id]);
    }
  }, [location.state, supabaseCategories]);

  const handleEdit = (transaction: any) => {
    setCurrentTransaction({
      id: transaction.id,
      name: transaction.name,
      amount: transaction.amount.toString(),
      category_id: transaction.category_id,
      payment_method_id: transaction.payment_method_id,
      date: new Date(transaction.date)
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Transacción eliminada", description: "La transacción ha sido eliminada con éxito" });
      await refreshData();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar la transacción", variant: "destructive" });
    }
  };

  const handleCategoryUpdate = async (id: number, category_id: string) => {
    try {
      const { error } = await supabase.from("transactions").update({ category_id }).eq("id", id);
      if (error) throw error;
      toast({ title: "Categoría actualizada", description: "La categoría ha sido actualizada con éxito" });
      await refreshData();
    } catch {
      toast({ title: "Error", description: "Hubo un error al actualizar la categoría", variant: "destructive" });
    }
  };

  const handleResetFilters = () => {
    const now = new Date();
    setSearchQuery("");
    setSelectedCategories(supabaseCategories.map(c => c.id));
    setSelectedPaymentMethods(paymentMethods.map(m => m.id));
    setSelectedDate(undefined);
    setEndDate(undefined);
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    toast({ title: "Filtros restablecidos", description: "Se ha vuelto a la vista del mes actual" });
  };

  // No category transactions handling
  const noCategoryTransactions = supabaseTransactions.filter(t => !t.category_id);

  const handleOpenNoCategoryDialog = () => {
    setNoCategoryEdits(noCategoryTransactions.map(t => ({ ...t, newCategory: "" })));
    setShowNoCategoryDialog(true);
  };

  const handleNoCategoryChange = (id: number, value: string) => {
    setNoCategoryEdits(edits => edits.map(t => t.id === id ? { ...t, newCategory: value } : t));
  };

  const handleSaveNoCategory = async () => {
    setSavingNoCategory(true);
    const updates = noCategoryEdits.filter(t => t.newCategory);
    for (const t of updates) {
      await supabase.from("transactions").update({ category_id: t.newCategory }).eq("id", t.id);
    }
    setSavingNoCategory(false);
    setShowNoCategoryDialog(false);
    await refreshData();
  };

  const memoizedCurrentTransaction = useMemo(() => currentTransaction, [
    currentTransaction.id,
    currentTransaction.name,
    currentTransaction.amount,
    currentTransaction.name,
    currentTransaction.amount,
    currentTransaction.category_id,
    currentTransaction.payment_method_id,
    currentTransaction.date
  ]);

  // Subtitle for current period
  const periodSubtitle = useMemo(() => {
    if (selectedDate && endDate) {
      return `${format(selectedDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM yyyy", { locale: es })}`;
    }
    if (selectedDate) {
      return format(selectedDate, "d 'de' MMMM, yyyy", { locale: es });
    }
    if (selectedMonth !== null) {
      const monthDate = new Date(selectedYear, selectedMonth, 1);
      return format(monthDate, "MMMM yyyy", { locale: es });
    }
    return `Año ${selectedYear}`;
  }, [selectedDate, endDate, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-pastel-green border-t-theme-green" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        Error al cargar los datos: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-theme-green to-theme-sage bg-clip-text text-transparent">
              Transacciones
            </span>
            <Heart className="inline ml-2 w-6 h-6 text-theme-green" />
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {periodSubtitle} • {transactionCount} transacciones • S/ {periodTotal.toFixed(2)}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton transactions={supabaseTransactions} categories={supabaseCategories} />
          
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className={cn(
              "rounded-xl px-4 text-sm",
              "border-gray-200",
              "hover:bg-pastel-mint/50",
              "transition-all duration-200"
            )}
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5" />
            Restablecer
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className={cn(
                "rounded-xl px-5",
                "bg-gradient-to-r from-theme-green to-theme-sage",
                "hover:shadow-glow-green",
                "shadow-soft",
                "transition-all duration-200"
              )}>
                <Plus className="w-4 h-4 mr-1.5" />
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent className={cn(
              "sm:max-w-[425px]",
              "bg-white/95 backdrop-blur-xl",
              "border-gray-200",
              "rounded-2xl shadow-soft-lg"
            )}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-theme-green" />
                  Nueva Transacción
                </DialogTitle>
                <DialogDescription>
                  Completa los detalles de tu nueva transacción.
                </DialogDescription>
              </DialogHeader>
              <TransactionForm
                initialData={{ id: 0, name: "", amount: "", category_id: "", payment_method_id: undefined, date: new Date() }}
                categories={supabaseCategories}
                paymentMethods={paymentMethods}
                onSave={async (form) => {
                  if (!form.name || !form.amount) {
                    toast({ title: "Error", description: "Por favor completa los campos requeridos", variant: "destructive" });
                    return;
                  }
                  try {
                    const { error: insertError } = await supabase.from("transactions").insert([{
                      name: form.name,
                      amount: parseFloat(form.amount),
                      category_id: form.category_id,
                      payment_method_id: form.payment_method_id,
                      date: form.date
                    }]);
                    if (insertError) throw insertError;
                    toast({ title: "Transacción añadida", description: "La transacción ha sido añadida con éxito" });
                    setIsAddDialogOpen(false);
                    await refreshData();
                  } catch {
                    toast({ title: "Error", description: "Hubo un error al procesar la transacción", variant: "destructive" });
                  }
                }}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        categories={supabaseCategories}
        selectedCategories={selectedCategories}
        onSelectedCategoriesChange={setSelectedCategories}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        paymentMethods={paymentMethods}
        selectedPaymentMethods={selectedPaymentMethods}
        onSelectedPaymentMethodsChange={setSelectedPaymentMethods}
        selectedDate={selectedDate}
        endDate={endDate}
        onDateSelect={setSelectedDate}
        onRangeSelect={setEndDate}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
        availableYears={availableYears}
        showPeriodSelector={true}
        onReset={handleResetFilters}
        expenses={supabaseTransactions.map(t => ({ date: new Date(t.date), amount: t.amount }))}
      />

      {/* Transactions Table */}
      <Card className={cn(
        "overflow-hidden",
        "bg-white/80 dark:bg-gray-900/60 backdrop-blur-md",
        "border-pink-100/30 dark:border-pink-900/20",
        "shadow-xl shadow-pink-100/10 dark:shadow-black/20",
        "rounded-2xl transition-all duration-300"
      )}>
        <CardHeader className={cn(
          "p-4 border-b",
          "border-pink-100/30 dark:border-pink-900/20",
          "bg-gradient-to-r from-pink-50/50 to-purple-50/30 dark:from-pink-950/20 dark:to-purple-950/10"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium text-muted-foreground">
                Mostrando {paginatedTransactions.length} de {totalRows} transacciones
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-pink-50/80 to-purple-50/50 dark:from-pink-950/30 dark:to-purple-950/20 hover:bg-pink-50/90">
                  <TableHead className="text-pink-600 dark:text-pink-400 font-semibold">Comercio</TableHead>
                  <TableHead className="text-pink-600 dark:text-pink-400 font-semibold">Categoría</TableHead>
                  <TableHead className="text-pink-600 dark:text-pink-400 font-semibold">Método</TableHead>
                  <TableHead className="text-pink-600 dark:text-pink-400 font-semibold">Fecha</TableHead>
                  <TableHead className="text-right text-pink-600 dark:text-pink-400 font-semibold">Monto</TableHead>
                  <TableHead className="text-pink-600 dark:text-pink-400 font-semibold w-24">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((transaction, index) => (
                    <TableRow
                      key={transaction.id}
                      className={cn(
                        "group transition-all duration-200",
                        "hover:bg-pink-50/60 dark:hover:bg-pink-950/20",
                        index % 2 === 0 ? "bg-white/60 dark:bg-gray-900/40" : "bg-pink-50/20 dark:bg-pink-950/10"
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              "transition-transform duration-200 group-hover:scale-110"
                            )}
                            style={{ backgroundColor: `${transaction.categories?.color || '#FF7597'}15` }}
                          >
                            <span 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.categories?.color || '#FF7597' }}
                            />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                              {transaction.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {transaction.categories?.name || 'Sin categoría'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.categories ? (
                          <CategoryBadge name={transaction.categories.name} color={transaction.categories.color} />
                        ) : (
                          <Select onValueChange={value => handleCategoryUpdate(transaction.id, value)}>
                            <SelectTrigger className={cn(
                              "h-8 max-w-[150px]",
                              "bg-amber-50/80 dark:bg-amber-950/40",
                              "border-amber-200 dark:border-amber-800"
                            )}>
                              <div className="flex items-center gap-1">
                                <CircleAlert className="w-3.5 h-3.5 text-amber-500" />
                                <span className="text-xs">Sin categoría</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {supabaseCategories.map(category => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {transaction.payment_methods ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                            {transaction.payment_methods.name}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {format(new Date(transaction.date), "d MMM, yyyy", { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          S/ {transaction.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(transaction)}
                            className="h-8 w-8 hover:bg-pink-100 dark:hover:bg-pink-900/40 rounded-lg"
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          <Star className="w-8 h-8 text-pink-400 animate-pulse" />
                        </div>
                        <p className="text-muted-foreground font-medium">No hay transacciones que mostrar</p>
                        <p className="text-xs text-muted-foreground">Ajusta los filtros o añade una nueva transacción</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* Pagination Footer */}
        <div className={cn(
          "flex flex-col sm:flex-row items-center justify-between gap-4 p-4",
          "border-t border-pink-100/30 dark:border-pink-900/20",
          "bg-gradient-to-r from-pink-50/30 to-purple-50/20 dark:from-pink-950/10 dark:to-purple-950/5"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filas:</span>
            <Select value={rowsPerPage.toString()} onValueChange={val => setRowsPerPage(Number(val))}>
              <SelectTrigger className="w-16 h-8 rounded-lg border-pink-200/50 dark:border-pink-800/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="h-8 w-8 rounded-lg border-pink-200/50 dark:border-pink-800/30"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm px-3 py-1 rounded-lg bg-white/60 dark:bg-gray-800/60 border border-pink-100/30 dark:border-pink-900/20">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="h-8 w-8 rounded-lg border-pink-200/50 dark:border-pink-800/30"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* No Category Transactions Alert */}
      {noCategoryTransactions.length > 0 && (
        <Button
          onClick={handleOpenNoCategoryDialog}
          className={cn(
            "w-full sm:w-auto rounded-full px-6 py-3",
            "bg-gradient-to-r from-amber-400 to-orange-400",
            "hover:from-amber-500 hover:to-orange-500",
            "text-white font-medium shadow-lg shadow-amber-500/25",
            "transition-all duration-200"
          )}
        >
          <CircleAlert className="w-4 h-4 mr-2" />
          {noCategoryTransactions.length} gasto{noCategoryTransactions.length > 1 ? 's' : ''} sin categoría
        </Button>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[425px]",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
          "border-pink-100/50 dark:border-pink-900/30",
          "rounded-2xl shadow-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-pink-500" />
              Editar Transacción
            </DialogTitle>
            <DialogDescription>
              Modifica los detalles de esta transacción.
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            initialData={memoizedCurrentTransaction}
            categories={supabaseCategories}
            paymentMethods={paymentMethods}
            onSave={async (form) => {
              if (!form.name || !form.amount) {
                toast({ title: "Error", description: "Por favor completa los campos requeridos", variant: "destructive" });
                return;
              }
              try {
                const { error: updateError } = await supabase
                  .from("transactions")
                  .update({
                    name: form.name,
                    amount: parseFloat(form.amount),
                    category_id: form.category_id,
                    payment_method_id: form.payment_method_id,
                    date: form.date
                  })
                  .eq("id", form.id);
                if (updateError) throw updateError;
                toast({ title: "Transacción actualizada", description: "La transacción ha sido actualizada con éxito" });
                setIsEditDialogOpen(false);
                await refreshData();
              } catch {
                toast({ title: "Error", description: "Hubo un error al procesar la transacción", variant: "destructive" });
              }
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* No Category Assignment Dialog */}
      <Dialog open={showNoCategoryDialog} onOpenChange={setShowNoCategoryDialog}>
        <DialogContent className={cn(
          "max-w-lg",
          "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
          "border-amber-200/50 dark:border-amber-900/30",
          "rounded-2xl shadow-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleAlert className="w-5 h-5 text-amber-500" />
              Asignar categorías
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {noCategoryEdits.map(t => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl",
                  "bg-gray-50/80 dark:bg-gray-800/60",
                  "border border-gray-100 dark:border-gray-700/50"
                )}
              >
                <span className="flex-1 text-sm font-medium truncate">{t.name}</span>
                <Select value={t.newCategory} onValueChange={val => handleNoCategoryChange(t.id, val)}>
                  <SelectTrigger className="w-36 h-8 rounded-lg">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {supabaseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveNoCategory}
              disabled={savingNoCategory}
              className={cn(
                "rounded-full px-6",
                "bg-gradient-to-r from-green-500 to-emerald-500",
                "hover:from-green-600 hover:to-emerald-600"
              )}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
