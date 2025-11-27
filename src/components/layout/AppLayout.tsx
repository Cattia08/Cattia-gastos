
import React from "react";
import Navbar from "./Navbar";
import CatWalker from "@/components/CatWalker";
import { Outlet, useLocation } from "react-router-dom";

const AppLayout = () => {
  const location = useLocation();
  const showCat = location.pathname === "/" || location.pathname === "/transacciones";
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {showCat && (
        <CatWalker
          key={location.pathname}
          initialDelayMs={0}
          minDuration={9}
          maxDuration={12}
          top={24}
          debug={true}
        />
      )}
      <main className="overflow-auto">
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
