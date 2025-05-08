
import React from "react";
import Navbar from "./Navbar";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-background">
      <Navbar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0 md:pl-0">
        <div className="container mx-auto p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
