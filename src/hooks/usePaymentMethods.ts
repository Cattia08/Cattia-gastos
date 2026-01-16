import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { PaymentMethod } from '@/types';

async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('id');
  
  if (error) throw error;
  return data ?? [];
}

export function usePaymentMethods() {
  const query = useQuery({
    queryKey: queryKeys.paymentMethods.list(),
    queryFn: fetchPaymentMethods,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  return {
    paymentMethods: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
