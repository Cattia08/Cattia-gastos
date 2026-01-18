import React from "react";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTitle,
  ThemedDialogDescription,
} from "@/components/ui/ThemedDialog";
import TransactionForm from "@/components/transactions/TransactionForm";
import { useTransactionMutations } from "@/hooks/useTransactionMutations";
import { Sparkles } from "lucide-react";

import { Category } from "@/types/index";

type PaymentMethod = { id: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onCreated?: () => Promise<void> | void;
};

/**
 * AddTransactionDialog - Reusable dialog for adding new transactions
 * Uses centralized mutation hook for CRUD operations
 */
const AddTransactionDialog = ({ open, onOpenChange, categories, paymentMethods, onCreated }: Props) => {
  const { create, isCreating } = useTransactionMutations();

  const handleSave = async (form: { name: string; amount: string; category_id: string; payment_method_id?: number; date: Date }) => {
    if (!form.name || !form.amount) return;
    
    await create({
      name: form.name,
      amount: parseFloat(form.amount),
      category_id: form.category_id,
      payment_method_id: form.payment_method_id,
      date: form.date,
    });
    
    onOpenChange(false);
    await onCreated?.();
  };

  return (
    <ThemedDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Nueva Transacción"
      description="Completa los detalles de tu nueva transacción."
    >
      <ThemedDialogContent>
        <ThemedDialogHeader>
          <ThemedDialogTitle icon={<Sparkles className="w-5 h-5" />}>
            Nueva Transacción
          </ThemedDialogTitle>
          <ThemedDialogDescription>
            Completa los detalles de tu nueva transacción.
          </ThemedDialogDescription>
        </ThemedDialogHeader>
        <TransactionForm
          initialData={{ id: 0, name: "", amount: "", category_id: "", payment_method_id: undefined, date: new Date() }}
          categories={categories}
          paymentMethods={paymentMethods}
          onSave={handleSave}
          onCancel={() => onOpenChange(false)}
          isLoading={isCreating}
        />
      </ThemedDialogContent>
    </ThemedDialog>
  );
};

export default AddTransactionDialog;
