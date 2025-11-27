import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white rounded-2xl border-pastel-pink/30">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {periodStart && (
              <>
                {format(periodStart, "dd 'de' MMMM, yyyy", { locale: es })}
                {periodEnd && ` al ${format(periodEnd, "dd 'de' MMMM, yyyy", { locale: es })}`}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">Fecha</th>
                  <th className="text-left py-2 px-3 font-medium">Concepto</th>
                  <th className="text-left py-2 px-3 font-medium">Categoría</th>
                  <th className="text-right py-2 px-3 font-medium">Monto (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.length > 0 ? (
                  [...transactions]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-muted/50">
                        <td className="py-2 px-3">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="py-2 px-3">{t.name || "-"}</td>
                        <td className="py-2 px-3">{t.categories?.name || "Sin categoría"}</td>
                        <td className="py-2 px-3 text-right font-medium">S/ {Number(t.amount).toFixed(2)}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">Sin gastos para el período</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-3 text-sm border-pastel-pink/30">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilteredTransactionsDialog;
