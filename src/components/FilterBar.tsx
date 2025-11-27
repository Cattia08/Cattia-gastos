import React from "react";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/InputWithIcon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import InteractiveCalendar from "@/components/ui/InteractiveCalendar";
import { Search, Tag, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

type Category = { id: number; name: string; color?: string };

type Props = {
  categories: Category[];
  selectedCategories: number[];
  onSelectedCategoriesChange: (ids: number[]) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedDate?: Date;
  endDate?: Date;
  onDateSelect: (d?: Date) => void;
  onRangeSelect: (d?: Date) => void;
  onReset: () => void;
  expenses?: { date: Date; amount: number }[];
};

const FilterBar = ({
  categories,
  selectedCategories,
  onSelectedCategoriesChange,
  searchQuery,
  onSearchQueryChange,
  selectedDate,
  endDate,
  onDateSelect,
  onRangeSelect,
  onReset,
  expenses = [],
}: Props) => {
  const allSelected = selectedCategories.length === categories.length && categories.length > 0;
  const toggleAll = () => {
    if (allSelected) {
      onSelectedCategoriesChange([]);
    } else {
      onSelectedCategoriesChange(categories.map(c => c.id));
    }
  };

  const iconClass = "w-4 h-4 text-pink-500";

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-4">
      <div className="flex-1 min-w-[220px] md:max-w-md">
      <InputWithIcon
        placeholder="Buscar"
        value={searchQuery}
        onChange={e => onSearchQueryChange(e.target.value)}
        className="w-full bg-transparent rounded-full"
        icon={<Search className="w-4 h-4 text-pink-400" />}
      />
      </div>
      <div className="flex items-center gap-3 overflow-x-auto md:overflow-visible flex-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default">
            <Tag className={`${iconClass} mr-2`} /> Categorías
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-2">
          <DropdownMenuItem onClick={toggleAll}>
            <Checkbox checked={allSelected} className="mr-2" /> Todas
          </DropdownMenuItem>
          {categories.map(cat => (
            <DropdownMenuItem
              key={cat.id}
              onClick={e => {
                e.preventDefault();
                const next = selectedCategories.includes(cat.id)
                  ? selectedCategories.filter(id => id !== cat.id)
                  : [...selectedCategories, cat.id];
                onSelectedCategoriesChange(next);
              }}
            >
              <Checkbox checked={selectedCategories.includes(cat.id)} className="mr-2" /> {cat.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default">
            <CalendarIcon className={`${iconClass} mr-2`} />
            {selectedDate && endDate ? `${format(selectedDate, 'dd MMM')} - ${format(endDate, 'dd MMM')}` : selectedDate ? `${format(selectedDate, 'dd MMM')}` : 'Seleccionar fecha'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-2">
          <InteractiveCalendar
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            rangeDate={endDate}
            onRangeSelect={onRangeSelect}
            onReset={() => { onDateSelect(undefined); onRangeSelect(undefined); }}
            className="w-full"
            expenses={expenses}
            mode={endDate ? 'range' : 'single'}
            inline
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <Button onClick={onReset} variant="default">Limpiar</Button>
      </div>
    </div>
  );
};

export default FilterBar;
