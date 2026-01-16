/**
 * Centralized Query Keys
 * Ensures consistent cache invalidation across the app
 */
export const queryKeys = {
  // Transactions
  transactions: {
    all: ['transactions'] as const,
    list: () => [...queryKeys.transactions.all, 'list'] as const,
  },
  
  // Categories
  categories: {
    all: ['categories'] as const,
    list: () => [...queryKeys.categories.all, 'list'] as const,
  },
  
  // Income
  income: {
    all: ['income'] as const,
    list: () => [...queryKeys.income.all, 'list'] as const,
  },
} as const;
