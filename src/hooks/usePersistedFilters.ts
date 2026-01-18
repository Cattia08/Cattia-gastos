import { useState, useEffect, useCallback } from 'react';

export interface FilterState {
  selectedYear: number;
  selectedMonth: number | null;
  selectedCategories: number[];
  selectedPaymentMethods: number[];
  searchQuery: string;
}

const STORAGE_KEY = 'cattia-filters';

const getDefaultFilters = (): FilterState => ({
  selectedYear: new Date().getFullYear(),
  selectedMonth: new Date().getMonth(),
  selectedCategories: [],
  selectedPaymentMethods: [],
  searchQuery: '',
});

/**
 * Custom hook that persists filter state to localStorage
 * Filters survive page refresh and navigation between screens
 */
export function usePersistedFilters() {
  const [filters, setFiltersState] = useState<FilterState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...getDefaultFilters(),
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Failed to load persisted filters:', e);
    }
    return getDefaultFilters();
  });

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
      console.warn('Failed to persist filters:', e);
    }
  }, [filters]);

  const setFilters = useCallback((update: Partial<FilterState> | ((prev: FilterState) => Partial<FilterState>)) => {
    setFiltersState(prev => {
      const newValues = typeof update === 'function' ? update(prev) : update;
      return { ...prev, ...newValues };
    });
  }, []);

  const resetFilters = useCallback(() => {
    const defaults = getDefaultFilters();
    setFiltersState(defaults);
  }, []);

  // Initialize categories/payment methods when data loads
  const initializeSelections = useCallback((
    categories: { id: number; name: string }[],
    paymentMethods: { id: number }[]
  ) => {
    setFiltersState(prev => {
      const updates: Partial<FilterState> = {};
      
      // Only initialize if empty (first load or after data loads)
      if (prev.selectedCategories.length === 0 && categories.length > 0) {
        // Exclude "Otros" category by default
        updates.selectedCategories = categories
          .filter(c => c.name.toLowerCase() !== 'otros')
          .map(c => c.id);
      }
      if (prev.selectedPaymentMethods.length === 0 && paymentMethods.length > 0) {
        updates.selectedPaymentMethods = paymentMethods.map(m => m.id);
      }
      
      return { ...prev, ...updates };
    });
  }, []);

  return {
    filters,
    setFilters,
    resetFilters,
    initializeSelections,
    // Convenience setters
    setSelectedYear: (year: number) => setFilters({ selectedYear: year }),
    setSelectedMonth: (month: number | null) => setFilters({ selectedMonth: month }),
    setSelectedCategories: (ids: number[]) => setFilters({ selectedCategories: ids }),
    setSelectedPaymentMethods: (ids: number[]) => setFilters({ selectedPaymentMethods: ids }),
    setSearchQuery: (query: string) => setFilters({ searchQuery: query }),
  };
}

export default usePersistedFilters;
