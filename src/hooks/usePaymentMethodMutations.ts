import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { PaymentMethod } from '@/types';

interface CreatePaymentMethodInput {
  name: string;
}

interface UpdatePaymentMethodInput {
  id: number;
  name: string;
}

/**
 * Hook for payment method mutations (create, update, delete)
 * Follows the same pattern as useTransactionMutations
 */
export function usePaymentMethodMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (input: CreatePaymentMethodInput) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([{ name: input.name }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (input: UpdatePaymentMethodInput) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .update({ name: input.name })
        .eq('id', input.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      // Also invalidate transactions since they reference payment methods
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
    },
  });

  return {
    createPaymentMethod: createMutation.mutateAsync,
    updatePaymentMethod: updateMutation.mutateAsync,
    deletePaymentMethod: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
