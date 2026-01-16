import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface Transaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  category_id?: string;
  categories?: {
    id: number;
    name: string;
    color: string;
  };
  payment_method_id?: number;
  payment_methods?: {
    id: number;
    name: string;
  };
}

async function fetchTransactions(): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      categories (
        id,
        name,
        color
      ),
      payment_methods (
        id,
        name
      )
    `)
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}

export function useTransactions() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: queryKeys.transactions.list(),
    queryFn: fetchTransactions,
    staleTime: 1000 * 60 * 2, // 2 minutes - data considered fresh
    gcTime: 1000 * 60 * 10,   // 10 minutes - keep in cache
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
  };

  return {
    transactions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
