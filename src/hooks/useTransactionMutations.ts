import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/hooks/use-toast';

export interface TransactionInput {
  name: string;
  amount: number;
  category_id?: string;
  date: Date | string;
}

export interface TransactionUpdateInput extends TransactionInput {
  id: number;
}

// Mutation functions
async function createTransaction(input: TransactionInput) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      name: input.name,
      amount: input.amount,
      category_id: input.category_id,
      date: input.date,
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function updateTransaction(input: TransactionUpdateInput) {
  const { data, error } = await supabase
    .from('transactions')
    .update({
      name: input.name,
      amount: input.amount,
      category_id: input.category_id,
      date: input.date,
    })
    .eq('id', input.id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function deleteTransaction(id: number) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

async function updateTransactionCategory(id: number, category_id: string) {
  const { error } = await supabase
    .from('transactions')
    .update({ category_id })
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * useTransactionMutations - Centralized hook for transaction CRUD operations
 * Provides consistent error handling, toasts, and cache invalidation
 */
export function useTransactionMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateTransactions = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  };

  // Create
  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      invalidateTransactions();
      toast({
        title: "Transacción añadida",
        description: "La transacción ha sido añadida con éxito",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Hubo un error al crear la transacción",
        variant: "destructive",
      });
    },
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: updateTransaction,
    onSuccess: () => {
      invalidateTransactions();
      toast({
        title: "Transacción actualizada",
        description: "La transacción ha sido actualizada con éxito",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar la transacción",
        variant: "destructive",
      });
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      invalidateTransactions();
      toast({
        title: "Transacción eliminada",
        description: "La transacción ha sido eliminada con éxito",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción",
        variant: "destructive",
      });
    },
  });

  // Update category only
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category_id }: { id: number; category_id: string }) =>
      updateTransactionCategory(id, category_id),
    onSuccess: () => {
      invalidateTransactions();
      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada con éxito",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar la categoría",
        variant: "destructive",
      });
    },
  });

  return {
    // Mutations
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    
    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Manual invalidation
    invalidate: invalidateTransactions,
  };
}
