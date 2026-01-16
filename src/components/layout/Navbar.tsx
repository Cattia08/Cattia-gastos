import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, PieChart, List, Settings, Sun, Moon, Cat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOneko } from "@/addons/oneko";

const Navbar = () => {
  const location = useLocation();
  const { isEnabled: isCatEnabled, toggle: toggleCat } = useOneko();

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
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-[10px] border-b border-pastel-pink/20 shadow-soft-glow">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Heart className="w-5 h-5 text-primary" />
          <span className="font-medium">ExpenseTracker</span>
        </Link>
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
          {/* Botón toggle del gato */}
          <button
            aria-label="Toggle cat"
            className={cn(
              "rounded-full border p-2 transition-all",
              isCatEnabled
                ? "border-pink-400 bg-pink-100 hover:bg-pink-200"
                : "border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-300"
            )}
            onClick={toggleCat}
            title={isCatEnabled ? "Dormir a Remi 🐱" : "Llamar a Remi 🐱"}
          >
            <Cat className={cn("w-4 h-4", isCatEnabled ? "text-pink-600" : "text-pink-500")} />
          </button>
          {/* Botón toggle del tema */}
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
