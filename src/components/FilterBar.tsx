import React from "react";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import InteractiveCalendar from "@/components/ui/InteractiveCalendar";
import { DatePeriodSelector, CategoryFilter } from "@/components/filters";
import { Search, Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Category = { id: number; name: string; color?: string };

interface FilterBarProps {
  categories: Category[];
  selectedCategories: number[];
  onSelectedCategoriesChange: (ids: number[]) => void;
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
    selectedDate !== undefined;

  return (
    <div className={cn(
      "card-glass p-4",
      "flex flex-col md:flex-row md:items-center gap-4",
      className
    )}>
      {/* Search Input */}
      <div className="flex-1 min-w-[160px] max-w-[260px]">
        <InputWithIcon
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className={cn(
            "w-full rounded-xl border-gray-200",
            "focus:ring-2 focus:ring-theme-green/30 focus:border-theme-green",
            "transition-all duration-200"
          )}
          icon={<Search className="w-4 h-4 text-theme-green" />}
        />
      </div>

      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
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
        <CategoryFilter
          categories={categories}
          selectedCategories={selectedCategories}
          onSelectionChange={onSelectedCategoriesChange}
          showCount={true}
          compact={compact}
        />

        {/* Date Range Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "rounded-xl border-gray-200",
                "bg-white hover:bg-pastel-rose/30",
                "hover:border-theme-rose/40",
                "transition-all duration-200",
                compact ? "px-3 py-1 text-xs h-7" : "px-4 py-1.5 text-sm",
                selectedDate && "ring-2 ring-theme-rose/30 border-theme-rose"
              )}
            >
              <CalendarIcon className={cn("mr-2 text-theme-rose", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
              {selectedDate && endDate
                ? `${format(selectedDate, "dd MMM")} - ${format(endDate, "dd MMM")}`
                : selectedDate
                ? format(selectedDate, "dd MMM yyyy")
                : "Rango de fechas"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            className="p-2 bg-white border-gray-200 shadow-soft-md rounded-xl"
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
            "rounded-xl text-muted-foreground",
            "hover:bg-pastel-cream hover:text-foreground",
            "transition-all duration-200",
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
