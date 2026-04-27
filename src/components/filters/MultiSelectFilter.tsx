import * as React from "react";
import { Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterItem {
  id: number;
  name: string;
  color?: string;
  icon?: React.ReactNode;
}

interface MultiSelectFilterProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass?: string;
  items: FilterItem[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  showCount?: boolean;
  className?: string;
  compact?: boolean;
  align?: "start" | "end" | "center";
}

const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  icon: Icon,
  iconColorClass,
  items,
  selectedIds,
  onSelectionChange,
  showCount = true,
  className,
  compact = false,
  align = "start",
}) => {
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  // Also consider "all selected" if all items are included in selectedIds, even if selectedIds has extra garbage (defensive)
  const effectiveAllSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));

  const toggleItem = (id: number) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((cid) => cid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (effectiveAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map((i) => i.id));
    }
  };

  return (
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
            className
          )}
        >
          <Icon className={cn("mr-2", iconColorClass, compact ? "w-3.5 h-3.5" : "w-4 h-4")} />
          {label}
          {showCount && (
            <span className="ml-1.5 text-muted-foreground">
              ({selectedIds.length}/{items.length})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          "w-56 max-h-72 overflow-y-auto bg-popover border-border shadow-soft-md rounded-xl"
        )}
        align={align}
      >
        <DropdownMenuLabel className="text-xs text-text-muted">
          {label.toLowerCase()}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />

        {/* Toggle All */}
        <button
          onClick={toggleAll}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg",
            "hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors",
            "text-left cursor-pointer"
          )}
        >
          <div className={cn(
            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
            effectiveAllSelected
              ? "bg-primary border-primary"
              : "border-border"
          )}>
            {effectiveAllSelected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
          <span className="font-medium">Todos</span>
        </button>

        <DropdownMenuSeparator className="bg-border" />

        {/* Items */}
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-lg",
                "hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors",
                "text-left cursor-pointer"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                isSelected
                  ? "border-transparent"
                  : "border-border"
              )}
                style={{
                  backgroundColor: isSelected ? (item.color || 'hsl(var(--primary))') : 'transparent',
                  borderColor: isSelected ? 'transparent' : undefined
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              {item.color && (
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
              )}

              <span className="truncate">{item.name}</span>
            </button>
          );
        })}

        {items.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No hay opciones
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelectFilter;
