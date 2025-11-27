import React from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  iconColor?: string;
  isCurrency?: boolean;
}

const DashboardCard = ({
  title,
  value,
  icon,
  className,
  iconColor = "bg-pastel-pink",
  isCurrency = true
}: DashboardCardProps) => {
  // Format the value if it's a currency amount
  const formattedValue = typeof value === "number" && isCurrency ? `S/ ${value.toFixed(2)}` : value;

  return (
    <div className={cn("rounded-2xl border border-pink-100 bg-white shadow-card flex flex-col justify-between min-h-[100px] h-full p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-text-muted truncate">{title}</h3>
          <p className="text-2xl md:text-3xl font-extrabold mt-1 tracking-tight break-words">{formattedValue}</p>
        </div>
        <div className={cn("shrink-0 w-12 h-12 rounded-full flex items-center justify-center", iconColor)}>{icon}</div>
      </div>
    </div>
  );
};

export default DashboardCard;
