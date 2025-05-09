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
  FileSpreadsheet,
  FileType2,
  Trash2
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
import { format, isSameDay, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import MonthSelector from "@/components/ui/MonthSelector";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Chart from 'chart.js/auto';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [showNoCategoryDialog, setShowNoCategoryDialog] = useState(false);
  const [noCategoryEdits, setNoCategoryEdits] = useState([]);
  const [savingNoCategory, setSavingNoCategory] = useState(false);

  // Estado para paginación
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined);
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined);
  const [exportCategories, setExportCategories] = useState([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('pdf');
  const [exportMode, setExportMode] = useState('all'); // 'all', 'range', 'months'
  const uniqueMonths = Array.from(new Set(supabaseTransactions.map(t => {
    const d = new Date(t.date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }))).sort((a, b) => b.localeCompare(a));
  const [exportMonths, setExportMonths] = useState([]);

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

  const handleExport = (format: "excel" | "pdf") => {
    const filteredTransactions = getSortedTransactions();
    const formatName = format === "excel" ? "Excel" : "PDF";
    toast({
      title: `Exportado a ${formatName}`,
      description: `Se han exportado ${filteredTransactions.length} transacciones en formato ${formatName}`
    });
    // Aquí podrías agregar la lógica real de exportación si lo deseas
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
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

  const TransactionForm = ({ initialData, onSave, onCancel }) => {
    const [form, setForm] = useState(initialData);

    useEffect(() => {
      setForm(initialData);
    }, [initialData.id]);

    return (
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="border-pastel-pink/30"
            placeholder="Ej. Compras supermercado"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="amount">Monto (S/)</Label>
          <Input
            id="amount"
            type="number"
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
            className="border-pastel-pink/30"
            placeholder="0.00"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Categoría</Label>
          <Select
            value={form.category_id}
            onValueChange={value => setForm({ ...form, category_id: value })}
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
            date={form.date}
            setDate={date => setForm({ ...form, date: date || new Date() })}
          />
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onCancel} className="border-pastel-pink/30">Cancelar</Button>
          <Button onClick={() => onSave(form)} className="bg-primary hover:bg-primary/90">Guardar</Button>
        </div>
      </div>
    );
  };

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
  const hasActiveFilters = searchQuery || (categoryFilter && categoryFilter !== 'all') || selectedDate;

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

  const handleOpenExportDialog = (format) => {
    setExportFormat(format);
    setExportCategories(supabaseCategories.map(cat => cat.id));
    setIsExportDialogOpen(true);
  };

  const handleExportConfirm = async () => {
    let filtered = [...supabaseTransactions];
    if (exportMode === 'range' && exportStartDate) {
      if (exportEndDate) {
        filtered = filtered.filter(t => new Date(t.date) >= exportStartDate && new Date(t.date) <= exportEndDate);
      } else {
        filtered = filtered.filter(t => isSameDay(new Date(t.date), exportStartDate));
      }
    }
    if (exportMode === 'months' && exportMonths.length > 0) {
      filtered = filtered.filter(t => exportMonths.includes(`${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}`));
    }
    if (exportCategories.length > 0) {
      filtered = filtered.filter(t => exportCategories.includes(t.category_id));
    }
    if (exportFormat === 'excel') {
      const sortedForExcel = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const ws = XLSX.utils.json_to_sheet(sortedForExcel.map(t => ({
        Nombre: t.name,
        Monto: t.amount,
        Categoría: t.categories?.name || 'Sin categoría',
        Fecha: new Date(t.date).toLocaleDateString()
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
      XLSX.writeFile(wb, "transacciones.xlsx");
      toast({ title: "Exportado a Excel", description: `Se han exportado ${sortedForExcel.length} transacciones.` });
      setIsExportDialogOpen(false);
      return;
    } else {
      // PDF con más estilo y gráficos
      const doc = new jsPDF('p', 'mm', 'a4');
      // Encabezado con fondo pastel
      const headerColor = [255, 183, 178];
      doc.setFillColor(...headerColor);
      doc.rect(0, 0, 210, 36, 'F');
      const img = new Image();
      img.src = '/Foto-Catt.jpg';
      await new Promise(res => { img.onload = res; });
      doc.addImage(img, 'JPEG', 10, 6, 24, 24, undefined, 'FAST');
      doc.setFontSize(22);
      doc.setTextColor(255, 87, 127);
      doc.text('Reporte de gastos de Catt<3', 40, 20);
      let dateText = '';
      if (exportMode === 'all') {
        dateText = 'Todas las fechas';
      } else if (exportMode === 'range' && exportStartDate) {
        if (exportEndDate) {
          dateText = `Del ${exportStartDate.toLocaleDateString()} al ${exportEndDate.toLocaleDateString()}`;
        } else {
          dateText = `Día: ${exportStartDate.toLocaleDateString()}`;
        }
      } else if (exportMode === 'months' && exportMonths.length > 0) {
        dateText = exportMonths
          .map(month => format(new Date(month + '-01'), 'MMMM yyyy', { locale: es }))
          .join(', ');
      }
      doc.setFontSize(12);
      doc.setTextColor(80, 80, 80);
      doc.text(dateText, 40, 28);
      // Cards resumen con fondo y colores
      const total = filtered.reduce((sum, t) => sum + t.amount, 0);
      const uniqueDays = Array.from(new Set(filtered.map(t => new Date(t.date).toLocaleDateString())));
      const dailyAvg = uniqueDays.length > 0 ? total / uniqueDays.length : 0;
      const maxDay = uniqueDays.map(day => ({
        day,
        total: Number(filtered.filter(t => new Date(t.date).toLocaleDateString() === day).reduce((sum, t) => sum + t.amount, 0))
      })).sort((a, b) => b.total - a.total)[0];
      const categoryCount = {};
      filtered.forEach(t => {
        const cat = t.categories?.name || 'Sin categoría';
        categoryCount[cat] = (categoryCount[cat] || 0) + t.amount;
      });
      const topCategory = Object.entries(categoryCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
      // Cards layout
      const cardY = 40;
      const cardH = 36;
      const cardW = 90;
      const cardPad = 6;
      // Total
      doc.setFillColor(232, 246, 239); // pastel green
      doc.roundedRect(12, cardY, cardW, cardH, 8, 8, 'F');
      doc.setFontSize(15);
      doc.setTextColor(46, 125, 50);
      doc.text('Total', 12 + cardW / 2, cardY + 12, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`S/ ${total.toFixed(2)}`, 12 + cardW / 2, cardY + 24, { align: 'center' });
      // Promedio diario
      doc.setFillColor(255, 255, 204); // pastel yellow
      doc.roundedRect(108, cardY, cardW, cardH, 8, 8, 'F');
      doc.setFontSize(15);
      doc.setTextColor(255, 193, 7);
      doc.text('Promedio diario', 108 + cardW / 2, cardY + 12, { align: 'center' });
      doc.setFontSize(14);
      doc.text(`S/ ${dailyAvg.toFixed(2)}`, 108 + cardW / 2, cardY + 24, { align: 'center' });
      // Día con más gasto
      doc.setFillColor(255, 224, 178); // pastel orange
      doc.roundedRect(12, cardY + cardH + cardPad, cardW, cardH, 8, 8, 'F');
      doc.setFontSize(15);
      doc.setTextColor(255, 152, 0);
      doc.text('Día con más gasto', 12 + cardW / 2, cardY + cardH + cardPad + 12, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`${maxDay ? maxDay.day + ' (S/ ' + Number(maxDay.total).toFixed(2) + ')' : '-'}`, 12 + cardW / 2, cardY + cardH + cardPad + 24, { align: 'center' });
      // Categoría con más gasto
      doc.setFillColor(197, 225, 165); // pastel lime
      doc.roundedRect(108, cardY + cardH + cardPad, cardW, cardH, 8, 8, 'F');
      doc.setFontSize(15);
      doc.setTextColor(85, 139, 47);
      doc.text('Categoría top', 108 + cardW / 2, cardY + cardH + cardPad + 12, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`${topCategory ? topCategory[0] + ' (S/ ' + Number(topCategory[1]).toFixed(2) + ')' : '-'}`, 108 + cardW / 2, cardY + cardH + cardPad + 24, { align: 'center' });
      // Separador
      const sepY = cardY + cardH * 2 + 18;
      doc.setDrawColor(255, 183, 178);
      doc.line(12, sepY, 198, sepY);
      // Gráficos (igual que antes)
      // ...
      // Tabla de detalle de gastos
      const sortedFiltered = [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const tableY = sepY + 8;
      doc.setFontSize(13);
      doc.setTextColor(80, 80, 80);
      doc.text('Detalle de gastos', 14, tableY);
      const tableHeaders = ['Fecha', 'Nombre', 'Monto', 'Categoría'];
      const colWidths = [32, 70, 28, 50];
      let y = tableY + 6;
      doc.setFillColor(255, 183, 178);
      doc.setTextColor(255, 87, 127);
      doc.roundedRect(12, y - 5, 186, 8, 2, 2, 'F');
      let x = 14;
      tableHeaders.forEach((h, i) => {
        doc.text(h, x, y);
        x += colWidths[i];
      });
      doc.setFontSize(11);
      sortedFiltered.forEach((t, idx) => {
        y += 7;
        x = 14;
        if (idx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
          doc.rect(12, y - 5, 186, 7, 'F');
        } else {
          doc.setFillColor(245, 245, 245);
          doc.rect(12, y - 5, 186, 7, 'F');
        }
        doc.setTextColor(80, 80, 80);
        doc.text(new Date(t.date).toLocaleDateString(), x, y);
        x += colWidths[0];
        doc.text(t.name, x, y);
        x += colWidths[1];
        doc.text(`S/ ${t.amount.toFixed(2)}`, x, y);
        x += colWidths[2];
        doc.text(t.categories?.name || 'Sin categoría', x, y);
      });
      // Pie de página
      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text('Generado por ControlGastos-Catt', 12, 287);
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 120, 287);
      doc.save('reporte-gastos.pdf');
      toast({ title: "Exportado a PDF", description: `Se han exportado ${filtered.length} transacciones.` });
    }
    setIsExportDialogOpen(false);
  };

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
          <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30" onClick={() => handleOpenExportDialog('excel')}>Exportar Excel</Button>
          <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30" onClick={() => handleOpenExportDialog('pdf')}>Exportar PDF</Button>
          <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30" onClick={handleResetFilters}>
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
              <TransactionForm
                initialData={{ id: 0, name: "", amount: "", category_id: "", date: new Date() }}
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

      {/* Month selector */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Transacciones</h2>
        <MonthSelector currentMonth={currentMonth} onChange={setCurrentMonth} />
      </div>

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
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map(transaction => (
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
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(transaction.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Dialog para exportar */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-lg bg-white rounded-2xl border-pastel-yellow/30">
          <DialogHeader>
            <DialogTitle>Exportar transacciones</DialogTitle>
            <DialogDescription>Elige el rango de fechas, meses o toda la data y las categorías que deseas exportar. El PDF tendrá un formato de informe profesional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={exportMode} onValueChange={setExportMode} className="flex gap-4">
              <RadioGroupItem value="all" id="all" />
              <label htmlFor="all" className="mr-4">Toda la data</label>
              <RadioGroupItem value="range" id="range" />
              <label htmlFor="range" className="mr-4">Rango de fechas</label>
              <RadioGroupItem value="months" id="months" />
              <label htmlFor="months">Meses</label>
            </RadioGroup>
            {exportMode === 'range' && (
              <div className="flex items-center gap-2">
                <label className="block font-medium">Fecha</label>
                <Input type="date" value={exportStartDate ? format(exportStartDate, 'yyyy-MM-dd') : ''} onChange={e => setExportStartDate(e.target.value ? new Date(e.target.value) : undefined)} />
                <span>a</span>
                <Input type="date" value={exportEndDate ? format(exportEndDate, 'yyyy-MM-dd') : ''} onChange={e => setExportEndDate(e.target.value ? new Date(e.target.value) : undefined)} />
              </div>
            )}
            {exportMode === 'months' && (
              <div>
                <label className="block font-medium mb-1">Meses</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {uniqueMonths.map(month => (
                    <label key={month} className="flex items-center gap-1 bg-pastel-blue/10 rounded px-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={exportMonths.includes(month)}
                        onCheckedChange={checked => {
                          setExportMonths(prev => checked ? [...prev, month] : prev.filter(m => m !== month));
                        }}
                      />
                      <span className="text-sm">{format(new Date(month + '-01'), 'MMMM yyyy', { locale: es })}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block font-medium mb-1">Categorías</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {supabaseCategories.map(category => (
                  <label key={category.id} className="flex items-center gap-1 bg-pastel-pink/10 rounded px-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={exportCategories.includes(category.id)}
                      onCheckedChange={checked => {
                        setExportCategories(prev => checked ? [...prev, category.id] : prev.filter(id => id !== category.id));
                      }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleExportConfirm} className="bg-pastel-green hover:bg-pastel-pink/80 text-white font-bold rounded-full px-6 py-2 shadow">
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
