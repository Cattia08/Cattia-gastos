import React from "react";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InteractiveCalendar from "@/components/ui/InteractiveCalendar";
import { DatePeriodSelector, MultiSelectFilter } from "@/components/filters";
import { Search, Calendar as CalendarIcon, X, CreditCard, Tag as TagIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Category, PaymentMethod } from "@/types";

interface FilterBarProps {
  categories: Category[];
  selectedCategories: number[];
  onSelectedCategoriesChange: (ids: number[]) => void;
  paymentMethods?: PaymentMethod[];
  selectedPaymentMethods?: number[];
  onSelectedPaymentMethodsChange?: (ids: number[]) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedDate?: Date;
  endDate?: Date;
  onDateSelect: (d?: Date) => void;
  onRangeSelect: (d?: Date) => void;
  selectedYear?: number;
  selectedMonth?: number | null;
  onYearChange?: (year: number) => void;
  onMonthChange?: (month: number | null) => void;
  availableYears?: number[];
  showPeriodSelector?: boolean;
  onReset: () => void;
  expenses?: { date: Date; amount: number }[];
  className?: string;
  compact?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategories,
  onSelectedCategoriesChange,
  paymentMethods = [],
  selectedPaymentMethods = [],
  onSelectedPaymentMethodsChange,
  searchQuery,
  onSearchQueryChange,
  selectedDate,
  endDate,
  onDateSelect,
  onRangeSelect,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  availableYears = [],
  showPeriodSelector = false,
  onReset,
  expenses = [],
  className,
  compact = false,
}) => {
  const hasActiveFilters = searchQuery ||
    selectedCategories.length !== categories.length ||
    (paymentMethods.length > 0 && selectedPaymentMethods.length !== paymentMethods.length) ||
    selectedDate !== undefined;

  return (
    <div className={cn(
      "rounded-2xl bg-card/80 backdrop-blur-sm border border-border shadow-soft p-3 md:p-4",
      "flex flex-col md:flex-row md:items-center gap-3 md:gap-4",
      className
    )}>
      {/* Search Input */}
      <div className="flex-1 min-w-[160px] max-w-[280px]">
        <InputWithIcon
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className={cn(
            "w-full rounded-xl border-border",
            "focus:ring-2 focus:ring-primary/25 focus:border-primary",
            "transition-shadow duration-200"
          )}
          icon={<Search className="w-4 h-4 text-text-muted" />}
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Period Selector */}
        {showPeriodSelector && onYearChange && onMonthChange && availableYears.length > 0 && (
          <DatePeriodSelector
            selectedYear={selectedYear ?? new Date().getFullYear()}
            selectedMonth={selectedMonth ?? null}
            onYearChange={onYearChange}
            onMonthChange={onMonthChange}
            availableYears={availableYears}
            compact={compact}
          />
        )}

        {/* Category Filter */}
        <MultiSelectFilter
          label="Categorías"
          icon={TagIcon}
          iconColorClass="text-primary"
          items={categories}
          selectedIds={selectedCategories}
          onSelectionChange={onSelectedCategoriesChange}
          showCount={true}
          compact={compact}
        />

        {/* Payment Method Filter */}
        {paymentMethods.length > 0 && onSelectedPaymentMethodsChange && (
          <MultiSelectFilter
            label="Métodos"
            icon={CreditCard}
            iconColorClass="text-secondary-foreground"
            items={paymentMethods}
            selectedIds={selectedPaymentMethods}
            onSelectionChange={onSelectedPaymentMethodsChange}
            showCount={true}
            compact={compact}
          />
        )}

        {/* Date Range Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-xl border-border",
                "bg-card hover:bg-primary/5 dark:hover:bg-primary/10",
                "hover:border-primary/40",
                "transition-colors duration-200",
                compact ? "px-3 py-1 text-xs h-7" : "px-4 py-1.5 text-sm",
                selectedDate && "ring-2 ring-primary/30 border-primary"
              )}
            >
              <CalendarIcon className={cn("mr-2 text-primary", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
              {selectedDate && endDate
                ? `${format(selectedDate, "dd MMM")} - ${format(endDate, "dd MMM")}`
                : selectedDate
                  ? format(selectedDate, "dd MMM yyyy")
                  : "Fechas"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="p-2 bg-popover border-border shadow-soft-md rounded-xl"
            align="start"
          >
            <InteractiveCalendar
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              rangeDate={endDate}
              onRangeSelect={onRangeSelect}
              onReset={() => {
                onDateSelect(undefined);
                onRangeSelect(undefined);
              }}
              className="w-full"
              expenses={expenses}
              mode={endDate ? "range" : "single"}
              inline
            />
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Reset Button */}
        <Button
          onClick={onReset}
          variant="ghost"
          className={cn(
            "rounded-xl text-text-muted",
            "hover:bg-muted hover:text-foreground",
            "transition-colors duration-200",
            compact ? "px-3 py-1 text-xs h-7" : "px-4 py-1.5 text-sm",
            !hasActiveFilters && "opacity-40 pointer-events-none"
          )}
        >
          <X className={cn("mr-1", compact ? "w-3 h-3" : "w-3.5 h-3.5")} />
          Limpiar
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;
