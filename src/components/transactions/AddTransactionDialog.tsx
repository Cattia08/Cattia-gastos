import React from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TransactionForm from "@/components/transactions/TransactionForm";
import { Heart } from "lucide-react";

type Category = { id: number; name: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
  onCreated?: () => Promise<void> | void;
};

const AddTransactionDialog = ({ open, onOpenChange, categories, onCreated }: Props) => {
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          categories={categories}
          onSave={async (form) => {
            if (!form.name || !form.amount) {
              toast({ title: "Error", description: "Por favor completa los campos requeridos", variant: "destructive" });
              return;
            }
            try {
              const { error } = await supabase.from("transactions").insert([
                { name: form.name, amount: parseFloat(form.amount), category_id: form.category_id, date: form.date }
              ]);
              if (error) throw error;
              toast({ title: "Transacción añadida", description: "La transacción ha sido añadida con éxito" });
              onOpenChange(false);
              await onCreated?.();
            } catch (err) {
              toast({ title: "Error", description: "Hubo un error al procesar la transacción", variant: "destructive" });
            }
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
