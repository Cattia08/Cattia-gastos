import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface Income {
  id: number;
  amount: number;
  source?: string;
  date?: string;
}

async function fetchIncome(): Promise<Income[]> {
  const { data, error } = await supabase
    .from('income')
    .select('*');
  
  if (error) throw error;
  return data ?? [];
}

export function useIncome() {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: queryKeys.income.list(),
    queryFn: fetchIncome,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.income.all });
  };

  return {
    income: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
