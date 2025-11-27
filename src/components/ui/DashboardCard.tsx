import React from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  className?: string;
  iconColor?: string;
  isCurrency?: boolean;
  subtext?: string;
  interactive?: boolean;
  emphasis?: boolean;
  onClick?: () => void;
}

const DashboardCard = ({
  title,
  value,
  icon,
  className,
  iconColor = "bg-pastel-pink",
  isCurrency = true,
  subtext,
  interactive = false,
  emphasis = false,
  onClick
}: DashboardCardProps) => {
  // Format the value if it's a currency amount
  const formattedValue = typeof value === "number" && isCurrency ? `S/ ${value.toFixed(2)}` : value;

  return (
    <div
      className={cn(
        "rounded-2xl border border-pink-100 bg-white shadow-card flex flex-col justify-between min-h-[88px] h-full p-3 md:p-4",
        interactive && "transition-transform duration-150 hover:scale-[0.99] active:scale-[0.98] hover:shadow-md cursor-pointer",
        emphasis && "md:p-5",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-text-muted truncate">{title}</h3>
          <p
            key={String(formattedValue)}
            className={cn(
              "font-extrabold mt-1 tracking-tight break-words animate-in fade-in-50",
              emphasis ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"
            )}
          >
            {formattedValue}
          </p>
          {subtext && (<p className="text-xs text-muted-foreground mt-1">{subtext}</p>)}
        </div>
        <div className={cn("shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center", iconColor)}>{icon}</div>
      </div>
    </div>
  );
};

export default DashboardCard;
