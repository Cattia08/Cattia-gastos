import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Category = { id: number; name: string };

type TxForm = {
  id: number;
  name: string;
  amount: string;
  category_id: string;
  date: Date;
};

type Props = {
  initialData: TxForm;
  categories: Category[];
  onSave: (form: TxForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

/**
 * TransactionForm - Reusable form for creating/editing transactions
 * Uses theme tokens for consistent styling
 */
const TransactionForm = ({ initialData, categories, onSave, onCancel, isLoading = false }: Props) => {
  const [form, setForm] = useState<TxForm>(initialData);

  useEffect(() => {
    setForm(initialData);
  }, [initialData.id]);

  const inputClass = cn(
    "rounded-xl border-gray-200",
    "focus:ring-2 focus:ring-theme-green/30 focus:border-theme-green",
    "transition-all duration-200"
  );

  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name" className="text-sm font-medium">Nombre</Label>
        <Input
          id="name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className={inputClass}
          placeholder="Ej. Compras supermercado"
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount" className="text-sm font-medium">Monto (S/)</Label>
        <Input
          id="amount"
          type="number"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className={inputClass}
          placeholder="0.00"
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category" className="text-sm font-medium">Categoría</Label>
        <Select
          value={form.category_id}
          onValueChange={value => setForm({ ...form, category_id: value })}
          disabled={isLoading}
        >
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="date" className="text-sm font-medium">Fecha</Label>
        <CustomDatePicker
          date={form.date}
          setDate={date => setForm({ ...form, date: date || new Date() })}
        />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <Button 
          variant="outline" 
          onClick={onCancel} 
          className="rounded-xl border-gray-200"
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button 
          onClick={() => onSave(form)}
          disabled={isLoading}
          className={cn(
            "rounded-xl",
            "bg-theme-green hover:bg-theme-sage text-white",
            "shadow-soft hover:shadow-glow-green",
            "transition-all duration-200"
          )}
        >
          {isLoading ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
};

export default TransactionForm;
