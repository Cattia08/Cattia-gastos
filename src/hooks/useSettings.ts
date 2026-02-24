/**
 * useSettings — Manage user notification settings
 * Reads/writes user_settings from Supabase with TanStack Query
 * Uses optimistic updates for instant UI feedback on toggle changes
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';

export interface UserSettings {
    id?: number;
    user_id?: string;
    email_reports_enabled: boolean;
    report_frequency: 'weekly' | 'monthly';
    report_email: string;
    budget_alerts_enabled: boolean;
    daily_digest_enabled: boolean;
}

const defaultSettings: UserSettings = {
    email_reports_enabled: false,
    report_frequency: 'weekly',
    report_email: '',
    budget_alerts_enabled: false,
    daily_digest_enabled: false,
};

async function fetchSettings(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data ?? { ...defaultSettings, user_id: userId };
}

async function upsertSettings(settings: UserSettings & { user_id: string }): Promise<UserSettings> {
    const { data, error } = await supabase
        .from('user_settings')
        .upsert(settings, { onConflict: 'user_id' })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export function useSettings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.id;

    const query = useQuery({
        queryKey: queryKeys.settings.detail(),
        queryFn: () => fetchSettings(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });

    const mutation = useMutation({
        mutationFn: upsertSettings,
        // Optimistic update — toggle feels instant
        onMutate: async (newSettings) => {
            await queryClient.cancelQueries({ queryKey: queryKeys.settings.detail() });
            const previous = queryClient.getQueryData<UserSettings>(queryKeys.settings.detail());
            queryClient.setQueryData(queryKeys.settings.detail(), newSettings);
            return { previous };
        },
        onError: (_err, _new, context) => {
            // Rollback on error
            if (context?.previous) {
                queryClient.setQueryData(queryKeys.settings.detail(), context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
        },
    });

    const updateSettings = (updates: Partial<UserSettings>) => {
        if (!userId) return;
        const current = query.data ?? defaultSettings;
        mutation.mutate({
            ...current,
            ...updates,
            user_id: userId,
        });
    };

    const sendReportNow = async () => {
        if (!userId) throw new Error('No user');

        const { data, error } = await supabase.functions.invoke('scheduled-reports', {
            body: { force_user_id: userId },
        });

        console.log('[DEBUG sendReportNow] Response:', JSON.stringify(data, null, 2));

        if (error) {
            console.error('[DEBUG sendReportNow] Error:', error);
            throw new Error(error.message || 'Error al enviar el reporte');
        }

        return data;
    };

    const testBudgetAlerts = async () => {
        if (!userId) throw new Error('No user');

        const { data, error } = await supabase.functions.invoke('check-budgets', {
            body: { force_user_id: userId },
        });

        if (error) {
            throw new Error(error.message || 'Error al verificar presupuestos');
        }

        return data;
    };

    const testDailyDigest = async () => {
        if (!userId) throw new Error('No user');

        const { data, error } = await supabase.functions.invoke('daily-digest', {
            body: { force_user_id: userId },
        });

        if (error) {
            throw new Error(error.message || 'Error al enviar resumen diario');
        }

        return data;
    };

    return {
        settings: query.data ?? defaultSettings,
        isLoading: query.isLoading,
        error: query.error,
        updateSettings,
        isUpdating: mutation.isPending,
        sendReportNow,
        testBudgetAlerts,
        testDailyDigest,
    };
}
