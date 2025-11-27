import React from "react";
import { cn } from "@/lib/utils";

interface CategoryBadgeProps {
  name: string;
  color: string | null | undefined;
  className?: string;
  onClick?: () => void;
}

const CategoryBadge = ({ name, color, className, onClick }: CategoryBadgeProps) => {
  const hexToRgba = (hex: string, alpha: number) => {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const isHex = !!color && color.startsWith('#');
  const softBg = isHex ? hexToRgba(color!, 0.12) : undefined;
  const textColor = isHex ? color : undefined;

  return (
    <div
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
        onClick && "cursor-pointer hover:opacity-90",
        !isHex && "bg-pastel-pink/15 text-pastel-pink",
        className
      )}
      style={isHex ? { backgroundColor: softBg, color: textColor as string } : undefined}
    >
      {name}
    </div>
  );
};

export default CategoryBadge;
