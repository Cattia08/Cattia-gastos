import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Category } from '@/types';

// Query function
async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data ?? [];
}

// Mutation functions
async function addCategoryFn(categoryData: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert([categoryData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function updateCategoryFn({ id, ...categoryData }: Partial<Category> & { id: number }): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function deleteCategoryFn(id: number): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

export function useCategories() {
  const queryClient = useQueryClient();
  
  // Query
  const query = useQuery({
    queryKey: queryKeys.categories.list(),
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30,   // 30 minutes
  });

  // Mutations with cache invalidation
  const addMutation = useMutation({
    mutationFn: addCategoryFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCategoryFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategoryFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  // Wrapper functions for backwards compatibility
  const addCategory = async (categoryData: Partial<Category>) => {
    try {
      const data = await addMutation.mutateAsync(categoryData);
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  };

  const updateCategory = async (id: number, categoryData: Partial<Category>) => {
    try {
      const data = await updateMutation.mutateAsync({ id, ...categoryData });
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: query.refetch,
  };
}
