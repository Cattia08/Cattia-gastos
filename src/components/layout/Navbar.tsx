import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, PieChart, List, Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const location = useLocation();

  // Leer el nombre del sidebar desde localStorage y actualizar en tiempo real
  const [sidebarName, setSidebarName] = useState(() => localStorage.getItem('sidebarName') || 'Catt');
  useEffect(() => {
    const onStorage = () => setSidebarName(localStorage.getItem('sidebarName') || 'Catt');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Permitir actualización inmediata tras cambiar el nombre en la misma pestaña
  useEffect(() => {
    const interval = setInterval(() => {
      const name = localStorage.getItem('sidebarName') || 'Catt';
      setSidebarName(name);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    const handler = () => setIsDark(document.documentElement.classList.contains('dark'));
    window.addEventListener('themechange', handler as any);
    return () => window.removeEventListener('themechange', handler as any);
  }, []);

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
    <nav className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md border-b border-pastel-pink/20 shadow-soft-glow">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <span className="font-medium">ExpenseTracker</span>
        </div>
        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
                location.pathname === item.path
                  ? "bg-pastel-pink/20 text-primary"
                  : "hover:bg-pastel-pink/10 text-muted-foreground hover:text-primary"
              )}
            >
              {item.icon}
              <span className="text-sm">{item.name}</span>
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button
            aria-label="Toggle theme"
            className="rounded-full border border-pink-200 bg-white p-2 hover:bg-pink-50 hover:border-pink-300"
            onClick={() => {
              const isDark = document.documentElement.classList.toggle("dark");
              localStorage.setItem("theme", isDark ? "dark" : "light");
              const evt = new CustomEvent("themechange", { detail: isDark ? "dark" : "light" });
              window.dispatchEvent(evt);
              setIsDark(isDark);
            }}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-pink-500" />
            ) : (
              <Moon className="w-4 h-4 text-pink-500" />
            )}
          </button>
          <img
            src="/Foto-Catt.jpg"
            alt="Foto de Catt"
            className="w-8 h-8 rounded-full shadow-soft-glow object-cover"
          />
          <span className="text-sm">{sidebarName}</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
