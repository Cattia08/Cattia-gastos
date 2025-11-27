import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Star,
  Search,
  ChevronUp,
  ChevronDown,
  Heart,
  CircleAlert,
  RefreshCcw,
  Calendar,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CategoryBadge from "@/components/ui/CategoryBadge";
import InteractiveCalendar from "@/components/ui/InteractiveCalendar";
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
// removed old dropdown export UI imports
import MonthSelector from "@/components/ui/MonthSelector";
import { es } from "date-fns/locale";
// moved export logic into ExportModal component
import ExportButton from "@/components/export/ExportButton";
import FilterBar from "@/components/FilterBar";
import TransactionForm from "@/components/transactions/TransactionForm";

const Transactions = () => {
  const { toast } = useToast();
  const { transactions: supabaseTransactions, categories: supabaseCategories, loading, error, refreshData } = useSupabaseData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);

  // Transaction form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState({
    id: 0,
    name: "",
    amount: "",
    category_id: "",
    date: new Date()
  });

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [showNoCategoryDialog, setShowNoCategoryDialog] = useState(false);
  const [noCategoryEdits, setNoCategoryEdits] = useState([]);
  const [savingNoCategory, setSavingNoCategory] = useState(false);

  // Estado para paginación
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // removed local export state (migrated to ExportModal)

  const handleSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }

    setSortConfig({ key, direction });
  };

  const getSortedTransactions = () => {
    let sortableTransactions = [...supabaseTransactions];

    // Apply search filter
    if (searchQuery) {
      sortableTransactions = sortableTransactions.filter(transaction =>
        transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategories.length > 0) {
      sortableTransactions = sortableTransactions.filter(transaction => selectedCategories.includes(transaction.categories?.id));
    }

    // Apply date filter
    if (selectedDate) {
      if (endDate) {
        // Range selection
        sortableTransactions = sortableTransactions.filter(transaction =>
          isWithinInterval(new Date(transaction.date), {
            start: selectedDate,
            end: endDate
          })
        );
      } else {
        // Single date selection
        sortableTransactions = sortableTransactions.filter(transaction =>
          isSameDay(new Date(transaction.date), selectedDate)
        );
      }
    }

    // Sort by date descending (reciente a antiguo)
    sortableTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Sort by other config if set
    if (sortConfig !== null && sortConfig.key !== 'date') {
      sortableTransactions.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableTransactions;
  };

  const handleAddTransaction = async () => {
    if (!currentTransaction.name || !currentTransaction.amount) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isEditDialogOpen) {
        // Update existing transaction
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            name: currentTransaction.name,
            amount: parseFloat(currentTransaction.amount),
            category_id: currentTransaction.category_id,
            date: currentTransaction.date
          })
          .eq("id", currentTransaction.id);

        if (updateError) throw updateError;

        toast({
          title: "Transacción actualizada",
          description: "La transacción ha sido actualizada con éxito"
        });
        setIsEditDialogOpen(false);
        await refreshData();
      } else {
        // Add new transaction
        const { error: insertError } = await supabase.from("transactions").insert([
          {
            name: currentTransaction.name,
            amount: parseFloat(currentTransaction.amount),
            category_id: currentTransaction.category_id,
            date: currentTransaction.date
          }
        ]);

        if (insertError) throw insertError;

        toast({
          title: "Transacción añadida",
          description: "La transacción ha sido añadida con éxito"
        });
        setIsAddDialogOpen(false);
        await refreshData();
      }

      resetTransactionForm();
    } catch (err) {
      toast({
        title: "Error",
        description: "Hubo un error al procesar la transacción",
        variant: "destructive"
      });
    }
  };

  const handleEdit = transaction => {
    setCurrentTransaction({
      id: transaction.id,
      name: transaction.name,
      amount: transaction.amount.toString(),
      category_id: transaction.category_id,
      date: new Date(transaction.date)
    });
    setIsEditDialogOpen(true);
  };

  const resetTransactionForm = () => {
    setCurrentTransaction({
      id: 0,
      name: "",
      amount: "",
      category_id: "",
      date: new Date()
    });
  };

  const handleCategoryUpdate = async (id: number, category_id: string) => {
    try {
      const { error } = await supabase.from("transactions").update({ category_id }).eq("id", id);
      if (error) throw error;
      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada con éxito"
      });
      await refreshData();
    } catch (err) {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar la categoría",
        variant: "destructive"
      });
    }
  };


  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategories([]);
    setSelectedDate(undefined);
    setEndDate(undefined);
    setSortConfig(null);
    setCurrentMonth(new Date());
    toast({
      title: "Filtros restablecidos",
      description: "Se ha vuelto a la vista general"
    });
  };

  // Calculate if there are selected dates to show
  const hasDateFilter = selectedDate !== undefined;
  const displayDateFilter = () => {
    if (!selectedDate) return "";
    if (endDate) {
      return `${format(selectedDate, "dd 'de' MMMM, yyyy")} al ${format(endDate, "dd 'de' MMMM, yyyy")}`;
    }
    return format(selectedDate, "dd 'de' MMMM, yyyy");
  };

  const memoizedCurrentTransaction = useMemo(() => currentTransaction, [currentTransaction.id]);

  const handleDeleteTransaction = async (id) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      toast({
        title: "Transacción eliminada",
        description: "La transacción ha sido eliminada con éxito"
      });
      await refreshData();
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive"
      });
    }
  };

  const noCategoryTransactions = supabaseTransactions.filter(t => !t.category_id);

  const handleOpenNoCategoryDialog = () => {
    setNoCategoryEdits(noCategoryTransactions.map(t => ({ ...t, newCategory: "" })));
    setShowNoCategoryDialog(true);
  };

  const handleNoCategoryChange = (id, value) => {
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

  // Nueva función para saber si hay filtros activos
  const hasActiveFilters = searchQuery || selectedCategories.length > 0 || selectedDate;

  // Filtrado por mes seleccionado
  const transactionsByMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return supabaseTransactions.filter(transaction => {
      const date = new Date(transaction.date);
      return date >= start && date <= end;
    });
  }, [supabaseTransactions, currentMonth]);

  // Decide qué transacciones mostrar
  const transactionsToShow = hasActiveFilters ? getSortedTransactions() : transactionsByMonth;

  // Calcular datos paginados
  const totalRows = transactionsToShow.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const paginatedTransactions = transactionsToShow.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setCurrentPage(1); // Reinicia a la primera página si cambia el filtro o cantidad de filas
  }, [transactionsToShow, rowsPerPage]);

  const groupedFeed = React.useMemo(() => {
    const groups: { label: string; items: typeof transactionsToShow }[] = [];
    const byDate: Record<string, typeof transactionsToShow> = {};
    transactionsToShow.forEach(t => {
      const d = new Date(t.date);
      const key = d.toDateString();
      byDate[key] = byDate[key] || [];
      byDate[key].push(t);
    });
    const entries = Object.entries(byDate).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    entries.forEach(([key, items]) => {
      const d = new Date(key);
      let label = d.toLocaleDateString();
      if (isSameDay(d, today)) label = "Hoy";
      else if (isSameDay(d, yesterday)) label = "Ayer";
      groups.push({ label, items });
    });
    return groups;
  }, [transactionsToShow]);

  useEffect(() => {
    if (supabaseCategories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(supabaseCategories.map(c => c.id));
    }
  }, [supabaseCategories]);



  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="text-primary">Transacciones</span>
          <Heart className="inline ml-2 w-5 h-5 text-primary" />
        </h1>
        <div className="flex space-x-2">
          <ExportButton transactions={supabaseTransactions} categories={supabaseCategories} />
          <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30" onClick={handleResetFilters}>
            <RefreshCcw className="w-3 h-3 mr-1" /> Restablecer
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Añadir Transacción
              </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-pink/30 dark:bg-gray-800 dark:border-pastel-pink/20">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Nueva Transacción
                </DialogTitle>
                <DialogDescription>Completa los detalles de tu nueva transacción aquí.</DialogDescription>
              </DialogHeader>
              <TransactionForm
                initialData={{ id: 0, name: "", amount: "", category_id: "", date: new Date() }}
                categories={supabaseCategories}
                onSave={async (form) => {
                  if (!form.name || !form.amount) {
                    toast({ title: "Error", description: "Por favor completa los campos requeridos", variant: "destructive" });
                    return;
                  }
                  try {
                    const { error: insertError } = await supabase.from("transactions").insert([
                      {
                        name: form.name,
                        amount: parseFloat(form.amount),
                        category_id: form.category_id,
                        date: form.date
                      }
                    ]);
                    if (insertError) throw insertError;
                    toast({ title: "Transacción añadida", description: "La transacción ha sido añadida con éxito" });
                    setIsAddDialogOpen(false);
                    await refreshData();
                  } catch (err) {
                    toast({ title: "Error", description: "Hubo un error al procesar la transacción", variant: "destructive" });
                  }
                }}
                onCancel={() => {
                  setIsAddDialogOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-pink/30 dark:bg-gray-800 dark:border-pastel-pink/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Editar Transacción
            </DialogTitle>
            <DialogDescription>Modifica los detalles de esta transacción.</DialogDescription>
          </DialogHeader>
          <TransactionForm
            initialData={memoizedCurrentTransaction}
            categories={supabaseCategories}
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
                    date: form.date
                  })
                  .eq("id", form.id);
                if (updateError) throw updateError;
                toast({ title: "Transacción actualizada", description: "La transacción ha sido actualizada con éxito" });
                setIsEditDialogOpen(false);
                await refreshData();
              } catch (err) {
                toast({ title: "Error", description: "Hubo un error al procesar la transacción", variant: "destructive" });
              }
            }}
            onCancel={() => {
              setIsEditDialogOpen(false);
              resetTransactionForm();
            }}
          />
        </DialogContent>
      </Dialog>

      

      {/* Date filter display */}
      {hasDateFilter && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            Mostrando transacciones del: {displayDateFilter()}
          </div>
        </div>
      )}

      {/* Month selector */}
      <div className="flex items-center justify-end mb-6">
        <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

      {/* Tabla estilizada */}
      <Card className="p-0 rounded-3xl shadow-card bg-white">
        <CardHeader className="p-4 border-b border-pink-100/50">
          <div className="flex items-center flex-wrap gap-4">
            <FilterBar
              categories={supabaseCategories}
              selectedCategories={selectedCategories}
              onSelectedCategoriesChange={setSelectedCategories}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              selectedDate={selectedDate}
              endDate={endDate}
              onDateSelect={setSelectedDate}
              onRangeSelect={setEndDate}
              onReset={() => { setSearchQuery(''); setSelectedDate(undefined); setEndDate(undefined); setSelectedCategories(supabaseCategories.map(c=>c.id)); }}
              expenses={supabaseTransactions.map(t => ({ date: new Date(t.date), amount: t.amount }))}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto md:overflow-visible scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
          <Table className="min-w-[800px]">
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead className="text-primary-hover font-bold">Comercio</TableHead>
                <TableHead className="text-primary-hover font-bold">Categoría</TableHead>
                <TableHead className="text-primary-hover font-bold">Fecha</TableHead>
                <TableHead className="text-right text-primary-hover font-bold">Monto</TableHead>
                <TableHead className="text-primary-hover font-bold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map(transaction => (
                  <TableRow key={transaction.id} className="hover:bg-pink-50/50 [&>td]:py-3">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full"
                          style={{ backgroundColor: `${transaction.categories?.color || '#FFB7B2'}1A` }}
                        />
                        <div className="leading-tight">
                          <div className="text-gray-700 font-medium">{transaction.name}</div>
                          <div className="text-xs text-muted-foreground">{transaction.categories?.name || 'Sin categoría'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.categories ? (
                        <CategoryBadge name={transaction.categories.name} color={transaction.categories.color} />
                      ) : (
                        <Select onValueChange={value => handleCategoryUpdate(transaction.id, value)}>
                          <SelectTrigger className="h-8 border-pastel-pink/30 pr-2 mr-2 max-w-[160px] bg-amber-50/80 dark:bg-amber-950/40">
                            <div className="flex items-center">
                              <CircleAlert className="w-4 h-4 text-amber-500 mr-1" />
                              <span>Sin categoría</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {supabaseCategories.map(category => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-500">{new Date(transaction.date).toLocaleDateString()}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold">S/ {transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(transaction)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(transaction.id)} className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <Star className="w-10 h-10 text-pastel-yellow mb-2 animate-pulse" />
                      <p className="text-muted-foreground">No hay transacciones que mostrar</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* No Category Transactions Button */}
      {noCategoryTransactions.length > 0 && (
        <Button
          className="mb-4 bg-pastel-yellow hover:bg-pastel-pink/80 text-pastel-foreground font-bold rounded-full px-6 py-2 shadow transition-all duration-200"
          onClick={handleOpenNoCategoryDialog}
        >
          {noCategoryTransactions.length} gasto{noCategoryTransactions.length > 1 ? 's' : ''} sin categoría
        </Button>
      )}

      {/* Dialog para asignar categorías */}
      <Dialog open={showNoCategoryDialog} onOpenChange={setShowNoCategoryDialog}>
        <DialogContent className="max-w-lg bg-white rounded-2xl border-pastel-yellow/30">
          <DialogHeader>
            <DialogTitle>Asignar categorías a gastos sin categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {noCategoryEdits.map(t => (
              <div key={t.id} className="flex items-center gap-2 p-2 border-b">
                <span className="flex-1 text-sm">{t.name}</span>
                <Select value={t.newCategory} onValueChange={val => handleNoCategoryChange(t.id, val)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {supabaseCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveNoCategory} disabled={savingNoCategory} className="bg-pastel-green hover:bg-pastel-pink/80 text-white font-bold rounded-full px-6 py-2 shadow">
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Controles de paginación */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Filas por página:</span>
          <Select value={rowsPerPage.toString()} onValueChange={val => setRowsPerPage(Number(val))}>
            <SelectTrigger className="w-20 border-pastel-pink/30">
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
          <Button variant="ghost" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
            &lt;
          </Button>
          <span className="text-sm">Página {currentPage} de {totalPages}</span>
          <Button variant="ghost" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
            &gt;
          </Button>
        </div>
      </div>

    </div>
  );
};

export default Transactions;
