import React, { useEffect, useMemo, useState } from "react";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTitle,
  ThemedDialogDescription,
  ThemedDialogFooter,
} from "@/components/ui/ThemedDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FaFileDownload, 
  FaFilePdf, 
  FaFileExcel, 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaCalendarAlt,
} from "react-icons/fa";
import { cn } from "@/lib/utils";
import { useThemedToast } from "@/hooks/useThemedToast";
import { MultiSelectFilter } from "@/components/filters";
import { exportToExcel, exportToPdf, type ExportTransaction, type ExportOptions } from "@/lib/export";

type Category = { id: number; name: string; color?: string };
type PaymentMethod = { id: number; name: string };

type ExportModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactions: ExportTransaction[];
  categories: Category[];
  paymentMethods?: PaymentMethod[];
};

// Quick period options
type QuickPeriod = 'all' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'custom';

const PERIOD_OPTIONS: { value: QuickPeriod; label: string }[] = [
  { value: 'thisMonth', label: 'Este mes' },
  { value: 'lastMonth', label: 'Mes pasado' },
  { value: 'last3Months', label: 'Ultimos 3 meses' },
  { value: 'thisYear', label: 'Este año' },
  { value: 'all', label: 'Todo' },
  { value: 'custom', label: 'Personalizado' },
];

const ExportModal: React.FC<ExportModalProps> = ({ 
  open, 
  onOpenChange, 
  transactions, 
  categories,
  paymentMethods = [],
}) => {
  const toast = useThemedToast();
  const [formatType, setFormatType] = useState<'excel' | 'pdf'>('excel');
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const allCatIds = useMemo(() => categories.map(c => c.id), [categories]);

  // Category and payment method lookup maps
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach(c => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const paymentMethodMap = useMemo(() => {
    const map: Record<number, string> = {};
    paymentMethods.forEach(m => { map[m.id] = m.name; });
    return map;
  }, [paymentMethods]);

  // Reset selections when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCats(allCatIds);
      setIsExporting(false);
      setQuickPeriod('thisMonth');
      setCustomStartDate('');
      setCustomEndDate('');
    }
  }, [open, allCatIds]);

  // Calculate date range based on period selection
  const dateRange = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    
    switch (quickPeriod) {
      case 'thisMonth':
        return {
          start: new Date(thisYear, thisMonth, 1),
          end: new Date(thisYear, thisMonth + 1, 0),
        };
      case 'lastMonth':
        return {
          start: new Date(thisYear, thisMonth - 1, 1),
          end: new Date(thisYear, thisMonth, 0),
        };
      case 'last3Months':
        return {
          start: new Date(thisYear, thisMonth - 2, 1),
          end: new Date(thisYear, thisMonth + 1, 0),
        };
      case 'thisYear':
        return {
          start: new Date(thisYear, 0, 1),
          end: new Date(thisYear, 11, 31),
        };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null,
        };
      case 'all':
      default:
        return { start: null, end: null };
    }
  }, [quickPeriod, customStartDate, customEndDate]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Filter by date range
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(t => {
        const date = new Date(t.date);
        return date >= dateRange.start! && date <= dateRange.end!;
      });
    } else if (dateRange.start) {
      filtered = filtered.filter(t => new Date(t.date) >= dateRange.start!);
    } else if (dateRange.end) {
      filtered = filtered.filter(t => new Date(t.date) <= dateRange.end!);
    }
    
    // Filter by categories
    if (selectedCats.length > 0 && selectedCats.length < categories.length) {
      filtered = filtered.filter(t => selectedCats.includes(t.category_id as number));
    }
    
    return filtered;
  }, [transactions, dateRange, selectedCats, categories.length]);

  // Preview stats
  const previewStats = useMemo(() => {
    const count = filteredTransactions.length;
    const total = filteredTransactions.reduce((s, t) => s + t.amount, 0);
    return { count, total };
  }, [filteredTransactions]);

  const handleConfirm = async () => {
    if (filteredTransactions.length === 0) {
      toast.warning({ 
        title: "Sin datos", 
        description: "No hay transacciones en el periodo seleccionado" 
      });
      return;
    }
    
    setIsExporting(true);
    
    const exportOptions: ExportOptions = {
      mode: quickPeriod === 'all' ? 'all' : 'range',
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      months: [],
      categoryMap,
      paymentMethodMap,
    };
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (formatType === 'excel') {
        await exportToExcel(filteredTransactions, exportOptions);
      } else {
        await exportToPdf(filteredTransactions, exportOptions);
      }
      
      toast.success({ 
        title: "Listo!", 
        description: `${filteredTransactions.length} transacciones exportadas` 
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error({ 
        title: "Error", 
        description: "No se pudo exportar. Intenta de nuevo." 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent size="lg" className="max-w-xl">
        <ThemedDialogHeader>
          <ThemedDialogTitle icon={<FaFileDownload className="w-5 h-5" />}>
            Exportar transacciones
          </ThemedDialogTitle>
          <ThemedDialogDescription>
            Descarga tus transacciones en el formato que prefieras
          </ThemedDialogDescription>
        </ThemedDialogHeader>
        
        <div className="space-y-5">
          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormatType('excel')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl transition-all",
                "border-2",
                formatType === 'excel'
                  ? "border-theme-green bg-pastel-mint/30"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <FaFileExcel className={cn(
                "w-8 h-8 mb-2",
                formatType === 'excel' ? "text-theme-green" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-semibold",
                formatType === 'excel' ? "text-theme-green" : "text-foreground"
              )}>
                Excel
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">Con estilos y graficos</span>
            </button>
            
            <button
              onClick={() => setFormatType('pdf')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl transition-all",
                "border-2",
                formatType === 'pdf'
                  ? "border-theme-rose bg-pastel-pink/30"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <FaFilePdf className={cn(
                "w-8 h-8 mb-2",
                formatType === 'pdf' ? "text-theme-rose" : "text-muted-foreground"
              )} />
              <span className={cn(
                "font-semibold",
                formatType === 'pdf' ? "text-theme-rose" : "text-foreground"
              )}>
                PDF
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">Reporte visual</span>
            </button>
          </div>

          {/* Period Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Periodo</Label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setQuickPeriod(value)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                    "border",
                    quickPeriod === value
                      ? "border-theme-lavender bg-pastel-lavender/40 text-theme-lavender"
                      : "border-border bg-card text-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Custom date range */}
            {quickPeriod === 'custom' && (
              <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-muted/30 border border-border">
                <FaCalendarAlt className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="rounded-lg h-9"
                  placeholder="Desde"
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="rounded-lg h-9"
                  placeholder="Hasta"
                />
              </div>
            )}
          </div>

          {/* Category Selection - Using Standard MultiSelectFilter */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Categorias</Label>
            <MultiSelectFilter
              label="Categorias"
              icon={FaCalendarAlt}
              iconColorClass="text-theme-lavender"
              items={categories}
              selectedIds={selectedCats}
              onSelectionChange={setSelectedCats}
              showCount={true}
              compact={false}
            />
          </div>

          {/* Preview Stats */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl",
            "bg-gradient-to-r from-pastel-mint/50 to-pastel-lavender/30",
            "border border-border"
          )}>
            <div className="flex items-center gap-3">
              {previewStats.count > 0 ? (
                <div className="w-10 h-10 rounded-full bg-theme-green/20 flex items-center justify-center">
                  <FaCheckCircle className="w-5 h-5 text-theme-green" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <FaExclamationTriangle className="w-5 h-5 text-amber-500" />
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {previewStats.count} transacciones
                </p>
                <p className="text-xs text-muted-foreground">
                  {quickPeriod !== 'all' && dateRange.start && dateRange.end
                    ? `${format(dateRange.start, 'd MMM', { locale: es })} - ${format(dateRange.end, 'd MMM yyyy', { locale: es })}`
                    : quickPeriod === 'all' ? 'Todo el historial' : 'Selecciona fechas'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-theme-green">
                S/ {previewStats.total.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        <ThemedDialogFooter className="mt-6">
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isExporting || previewStats.count === 0}
            className={cn(
              "rounded-xl px-6 min-w-[140px]",
              formatType === 'excel'
                ? "bg-theme-green hover:bg-theme-sage text-white"
                : "bg-theme-rose hover:bg-theme-rose/80 text-white",
              "transition-all duration-200",
              "disabled:opacity-50"
            )}
          >
            {isExporting ? (
              <>
                <FaSpinner className="w-4 h-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                {formatType === 'excel' ? <FaFileExcel className="w-4 h-4 mr-2" /> : <FaFilePdf className="w-4 h-4 mr-2" />}
                Descargar
              </>
            )}
          </Button>
        </ThemedDialogFooter>
      </ThemedDialogContent>
    </ThemedDialog>
  );
};

export default ExportModal;
