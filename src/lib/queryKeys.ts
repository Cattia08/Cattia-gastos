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
  
  // Payment Methods
  paymentMethods: {
    all: ['payment_methods'] as const,
    list: () => [...queryKeys.paymentMethods.all, 'list'] as const,
  },
  
  // User Settings
  settings: {
    all: ['settings'] as const,
    detail: () => [...queryKeys.settings.all, 'detail'] as const,
  },
  
  // Category Budgets
  budgets: {
    all: ['budgets'] as const,
    list: () => [...queryKeys.budgets.all, 'list'] as const,
  },
} as const;
