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
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar as CalendarIcon,
} from "lucide-react";
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
          <ThemedDialogTitle icon={<Download className="w-5 h-5" />}>
            Exportar transacciones
          </ThemedDialogTitle>
          <ThemedDialogDescription>
            Descarga en Excel o PDF
          </ThemedDialogDescription>
        </ThemedDialogHeader>
        
        <div className="space-y-5">
          {/* Format Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormatType('excel')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl transition-colors",
                "border-2",
                formatType === 'excel'
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <FileSpreadsheet className={cn(
                "w-8 h-8 mb-2",
                formatType === 'excel' ? "text-primary" : "text-text-muted"
              )} />
              <span className={cn(
                "font-semibold",
                formatType === 'excel' ? "text-primary" : "text-foreground"
              )}>
                Excel
              </span>
              <span className="text-xs text-text-muted mt-0.5">Datos + estilos</span>
            </button>

            <button
              onClick={() => setFormatType('pdf')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-2xl transition-colors",
                "border-2",
                formatType === 'pdf'
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border bg-card hover:border-primary/30"
              )}
            >
              <FileText className={cn(
                "w-8 h-8 mb-2",
                formatType === 'pdf' ? "text-primary" : "text-text-muted"
              )} />
              <span className={cn(
                "font-semibold",
                formatType === 'pdf' ? "text-primary" : "text-foreground"
              )}>
                PDF
              </span>
              <span className="text-xs text-text-muted mt-0.5">Reporte visual</span>
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
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border",
                    quickPeriod === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/30"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            
            {/* Custom date range */}
            {quickPeriod === 'custom' && (
              <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-muted/30 border border-border">
                <CalendarIcon className="w-4 h-4 text-text-muted" />
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
              icon={CalendarIcon}
              iconColorClass="text-primary"
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
            "bg-primary/[0.06] border border-primary/15"
          )}>
            <div className="flex items-center gap-3">
              {previewStats.count > 0 ? (
                <div className="w-10 h-10 rounded-2xl bg-accent/15 ring-1 ring-accent/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 ring-1 ring-amber-300/60 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {previewStats.count} transacciones
                </p>
                <p className="text-xs text-text-muted">
                  {quickPeriod !== 'all' && dateRange.start && dateRange.end
                    ? `${format(dateRange.start, 'd MMM', { locale: es })} - ${format(dateRange.end, 'd MMM yyyy', { locale: es })}`
                    : quickPeriod === 'all' ? 'Todo el historial' : 'Selecciona fechas'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary tabular-nums">
                <span className="text-base font-medium text-text-secondary mr-1">S/</span>{previewStats.total.toFixed(2)}
              </p>
              <p className="text-xs text-text-muted">Total</p>
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
              "bg-primary hover:bg-primary/90 text-primary-foreground",
              "shadow-[0_8px_22px_-8px_hsl(var(--primary)/0.5)]",
              "transition-shadow duration-200",
              "disabled:opacity-50 disabled:shadow-none"
            )}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exportando
              </>
            ) : (
              <>
                {formatType === 'excel' ? <FileSpreadsheet className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
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
