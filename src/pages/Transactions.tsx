import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useThemedToast } from "@/hooks/useThemedToast";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { useDeviceType } from "@/hooks/useDeviceType";
import { supabase } from "@/lib/supabase";
import {
  FaPlus,
  FaStar,
  FaHeart,
  FaExclamationCircle,
  FaSyncAlt,
  FaCalendarAlt,
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaCreditCard
} from "react-icons/fa";
import { Loader2 } from "lucide-react";
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
import MobileTransactionCard from "@/components/transactions/MobileTransactionCard";
import { PullToRefreshIndicator } from "@/components/ui/PullToRefreshIndicator";
import { cn } from "@/lib/utils";
import { groupTransactionsByDate } from "@/lib/dateGrouping";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";

const Transactions = () => {
  const toast = useThemedToast();
  const { transactions: supabaseTransactions, categories: supabaseCategories, paymentMethods, loading, error, refreshData } = useSupabaseData();
  const location = useLocation();
  const { isMobile, isTablet, isTouchDevice } = useDeviceType();
  
  // Refs for pull-to-refresh
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);

  // Persisted filter state (shared with Dashboard)
  const {
    filters,
    setSelectedYear,
    setSelectedMonth,
    setSelectedCategories,
    setSelectedPaymentMethods,
    setSearchQuery,
    resetFilters: resetPersistedFilters,
    initializeSelections,
  } = usePersistedFilters();
  
  const { selectedYear, selectedMonth, selectedCategories, selectedPaymentMethods, searchQuery } = filters;

  // Local date range state (not persisted - specific to transactions view)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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

  // Group paginated transactions by date
  const groupedTransactions = useMemo(() => {
    return groupTransactionsByDate(paginatedTransactions);
  }, [paginatedTransactions]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedPaymentMethods, selectedDate, endDate, selectedYear, selectedMonth]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // Initialize categories and payment methods when data loads
  useEffect(() => {
    if (supabaseCategories.length > 0 || paymentMethods.length > 0) {
      initializeSelections(supabaseCategories, paymentMethods);
    }
  }, [supabaseCategories, paymentMethods, initializeSelections]);

  // Handle quick filters from navigation
  useEffect(() => {
    const state = location.state as any;
    const quick = state?.quickFilter;
    if (!quick) return;

    // Apply preserved year/month filters if available
    if (quick.year !== undefined) {
      setSelectedYear(quick.year);
    }
    if (quick.month !== undefined) {
      setSelectedMonth(quick.month);
    }
    // Apply preserved categories if available
    if (quick.categories && Array.isArray(quick.categories)) {
      setSelectedCategories(quick.categories);
    }

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
    } else if (quick.type === 'day' && quick.date) {
      setSelectedDate(new Date(quick.date));
      setEndDate(undefined);
    } else if (quick.type === 'period' && quick.start && quick.end) {
      // For period filter, use the year/month selectors instead of date range
      // This way the period selector shows the correct period
      setSelectedDate(undefined);
      setEndDate(undefined);
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
      toast.deleted({ title: "Transacción eliminada", description: "La transacción ha sido eliminada con éxito" });
      await refreshData();
    } catch {
      toast.error({ title: "Error", description: "No se pudo eliminar la transacción" });
    }
  };

  const handleCategoryUpdate = async (id: number, category_id: string) => {
    try {
      const { error } = await supabase.from("transactions").update({ category_id }).eq("id", id);
      if (error) throw error;
      toast.success({ title: "Categoría actualizada", description: "La categoría ha sido actualizada con éxito" });
      await refreshData();
    } catch {
      toast.error({ title: "Error", description: "Hubo un error al actualizar la categoría" });
    }
  };

  const handleResetFilters = () => {
    resetPersistedFilters();
    setSelectedDate(undefined);
    setEndDate(undefined);
    toast.info({ title: "Filtros restablecidos", description: "Se ha vuelto a la vista del mes actual" });
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

  // Pull-to-refresh handlers for mobile
  const pullThreshold = 80;
  const maxPull = 120;

  const handlePullStart = (e: React.TouchEvent) => {
    if (!isTouchDevice) return;
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startYRef.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handlePullMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const deltaY = e.touches[0].clientY - startYRef.current;
    if (deltaY <= 0) {
      setPullDistance(0);
      return;
    }

    // Apply resistance
    const adjustedDelta = Math.min(deltaY * 0.5, maxPull);
    setPullDistance(adjustedDelta);
  };

  const handlePullEnd = async () => {
    if (!isPulling) return;
    
    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold);
      await refreshData();
      toast.success({ title: "Actualizado", description: "Datos actualizados correctamente" });
      setIsRefreshing(false);
    }
    
    setPullDistance(0);
    setIsPulling(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-theme-green to-theme-sage bg-clip-text text-transparent">
              Transacciones
            </span>
            <FaHeart className="inline ml-2 w-6 h-6 text-theme-green" />
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
            <FaSyncAlt className="w-3.5 h-3.5 mr-1.5" />
            Restablecer
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            console.log('🚪 Add Dialog opening:', open, 'paymentMethods at this moment:', paymentMethods, 'length:', paymentMethods?.length);
            setIsAddDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className={cn(
                "rounded-xl px-5",
                "bg-gradient-to-r from-theme-green to-theme-sage",
                "hover:shadow-glow-green",
                "shadow-soft",
                "transition-colors duration-150"
              )}>
                <FaPlus className="w-4 h-4 mr-2" />
                Agregar Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white border-pastel-green/30 rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FaPlus className="w-5 h-5 text-theme-green" />
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
                    toast.error({ title: "Error", description: "Por favor completa los campos requeridos" });
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
                    toast.success({ title: "Transacción añadida", description: "La transacción ha sido añadida con éxito" });
                    setIsAddDialogOpen(false);
                    await refreshData();
                  } catch {
                    toast.error({ title: "Error", description: "Hubo un error al procesar la transacción" });
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

      {/* Transactions Container with Pull-to-Refresh */}
      <div
        ref={containerRef}
        className="relative"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        {/* Pull-to-Refresh Indicator */}
        <PullToRefreshIndicator
          progress={pullDistance / pullThreshold}
          isRefreshing={isRefreshing}
          thresholdReached={pullDistance >= pullThreshold}
          pullDistance={pullDistance}
        />

        {/* Mobile View: Card-based Layout */}
        {(isMobile || isTablet) ? (
          <Card className={cn(
            "overflow-hidden",
            "bg-white dark:bg-gray-900",
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
                  <FaCalendarAlt className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {paginatedTransactions.length} de {totalRows} transacciones
                  </span>
                </div>
                {isRefreshing && (
                  <Loader2 className="w-4 h-4 animate-spin text-theme-green" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Desliza ← para eliminar, → para editar
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {groupedTransactions.length > 0 ? (
                groupedTransactions.map((group) => (
                  <div key={group.dateKey}>
                    {/* Date group header */}
                    <div className={cn(
                      "sticky top-0 z-10 px-4 py-2.5",
                      "bg-muted/95 backdrop-blur-sm",
                      "border-b border-border/30"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary capitalize text-sm">
                          {group.label}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {group.transactions.length} • S/ {group.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {/* Transaction cards */}
                    {group.transactions.map((transaction) => (
                      <MobileTransactionCard
                        key={transaction.id}
                        transaction={transaction}
                        onEdit={handleEdit}
                        onDelete={handleDeleteTransaction}
                        swipeEnabled={isTouchDevice}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                    <FaStar className="w-8 h-8 text-pink-400 animate-pulse" />
                  </div>
                  <p className="text-text-secondary font-medium">No hay transacciones</p>
                  <p className="text-xs text-muted-foreground">Ajusta los filtros o añade una nueva</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Desktop View: Table Layout */
          <Card className={cn(
            "overflow-hidden",
            "bg-white dark:bg-gray-900",
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
                  <FaCalendarAlt className="w-4 h-4 text-pink-500" />
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
                {groupedTransactions.length > 0 ? (
                  groupedTransactions.map((group) => (
                    <React.Fragment key={group.dateKey}>
                      {/* Date group header */}
                      <TableRow className="date-group-header hover:bg-muted/90">
                        <TableCell colSpan={6} className="p-0">
                          <div className="flex items-center justify-between px-4 py-2.5">
                            <span className="font-semibold text-text-primary capitalize">{group.label}</span>
                            <span className="text-xs text-text-secondary">
                              {group.transactions.length} transacción{group.transactions.length > 1 ? 'es' : ''} • S/ {group.total.toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Transactions in this group */}
                      {group.transactions.map((transaction, idx) => (
                        <TableRow
                          key={transaction.id}
                          className={cn(
                            "group transaction-row",
                            "border-b border-border/30 last:border-b-0",
                            !transaction.category_id && "bg-amber-50/30 dark:bg-amber-950/10"
                          )}
                        >
                          <TableCell className="py-3.5">
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
                              <div className="min-w-0">
                                <div className="font-semibold text-text-primary truncate">
                                  {transaction.name}
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
                                  {transaction.categories?.name || (
                                    <span className="badge-uncategorized">
                                      <FaExclamationCircle className="w-3 h-3" />
                                      Sin categoría
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
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
                                    <FaExclamationCircle className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-xs">Seleccionar</span>
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
                          <TableCell className="py-3.5">
                            {transaction.payment_methods ? (
                              <div className="flex items-center gap-1.5 text-sm text-text-secondary">
                                <FaCreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                                {transaction.payment_methods.name}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">-</span>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-sm text-text-secondary">
                              {format(new Date(transaction.date), "d MMM", { locale: es })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3.5">
                            <span className="font-bold text-text-emphasis text-base tabular-nums">
                              S/ {transaction.amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <div className="transaction-actions">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(transaction)}
                                className="transaction-action-btn edit"
                              >
                                <FaEdit className="h-4 w-4 text-muted-foreground group-hover:text-pink-500 transition-colors" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="transaction-action-btn delete"
                              >
                                <FaTrash className="h-4 w-4 text-red-400 group-hover:text-red-500 transition-colors" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          <FaStar className="w-8 h-8 text-pink-400 animate-pulse" />
                        </div>
                        <p className="text-text-secondary font-medium">No hay transacciones que mostrar</p>
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
              <FaChevronLeft className="h-4 w-4" />
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
              <FaChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
        )}
      </div>

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
          <FaExclamationCircle className="w-4 h-4 mr-2" />
          {noCategoryTransactions.length} gasto{noCategoryTransactions.length > 1 ? 's' : ''} sin categoría
        </Button>
      )}

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[425px]",
          "bg-white dark:bg-gray-900",
          "border-pink-100/50 dark:border-pink-900/30",
          "rounded-2xl shadow-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaEdit className="w-5 h-5 text-pink-500" />
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
                toast.error({ title: "Error", description: "Por favor completa los campos requeridos" });
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
                toast.success({ title: "Transacción actualizada", description: "La transacción ha sido actualizada con éxito" });
                setIsEditDialogOpen(false);
                await refreshData();
              } catch {
                toast.error({ title: "Error", description: "Hubo un error al procesar la transacción" });
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
          "bg-white dark:bg-gray-900",
          "border-amber-200/50 dark:border-amber-900/30",
          "rounded-2xl shadow-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FaExclamationCircle className="w-5 h-5 text-amber-500" />
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
