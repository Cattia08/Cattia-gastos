
import React, { useState } from "react";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import AddTransactionDialog from "@/components/transactions/AddTransactionDialog";
import { Remi, useOneko } from "@/addons/oneko";

const AppLayout = () => {
  const { categories, refreshData } = useSupabaseData();
  const [isGlobalAddOpen, setIsGlobalAddOpen] = useState(false);
  const { shouldRender, isHiding, onHideComplete } = useOneko();
  
  return (
    <div className="min-h-screen bg-background">
      {shouldRender && <Remi isHiding={isHiding} onHidden={onHideComplete} />}
      <Navbar />
      <main className="overflow-auto">
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
        <Button
          size="icon"
          variant="default"
          aria-label="Añadir transacción"
          className="fixed bottom-8 right-8 z-[60] shadow-lg h-14 w-14 rounded-full"
          onClick={() => setIsGlobalAddOpen(true)}
        >
          <Plus className="w-7 h-7 text-white" />
        </Button>
        <AddTransactionDialog
          open={isGlobalAddOpen}
          onOpenChange={setIsGlobalAddOpen}
          categories={categories}
          onCreated={refreshData}
        />
      </main>
    </div>
  );
};

export default AppLayout;
