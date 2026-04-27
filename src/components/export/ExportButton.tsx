import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import ExportModal from "@/components/export/ExportModal";
import { cn } from "@/lib/utils";
import type { ExportTransaction } from "@/lib/export";

type Category = { id: number; name: string; color?: string };
type PaymentMethod = { id: number; name: string };

type ExportButtonProps = {
  transactions: ExportTransaction[];
  categories: Category[];
  paymentMethods?: PaymentMethod[];
  className?: string;
};

const ExportButton: React.FC<ExportButtonProps> = ({ 
  transactions, 
  categories, 
  paymentMethods = [],
  className 
}) => {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "rounded-xl px-4 text-sm",
          "border-border hover:border-primary/40",
          "hover:bg-primary/5",
          "transition-colors duration-200",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Download className="w-4 h-4 mr-2 text-primary" />
        Exportar
      </Button>
      <ExportModal 
        open={open} 
        onOpenChange={setOpen} 
        transactions={transactions} 
        categories={categories}
        paymentMethods={paymentMethods}
      />
    </>
  );
};

export default ExportButton;
