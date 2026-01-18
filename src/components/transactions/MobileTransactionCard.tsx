import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaCreditCard, FaExclamationCircle } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import CategoryBadge from '@/components/ui/CategoryBadge';
import { SwipeableListItem } from '@/components/ui/SwipeableListItem';

interface Transaction {
  id: number;
  name: string;
  amount: number;
  date: string;
  category_id?: number | string | null;
  payment_method_id?: number | null;
  categories?: {
    id: number;
    name: string;
    color: string;
  } | null;
  payment_methods?: {
    id: number;
    name: string;
  } | null;
}

interface MobileTransactionCardProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: number) => void;
  /** Whether swipe actions are enabled */
  swipeEnabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Mobile-optimized transaction card with swipe gestures.
 * Displays transaction info in a vertically stacked layout.
 */
export function MobileTransactionCard({
  transaction,
  onEdit,
  onDelete,
  swipeEnabled = true,
  className,
}: MobileTransactionCardProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col gap-3 p-4',
        'bg-white dark:bg-card',
        'border-b border-border/30',
        'active:bg-muted/30',
        'transition-colors duration-100',
        className
      )}
    >
      {/* Top row: Name and Amount */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Category color indicator */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${transaction.categories?.color || '#FF7597'}15` }}
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: transaction.categories?.color || '#FF7597' }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text-primary truncate text-base">
              {transaction.name}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {format(new Date(transaction.date), "d MMM, yyyy", { locale: es })}
            </p>
          </div>
        </div>
        
        {/* Amount */}
        <span className="text-lg font-bold text-text-emphasis tabular-nums whitespace-nowrap">
          S/ {transaction.amount.toFixed(2)}
        </span>
      </div>

      {/* Bottom row: Category and Payment Method */}
      <div className="flex items-center justify-between gap-3 pl-13">
        <div className="flex items-center gap-2 overflow-hidden">
          {transaction.categories ? (
            <CategoryBadge 
              name={transaction.categories.name} 
              color={transaction.categories.color}
            />
          ) : (
            <span className="badge-uncategorized inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full">
              <FaExclamationCircle className="w-3 h-3" />
              Sin categoría
            </span>
          )}
        </div>

        {transaction.payment_methods && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FaCreditCard className="w-3 h-3" />
            <span className="truncate max-w-[100px]">
              {transaction.payment_methods.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  if (!swipeEnabled) {
    return content;
  }

  return (
    <SwipeableListItem
      onEdit={() => onEdit(transaction)}
      onDelete={() => onDelete(transaction.id)}
      threshold={80}
    >
      {content}
    </SwipeableListItem>
  );
}

export default MobileTransactionCard;
