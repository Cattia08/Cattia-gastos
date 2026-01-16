/**
 * Shared TypeScript types for the application
 * Centralized to avoid duplication and ensure consistency
 */

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
}

export interface Transaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  category_id?: string;
  categories?: Category;
  payment_method_id?: number;
  payment_methods?: PaymentMethod;
}

export interface Income {
  id: number;
  source: string;
  amount: number;
  date: string;
}
