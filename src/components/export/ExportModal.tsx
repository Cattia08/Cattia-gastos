import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

type Tx = { id: number; name: string; amount: number; date: string; category_id?: number };
type Category = { id: number; name: string };

type ExportModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactions: Tx[];
  categories: Category[];
};

const ExportModal: React.FC<ExportModalProps> = ({ open, onOpenChange, transactions, categories }) => {
  const [mode, setMode] = useState<'all' | 'range' | 'months'>('all');
  const [formatType, setFormatType] = useState<'excel' | 'pdf'>('pdf');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [months, setMonths] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<number[]>([]);

  const allCatIds = useMemo(() => categories.map(c => c.id), [categories]);

  useEffect(() => {
    if (open) {
      setSelectedCats(allCatIds);
    }
  }, [open, allCatIds]);

  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.date);
      set.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filterTx = (): Tx[] => {
    let filtered = [...transactions];
    if (mode === 'range' && startDate) {
      if (endDate) {
        filtered = filtered.filter(t => new Date(t.date) >= startDate && new Date(t.date) <= endDate);
      } else {
        filtered = filtered.filter(t => format(new Date(t.date), 'yyyy-MM-dd') === format(startDate, 'yyyy-MM-dd'));
      }
    }
    if (mode === 'months' && months.length > 0) {
      filtered = filtered.filter(t => months.includes(`${new Date(t.date).getFullYear()}-${(new Date(t.date).getMonth() + 1).toString().padStart(2, '0')}`));
    }
    if (selectedCats.length > 0) {
      filtered = filtered.filter(t => selectedCats.includes(t.category_id as number));
    }
    return filtered;
  };

  const exportExcel = (data: Tx[]) => {
    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const ws = XLSX.utils.json_to_sheet(sorted.map(t => ({
      Fecha: new Date(t.date).toLocaleDateString(),
      Nombre: t.name,
      Monto: t.amount,
      CategoriaId: t.category_id || ''
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
    XLSX.writeFile(wb, "transacciones.xlsx");
  };

  const exportPdf = (data: Tx[]) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.setTextColor(255, 87, 127);
    doc.text('Reporte de gastos', 12, 16);
    doc.setTextColor(60, 60, 60);
    let dateText = '';
    if (mode === 'all') dateText = 'Todas las fechas';
    else if (mode === 'range' && startDate) dateText = endDate ? `Del ${startDate.toLocaleDateString()} al ${endDate.toLocaleDateString()}` : `Día: ${startDate.toLocaleDateString()}`;
    else if (mode === 'months' && months.length > 0) dateText = months.map(m => format(new Date(m + '-01'), 'MMMM yyyy', { locale: es })).join(', ');
    doc.setFontSize(10);
    doc.text(dateText, 12, 22);

    const headerY = 30;
    doc.setDrawColor(240, 240, 240);
    doc.line(12, headerY, 198, headerY);
    doc.setFontSize(11);
    let y = headerY + 8;
    const total = data.reduce((s, t) => s + t.amount, 0);
    doc.text(`Total: S/ ${total.toFixed(2)}`, 12, y);
    y += 6;
    doc.setFontSize(9);
    data.slice(0, 200).forEach(t => {
      doc.text(`${new Date(t.date).toLocaleDateString()}  •  ${t.name}  •  S/ ${t.amount.toFixed(2)}`.slice(0, 100), 12, y);
      y += 5;
      if (y > 280) { doc.addPage(); y = 16; }
    });

    doc.setTextColor(180, 180, 180);
    doc.text('Generado por ExpenseTracker', 12, 287);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 120, 287);
    doc.save('reporte-gastos.pdf');
  };

  const handleConfirm = () => {
    const data = filterTx();
    if (formatType === 'excel') exportExcel(data);
    else exportPdf(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white rounded-2xl border-pastel-yellow/30">
        <DialogHeader>
          <DialogTitle>Exportar transacciones</DialogTitle>
          <DialogDescription>Selecciona el formato, el rango y las categorías para exportar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="block mb-2">Formato</Label>
            <RadioGroup value={formatType} onValueChange={(v: any) => setFormatType(v)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="pdf" id="fmt-pdf" /><label htmlFor="fmt-pdf">PDF</label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="excel" id="fmt-excel" /><label htmlFor="fmt-excel">Excel</label></div>
            </RadioGroup>
          </div>

          <div>
            <Label className="block mb-2">Rango</Label>
            <RadioGroup value={mode} onValueChange={(v: any) => setMode(v)} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="all" id="rng-all" /><label htmlFor="rng-all">Toda la data</label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="range" id="rng-range" /><label htmlFor="rng-range">Rango de fechas</label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="months" id="rng-months" /><label htmlFor="rng-months">Meses</label></div>
            </RadioGroup>
            {mode === 'range' && (
              <div className="flex items-center gap-2 mt-3">
                <Label className="block">Fecha</Label>
                <Input type="date" value={startDate ? format(startDate, 'yyyy-MM-dd') : ''} onChange={e => setStartDate(e.target.value ? new Date(e.target.value) : undefined)} />
                <span>a</span>
                <Input type="date" value={endDate ? format(endDate, 'yyyy-MM-dd') : ''} onChange={e => setEndDate(e.target.value ? new Date(e.target.value) : undefined)} />
              </div>
            )}
            {mode === 'months' && (
              <div className="mt-3">
                <Label className="block mb-1">Meses</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {uniqueMonths.map(month => (
                    <label key={month} className="flex items-center gap-1 bg-pastel-blue/10 rounded px-2 py-1 cursor-pointer">
                      <Checkbox
                        checked={months.includes(month)}
                        onCheckedChange={checked => {
                          setMonths(prev => checked ? [...prev, month] : prev.filter(m => m !== month));
                        }}
                      />
                      <span className="text-sm">{format(new Date(month + '-01'), 'MMMM yyyy', { locale: es })}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="block mb-2">Categorías</Label>
            <div className="flex gap-2 mb-2">
              <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30" onClick={() => setSelectedCats(allCatIds)}>
                Seleccionar todas
              </Button>
              <Button variant="outline" className="rounded-full px-3 text-sm border-pastel-pink/30" onClick={() => setSelectedCats([])}>
                Retirar todas
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map(category => (
                <label key={category.id} className="flex items-center gap-1 bg-pastel-pink/10 rounded px-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={selectedCats.includes(category.id)}
                    onCheckedChange={checked => {
                      setSelectedCats(prev => checked ? [...prev, category.id] : prev.filter(id => id !== category.id));
                    }}
                  />
                  <span className="text-sm">{category.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleConfirm} className="bg-pastel-green hover:bg-pastel-pink/80 text-white font-bold rounded-full px-6 py-2 shadow">
              Exportar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;

