import { useMemo } from 'react';
import { isSameDay, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

interface Transaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  category_id?: number;
  payment_method_id?: number;
  categories?: {
    id: number;
    name: string;
    color: string;
  };
}

interface FilterOptions {
  searchQuery?: string;
  selectedCategories?: number[];
  selectedPaymentMethods?: number[];
  selectedYear: number;
  selectedMonth: number | null;
  selectedDate?: Date;
  endDate?: Date;
  totalCategories?: number;
  totalPaymentMethods?: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Custom hook that centralizes transaction filtering logic
 * Used by both Dashboard and Transactions pages to ensure consistent behavior
 */
export function useFilteredTransactions(
  transactions: Transaction[],
  options: FilterOptions
) {
  const {
    searchQuery = '',
    selectedCategories = [],
    selectedPaymentMethods = [],
    selectedYear,
    selectedMonth,
    selectedDate,
    endDate,
    totalCategories = 0,
    totalPaymentMethods = 0,
  } = options;

  // Compute date range based on selected year/month
  const dateRange = useMemo<DateRange>(() => {
    if (selectedMonth !== null) {
      const monthDate = new Date(selectedYear, selectedMonth, 1);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      };
    }
    return {
      start: new Date(selectedYear, 0, 1),
      end: new Date(selectedYear, 11, 31, 23, 59, 59),
    };
  }, [selectedYear, selectedMonth]);

  // Previous period for comparison calculations
  const previousRange = useMemo<DateRange>(() => {
    if (selectedMonth !== null) {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const monthDate = new Date(prevYear, prevMonth, 1);
      return {
        start: startOfMonth(monthDate),
        end: endOfMonth(monthDate),
      };
    }
    return {
      start: new Date(selectedYear - 1, 0, 1),
      end: new Date(selectedYear - 1, 11, 31, 23, 59, 59),
    };
  }, [selectedYear, selectedMonth]);

  // Main filtered transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Filter by period (year/month) or custom date range
    if (selectedDate) {
      if (endDate) {
        result = result.filter(t =>
          isWithinInterval(new Date(t.date), { start: selectedDate, end: endDate })
        );
      } else {
        result = result.filter(t => isSameDay(new Date(t.date), selectedDate));
      }
    } else {
      result = result.filter(t =>
        isWithinInterval(new Date(t.date), { start: dateRange.start, end: dateRange.end })
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(query)
      );
    }

    // Filter by categories (only if not all selected)
    if (selectedCategories.length > 0 && selectedCategories.length < totalCategories) {
      result = result.filter(t => selectedCategories.includes(t.categories?.id ?? -1));
    }

    // Filter by payment methods (only if not all selected)
    if (selectedPaymentMethods.length > 0 && selectedPaymentMethods.length < totalPaymentMethods) {
      result = result.filter(t => 
        t.payment_method_id && selectedPaymentMethods.includes(t.payment_method_id)
      );
    }

    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    transactions,
    selectedDate,
    endDate,
    dateRange,
    searchQuery,
    selectedCategories,
    totalCategories,
    selectedPaymentMethods,
    totalPaymentMethods,
  ]);

  // Calculate available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Period totals
  const periodTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const previousPeriodTotal = useMemo(() => {
    return transactions
      .filter(t => isWithinInterval(new Date(t.date), { start: previousRange.start, end: previousRange.end }))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, previousRange]);

  return {
    filteredTransactions,
    dateRange,
    previousRange,
    availableYears,
    periodTotal,
    previousPeriodTotal,
    transactionCount: filteredTransactions.length,
  };
}

export default useFilteredTransactions;
