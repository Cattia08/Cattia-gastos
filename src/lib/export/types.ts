/**
 * Types for export utilities
 */
export interface ExportTransaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  category_id?: string | number;
  payment_method_id?: string | number;
}

export interface ExportCategory {
  id: number;
  name: string;
  color?: string;
}

export interface ExportPaymentMethod {
  id: number;
  name: string;
}

export interface ExportOptions {
  mode: 'all' | 'range' | 'months';
  startDate?: Date;
  endDate?: Date;
  months?: string[];
  categoryMap: Record<number, string>;
  paymentMethodMap: Record<number, string>;
}

export interface CategoryStats {
  name: string;
  total: number;
  count: number;
  percentage: number;
}
