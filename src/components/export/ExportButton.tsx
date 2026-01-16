import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import ExportModal from "@/components/export/ExportModal";

type Tx = { id: number; name: string; amount: number; date: string; category_id?: string | number };
type Category = { id: number; name: string };

type ExportButtonProps = {
  transactions: Tx[];
  categories: Category[];
  className?: string;
};

const ExportButton: React.FC<ExportButtonProps> = ({ transactions, categories, className }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" className={className || "rounded-full px-3 text-sm border-pastel-pink/30"} onClick={() => setOpen(true)}>
        Exportar
      </Button>
      <ExportModal open={open} onOpenChange={setOpen} transactions={transactions} categories={categories} />
    </>
  );
};

export default ExportButton;

