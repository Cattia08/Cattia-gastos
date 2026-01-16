import * as React from "react";
import { Tag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  color?: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: number[];
  onSelectionChange: (ids: number[]) => void;
  showCount?: boolean;
  className?: string;
  compact?: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategories,
  onSelectionChange,
  showCount = true,
  className,
  compact = false,
}) => {
  const allSelected = selectedCategories.length === categories.length && categories.length > 0;

  const toggleCategory = (id: number) => {
    if (selectedCategories.includes(id)) {
      onSelectionChange(selectedCategories.filter((cid) => cid !== id));
    } else {
      onSelectionChange([...selectedCategories, id]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(categories.map((c) => c.id));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "rounded-xl border-gray-200",
            "bg-white hover:bg-pastel-lavender/30",
            "hover:border-theme-lavender/40",
            "transition-all duration-200",
            compact ? "px-3 py-1 text-xs h-7" : "px-4 py-1.5 text-sm",
            className
          )}
        >
          <Tag className={cn("mr-2 text-theme-lavender", compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          Categorías
          {showCount && (
            <span className="ml-1.5 text-muted-foreground">
              ({selectedCategories.length}/{categories.length})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "w-56 max-h-72 overflow-y-auto",
          "bg-white border-gray-200",
          "shadow-soft-md rounded-xl"
        )}
        align="start"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Filtrar por categoría
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-100" />
        
        {/* Toggle All */}
        <button
          onClick={toggleAll}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg",
            "hover:bg-pastel-mint/50 transition-colors",
            "text-left cursor-pointer"
          )}
        >
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-all",
            allSelected 
              ? "bg-theme-green border-theme-green" 
              : "border-gray-300"
          )}>
            {allSelected && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="font-medium">Todas</span>
        </button>
        
        <DropdownMenuSeparator className="bg-gray-100" />
        
        {/* Category Items */}
        {categories.map((cat) => {
          const isSelected = selectedCategories.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg",
                "hover:bg-pastel-cream transition-colors",
                "text-left cursor-pointer"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                isSelected 
                  ? "border-transparent" 
                  : "border-gray-300"
              )} style={{ backgroundColor: isSelected ? cat.color || '#5DBE8A' : 'transparent' }}>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || '#5DBE8A' }}
              />
              <span className="truncate">{cat.name}</span>
            </button>
          );
        })}
        
        {categories.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No hay categorías disponibles
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CategoryFilter;
