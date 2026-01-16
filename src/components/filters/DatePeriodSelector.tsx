import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePeriodSelectorProps {
  selectedYear: number;
  selectedMonth: number | null;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number | null) => void;
  availableYears: number[];
  className?: string;
  compact?: boolean;
}

const MONTHS = [
  { value: 0, label: "Enero" },
  { value: 1, label: "Febrero" },
  { value: 2, label: "Marzo" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Mayo" },
  { value: 5, label: "Junio" },
  { value: 6, label: "Julio" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Septiembre" },
  { value: 9, label: "Octubre" },
  { value: 10, label: "Noviembre" },
  { value: 11, label: "Diciembre" },
];

const DatePeriodSelector: React.FC<DatePeriodSelectorProps> = ({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  availableYears,
  className,
  compact = false,
}) => {
  const selectBaseClass = cn(
    "appearance-none cursor-pointer transition-all duration-200",
    "rounded-xl border border-gray-200",
    "bg-white hover:bg-pastel-mint/30",
    "hover:border-theme-green/40",
    "focus:outline-none focus:ring-2 focus:ring-theme-green/30 focus:border-theme-green",
    "text-foreground",
    compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Calendar className={cn(
        "text-theme-green",
        compact ? "w-3.5 h-3.5" : "w-4 h-4"
      )} />
      
      <select
        value={selectedYear}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className={selectBaseClass}
        aria-label="Seleccionar año"
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select
        value={selectedMonth ?? "all"}
        onChange={(e) =>
          onMonthChange(e.target.value === "all" ? null : Number(e.target.value))
        }
        className={selectBaseClass}
        aria-label="Seleccionar mes"
      >
        <option value="all">Todo el año</option>
        {MONTHS.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DatePeriodSelector;
