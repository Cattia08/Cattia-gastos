/**
 * useSupabaseData - Composed hook for all app data
 * Uses modular hooks with TanStack Query caching
 */
import { useTransactions } from './useTransactions';
import { useCategories } from './useCategories';
import { useIncome } from './useIncome';
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

  // Combined loading state
  const loading = transactionsLoading || categoriesLoading || incomeLoading;
  
  // First error encountered
  const error = transactionsError || categoriesError || incomeError;

  // Refresh all data - invalidates all caches
  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.income.all }),
    ]);
  };

  return { 
    transactions, 
    income, 
    categories, 
    loading, 
    error, 
    refreshData,
  };
};
