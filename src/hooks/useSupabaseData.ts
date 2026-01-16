/**
 * useSupabaseData - Composed hook for all app data
 * Uses modular hooks with TanStack Query caching
 */
import { useTransactions } from './useTransactions';
import { useCategories } from './useCategories';
import { useIncome } from './useIncome';
import { usePaymentMethods } from './usePaymentMethods';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export const useSupabaseData = () => {
  const queryClient = useQueryClient();
  
  const { 
    transactions, 
    isLoading: transactionsLoading, 
    error: transactionsError,
  } = useTransactions();
  
  const { 
    categories, 
    loading: categoriesLoading, 
    error: categoriesError,
  } = useCategories();
  
  const { 
    income, 
    isLoading: incomeLoading, 
    error: incomeError,
  } = useIncome();

  const {
    paymentMethods,
    isLoading: paymentMethodsLoading,
    error: paymentMethodsError,
  } = usePaymentMethods();

  // Combined loading state
  const loading = transactionsLoading || categoriesLoading || incomeLoading || paymentMethodsLoading;
  
  // First error encountered
  const error = transactionsError || categoriesError || incomeError || paymentMethodsError;

  // Refresh all data - invalidates all caches
  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods.all }),
    ]);
  };

  return { 
    transactions, 
    income, 
    categories,
    paymentMethods, 
    loading, 
    error, 
    refreshData,
  };
};
