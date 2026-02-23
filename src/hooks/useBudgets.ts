/**
 * useBudgets — Manage category budget limits
 * CRUD operations for category_budgets table with budget usage calculation
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';

export interface CategoryBudget {
    id?: number;
    user_id?: string;
    category_id: number;
    monthly_limit: number;
    alert_threshold: number;
    // Joined data
    categories?: {
        id: number;
        name: string;
        color: string;
    };
}

export interface BudgetWithUsage extends CategoryBudget {
    spent: number;
    percentage: number;
    status: 'safe' | 'warning' | 'danger' | 'exceeded';
}

async function fetchBudgets(userId: string): Promise<CategoryBudget[]> {
    const { data, error } = await supabase
        .from('category_budgets')
        .select(`
      *,
      categories (
        id,
        name,
        color
      )
    `)
        .eq('user_id', userId);

    if (error) throw error;
    return data ?? [];
}

async function upsertBudget(budget: {
    user_id: string;
    category_id: number;
    monthly_limit: number;
    alert_threshold?: number;
}): Promise<CategoryBudget> {
    const { data, error } = await supabase
        .from('category_budgets')
        .upsert(budget, { onConflict: 'user_id,category_id' })
        .select(`
      *,
      categories (
        id,
        name,
        color
      )
    `)
        .single();

    if (error) throw error;
    return data;
}

async function deleteBudget(id: number): Promise<void> {
    const { error } = await supabase
        .from('category_budgets')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

export function useBudgets() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.id;

    const query = useQuery({
        queryKey: queryKeys.budgets.list(),
        queryFn: () => fetchBudgets(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const upsertMutation = useMutation({
        mutationFn: upsertBudget,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteBudget,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
        },
    });

    const setBudget = async (categoryId: number, monthlyLimit: number, alertThreshold = 80) => {
        if (!userId) return;
        return upsertMutation.mutateAsync({
            user_id: userId,
            category_id: categoryId,
            monthly_limit: monthlyLimit,
            alert_threshold: alertThreshold,
        });
    };

    const removeBudget = async (id: number) => {
        return deleteMutation.mutateAsync(id);
    };

    /**
     * Calculate budget usage for the current month
     * Pass in the current transactions to compute spending per category
     */
    const getBudgetsWithUsage = (transactions: Array<{
        amount: number;
        date: string;
        category_id?: string;
    }>): BudgetWithUsage[] => {
        const budgets = query.data ?? [];
        if (budgets.length === 0) return [];

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Filter transactions for current month
        const monthTx = transactions.filter(t => {
            const d = new Date(t.date);
            return d >= monthStart && d <= monthEnd;
        });

        return budgets.map(budget => {
            const spent = monthTx
                .filter(t => t.category_id !== undefined && Number(t.category_id) === budget.category_id)
                .reduce((sum, t) => sum + t.amount, 0);

            const percentage = budget.monthly_limit > 0
                ? Math.round((spent / budget.monthly_limit) * 100)
                : 0;

            let status: BudgetWithUsage['status'] = 'safe';
            if (percentage >= 100) status = 'exceeded';
            else if (percentage >= budget.alert_threshold) status = 'danger';
            else if (percentage >= 60) status = 'warning';

            return {
                ...budget,
                spent,
                percentage,
                status,
            };
        });
    };

    return {
        budgets: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        setBudget,
        removeBudget,
        getBudgetsWithUsage,
        isSaving: upsertMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}
