import React from "react";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  name: string;
  color: string | null | undefined;
  className?: string;
  onClick?: () => void;
}

const CategoryBadge = ({ name, color, className, onClick }: CategoryBadgeProps) => {
  // Si el color es null o undefined, usamos un color por defecto
  const defaultColor = "bg-pastel-pink text-foreground";
  
  // Si el color es un valor hexadecimal, lo usamos directamente
  const backgroundColor = color?.startsWith('#') ? color : undefined;
  const colorClass = !backgroundColor ? (color || defaultColor) : undefined;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-all",
        onClick && "cursor-pointer hover:opacity-80",
        colorClass,
        className
      )}
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      {name}
    </div>
  );
};

export default CategoryBadge;
