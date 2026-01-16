import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ThemedDialog,
  ThemedDialogContent,
  ThemedDialogHeader,
  ThemedDialogTitle,
  ThemedDialogDescription,
  ThemedDialogFooter,
} from "@/components/ui/ThemedDialog";
import { Button } from "@/components/ui/button";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";

type Tx = { id: number; name?: string; amount: number; date: string; categories?: { name?: string } };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transactions: Tx[];
  periodStart?: Date;
  periodEnd?: Date;
  title?: string;
};

const FilteredTransactionsDialog = ({ open, onOpenChange, transactions, periodStart, periodEnd, title = "Transacciones filtradas" }: Props) => {
  return (
    <ThemedDialog open={open} onOpenChange={onOpenChange}>
      <ThemedDialogContent size="2xl">
        <ThemedDialogHeader>
          <ThemedDialogTitle icon={<List className="w-5 h-5" />}>
            {title}
          </ThemedDialogTitle>
          <ThemedDialogDescription>
            {periodStart && (
              <>
                {format(periodStart, "dd 'de' MMMM, yyyy", { locale: es })}
                {periodEnd && ` al ${format(periodEnd, "dd 'de' MMMM, yyyy", { locale: es })}`}
              </>
            )}
          </ThemedDialogDescription>
        </ThemedDialogHeader>
        
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="max-h-[420px] overflow-auto">
            <table className="table-theme w-full text-sm">
              <thead>
                <tr className="bg-pastel-cream">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Concepto</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Categoría</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Monto (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length > 0 ? (
                  [...transactions]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-pastel-mint/30 transition-colors">
                        <td className="py-2 px-3">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="py-2 px-3">{t.name || "-"}</td>
                        <td className="py-2 px-3">{t.categories?.name || "Sin categoría"}</td>
                        <td className="py-2 px-3 text-right font-medium">S/ {Number(t.amount).toFixed(2)}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      Sin gastos para el período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <ThemedDialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl px-4 border-gray-200"
          >
            Cerrar
          </Button>
        </ThemedDialogFooter>
      </ThemedDialogContent>
    </ThemedDialog>
  );
};

export default FilteredTransactionsDialog;
