
import React, { useState } from "react";
import Navbar from "./Navbar";
import Breadcrumb from "./Breadcrumb";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Settings, PieChart } from "lucide-react";
import { useSupabaseData } from "@/hooks/useSupabaseData";
import AddTransactionDialog from "@/components/transactions/AddTransactionDialog";
import { Remi, useOneko } from "@/addons/oneko";
import { cn } from "@/lib/utils";

// Contextual floating button configuration
const FAB_CONFIG: Record<string, { icon: React.ReactNode; label: string; action: "add" | "navigate"; to?: string }> = {
  "/": { icon: <Plus className="w-7 h-7 text-white" />, label: "Añadir transacción", action: "add" },
  "/transacciones": { icon: <Plus className="w-7 h-7 text-white" />, label: "Añadir transacción", action: "add" },
  "/administracion": { icon: <Settings className="w-6 h-6 text-white" />, label: "Configuración", action: "navigate", to: "/administracion" },
  "/admin": { icon: <Settings className="w-6 h-6 text-white" />, label: "Configuración", action: "navigate", to: "/administracion" },
};

const AppLayout = () => {
  const { categories, paymentMethods, refreshData } = useSupabaseData();
  const [isGlobalAddOpen, setIsGlobalAddOpen] = useState(false);
  const { shouldRender, isHiding, onHideComplete } = useOneko();
  const location = useLocation();
  const navigate = useNavigate();

  // Get FAB config for current route
  const fabConfig = FAB_CONFIG[location.pathname] || FAB_CONFIG["/"];

  const handleFabClick = () => {
    if (fabConfig.action === "add") {
      setIsGlobalAddOpen(true);
    } else if (fabConfig.to) {
      navigate(fabConfig.to);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {shouldRender && <Remi isHiding={isHiding} onHidden={onHideComplete} />}
      <Navbar />
      <main className="overflow-auto">
        <div className="container mx-auto p-4 md:p-6">
          <Breadcrumb />
          <Outlet />
        </div>
        <Button
          size="icon"
          variant="default"
          aria-label={fabConfig.label}
          className={cn(
            "fixed bottom-8 right-8 z-[60] h-14 w-14 rounded-full",
            "shadow-lg shadow-green-300/30",
            "bg-gradient-to-br from-theme-green to-theme-sage",
            "hover:shadow-xl hover:shadow-green-300/40",
            "transition-all duration-200 hover:scale-110 active:scale-95",
            "border border-green-200/50"
          )}
          onClick={handleFabClick}
        >
          {fabConfig.icon}
        </Button>
        <AddTransactionDialog
          open={isGlobalAddOpen}
          onOpenChange={setIsGlobalAddOpen}
          categories={categories}
          paymentMethods={paymentMethods}
          onCreated={refreshData}
        />
      </main>
    </div>
  );
};

export default AppLayout;
