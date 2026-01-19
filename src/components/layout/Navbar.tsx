import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, PieChart, List, Settings, Sun, Moon, Cat, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOneko } from "@/addons/oneko";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isEnabled: isCatEnabled, toggle: toggleCat } = useOneko();
  const { user, signOut } = useAuth();

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

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
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-card border-b border-pastel-pink/20 dark:border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo - always visible */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Heart className="w-5 h-5 text-primary" />
          <span className="font-medium hidden sm:inline">ExpenseTracker</span>
        </Link>

        {/* Desktop Navigation - hidden on mobile (uses BottomNav instead) */}
        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-primary font-medium shadow-sm"
                    : "hover:bg-pastel-pink/20 text-muted-foreground hover:text-primary"
                )}
              >
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                <span className={cn(
                  "transition-transform duration-200",
                  isActive && "scale-110"
                )}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
        {/* Right side controls - visible on all sizes */}
        <div className="flex items-center gap-2">
          {/* User dropdown with profile photo */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full hover:bg-pink-50 dark:hover:bg-muted p-1 pr-2 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400/50">
                <img
                  src="/Foto-Catt.jpg"
                  alt="Foto de perfil"
                  className="w-8 h-8 rounded-full shadow-soft-glow object-cover"
                />
                <span className="text-sm font-medium hidden sm:inline">{sidebarName}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{sidebarName}</p>
                {user && (
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cat toggle - visible on all sizes */}
          <button
            aria-label="Toggle cat"
            className={cn(
              "rounded-full border p-2 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center",
              isCatEnabled
                ? "border-pink-400 bg-pink-100 hover:bg-pink-200 dark:bg-pink-900/50 dark:border-pink-600"
                : "border-pink-200 bg-white dark:bg-input dark:border-border hover:bg-pink-50 hover:border-pink-300"
            )}
            onClick={toggleCat}
            title={isCatEnabled ? "Dormir a Remi 🐱" : "Llamar a Remi 🐱"}
          >
            <Cat className={cn("w-4 h-4", isCatEnabled ? "text-pink-600" : "text-pink-500")} />
          </button>

          {/* Theme toggle - visible on all sizes */}
          <button
            aria-label="Toggle theme"
            className="rounded-full border border-pink-200 dark:border-border bg-white dark:bg-input p-2 hover:bg-pink-50 dark:hover:bg-muted hover:border-pink-300 min-w-[40px] min-h-[40px] flex items-center justify-center"
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
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

