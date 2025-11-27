import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import { Button } from "@/components/ui/button";

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
};

const TransactionForm = ({ initialData, categories, onSave, onCancel }: Props) => {
  const [form, setForm] = useState<TxForm>(initialData);

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
            {categories.map(category => (
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
        <Button onClick={() => onSave(form)}>Guardar</Button>
      </div>
    </div>
  );
};

export default TransactionForm;
