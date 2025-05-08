
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";

interface MonthSelectorProps {
  currentMonth: Date;
  onChange: (date: Date) => void;
  className?: string;
}

const MonthSelector = ({
  currentMonth,
  onChange,
  className
}: MonthSelectorProps) => {
  const handlePrevMonth = () => {
    onChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onChange(addMonths(currentMonth, 1));
  };

  const formattedMonth = format(currentMonth, "MMMM yyyy", { locale: es });
  
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Mes anterior</span>
      </Button>
      
      <div className="text-sm font-medium">
        {formattedMonth.charAt(0).toUpperCase() + formattedMonth.slice(1)}
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNextMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Mes siguiente</span>
      </Button>
    </div>
  );
};

export default MonthSelector;
