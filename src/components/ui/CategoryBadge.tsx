
import React from "react";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  name: string;
  color: string;
  className?: string;
  onClick?: () => void;
}

const CategoryBadge = ({ name, color, className, onClick }: CategoryBadgeProps) => {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all",
        onClick && "cursor-pointer hover:opacity-80",
        color,
        className
      )}
    >
      {name}
    </div>
  );
};

export default CategoryBadge;
