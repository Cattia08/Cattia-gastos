import React, { useState, useEffect } from "react";
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
  FileSpreadsheet,
  FileType2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CategoryBadge from "@/components/ui/CategoryBadge";
import InteractiveCalendar from "@/components/ui/InteractiveCalendar";
import { format, isSameDay, isWithinInterval } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const Transactions = () => {
  const { toast } = useToast();
  const { transactions: supabaseTransactions, categories: supabaseCategories, loading, error, refreshData } = useSupabaseData();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
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

    // Apply category filter
    if (categoryFilter && categoryFilter !== "all") {
      sortableTransactions = sortableTransactions.filter(transaction => transaction.categories?.id === categoryFilter);
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

    // Sort transactions
    if (sortConfig !== null) {
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

  const handleExport = (format: "excel" | "pdf") => {
    const filteredTransactions = getSortedTransactions();
    const formatName = format === "excel" ? "Excel" : "PDF";

    // In a real application, this would generate and download the file
    // For now, we'll just show a toast message
    toast({
      title: `Exportado a ${formatName}`,
      description: `Se han exportado ${filteredTransactions.length} transacciones en formato ${formatName}`
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

  const TransactionForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={currentTransaction.name}
          onChange={e => setCurrentTransaction({ ...currentTransaction, name: e.target.value })}
          className="border-pastel-pink/30"
          placeholder="Ej. Compras supermercado"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Monto (S/)</Label>
        <Input
          id="amount"
          type="number"
          value={currentTransaction.amount}
          onChange={e => setCurrentTransaction({ ...currentTransaction, amount: e.target.value })}
          className="border-pastel-pink/30"
          placeholder="0.00"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Categoría</Label>
        <Select
          value={currentTransaction.category_id}
          onValueChange={value => setCurrentTransaction({ ...currentTransaction, category_id: value })}
        >
          <SelectTrigger className="border-pastel-pink/30">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {supabaseCategories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="date">Fecha</Label>
        <CustomDatePicker
          date={currentTransaction.date}
          setDate={date => setCurrentTransaction({ ...currentTransaction, date: date || new Date() })}
        />
      </div>
    </div>
  );

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30">
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar a Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <FileType2 className="w-4 h-4 mr-2" /> Exportar a PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30">
            <RefreshCcw className="w-3 h-3 mr-1" /> Restablecer
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 rounded-full px-4">
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
              <TransactionForm />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetTransactionForm();
                  }}
                  className="border-pastel-pink/30"
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddTransaction} className="bg-primary hover:bg-primary/90">
                  Guardar
                </Button>
              </DialogFooter>
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
          <TransactionForm />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetTransactionForm();
              }}
              className="border-pastel-pink/30"
            >
              Cancelar
            </Button>
            <Button onClick={handleAddTransaction} className="bg-primary hover:bg-primary/90">
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter section */}
      <Card className="p-4 border-pastel-pink/30 dark:border-pastel-pink/20 dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <InputWithIcon
              placeholder="Buscar transacciones"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border-pastel-pink/30"
              icon={<Search className="w-4 h-4 text-muted-foreground" />}
            />
          </div>
          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full border-pastel-pink/30">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {supabaseCategories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
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
              onReset={() => {
                setSelectedDate(undefined);
                setEndDate(undefined);
              }}
              className="w-full"
              expenses={supabaseTransactions.map(transaction => ({
                date: new Date(transaction.date),
                amount: transaction.amount
              }))}
            />
          </div>
        </div>
      </Card>

      {/* Date filter display */}
      {hasDateFilter && (
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 mr-1" />
            Mostrando transacciones del: {displayDateFilter()}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <Card className="border-pastel-pink/30 dark:border-pastel-pink/20 dark:bg-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] cursor-pointer" onClick={() => handleSort("name")}>
                Nombre
                {sortConfig?.key === "name" ? (
                  sortConfig.direction === "ascending" ? (
                    <ChevronUp className="inline w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="inline w-4 h-4 ml-1" />
                  )
                ) : null}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}>
                Monto (S/)
                {sortConfig?.key === "amount" ? (
                  sortConfig.direction === "ascending" ? (
                    <ChevronUp className="inline w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="inline w-4 h-4 ml-1" />
                  )
                ) : null}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("category_id")}>
                Categoría
                {sortConfig?.key === "category_id" ? (
                  sortConfig.direction === "ascending" ? (
                    <ChevronUp className="inline w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="inline w-4 h-4 ml-1" />
                  )
                ) : null}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                Fecha
                {sortConfig?.key === "date" ? (
                  sortConfig.direction === "ascending" ? (
                    <ChevronUp className="inline w-4 h-4 ml-1" />
                  ) : (
                    <ChevronDown className="inline w-4 h-4 ml-1" />
                  )
                ) : null}
              </TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getSortedTransactions().length > 0 ? (
              getSortedTransactions().map(transaction => (
                <TableRow
                  key={transaction.id}
                  className={!transaction.category_id ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}
                >
                  <TableCell className="font-medium">{transaction.name}</TableCell>
                  <TableCell>S/ {transaction.amount.toFixed(2)}</TableCell>
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
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(transaction)} className="h-8 w-8 p-0">
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center">
                    <Star className="w-10 h-10 text-pastel-yellow mb-2 animate-pulse" />
                    <p className="text-muted-foreground">No hay transacciones que mostrar</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Transactions;
