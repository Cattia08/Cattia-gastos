
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Star, Heart, PieChart, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      path: "/",
      icon: <PieChart className="w-5 h-5" />,
    },
    {
      name: "Transacciones",
      path: "/transacciones",
      icon: <List className="w-5 h-5" />,
    },
    {
      name: "Administración",
      path: "/administracion",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full md:relative md:w-auto">
      {/* Mobile Navigation */}
      <div className="md:hidden flex justify-around items-center h-16 bg-white/80 backdrop-blur-md border-t border-pastel-pink/30 shadow-lg">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all",
              location.pathname === item.path
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            <div className="relative">
              {location.pathname === item.path && (
                <>
                  <div className="absolute inset-0 animate-pulse-soft opacity-30 bg-pastel-pink rounded-full scale-150" />
                  <Star className="absolute -top-1 -right-1 w-3 h-3 text-pastel-yellow animate-pulse-soft" />
                </>
              )}
              {item.icon}
            </div>
            <span className="text-xs mt-1">{item.name}</span>
          </Link>
        ))}
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-col items-start p-6 h-screen bg-gradient-to-b from-white to-pastel-pink/10 border-r border-pastel-pink/20">
        <div className="flex items-center mb-8">
          <Heart className="w-6 h-6 text-primary mr-2 animate-pulse-soft" />
          <h1 className="text-xl font-bold">ExpenseTracker</h1>
        </div>
        
        <div className="space-y-2 w-full">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center px-4 py-3 rounded-xl transition-all",
                location.pathname === item.path
                  ? "bg-pastel-pink/20 text-primary"
                  : "hover:bg-pastel-pink/10 text-muted-foreground hover:text-primary"
              )}
            >
              <div className="relative mr-3">
                {location.pathname === item.path && (
                  <>
                    <Star className="absolute -top-1 -right-1 w-3 h-3 text-pastel-yellow animate-pulse-soft" />
                  </>
                )}
                {item.icon}
              </div>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
