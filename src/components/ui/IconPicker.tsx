import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ShoppingBag,
    Utensils,
    Car,
    Home,
    Heart,
    Gamepad2,
    Shirt,
    Plane,
    Coffee,
    Gift,
    Smartphone,
    Briefcase,
    GraduationCap,
    Dumbbell,
    Music,
    Film,
    Book,
    Pill,
    Sparkles,
    CreditCard,
    type LucideIcon
} from "lucide-react";

// Common Lucide icons for categories
export const CATEGORY_ICONS: { name: string; icon: LucideIcon; label: string }[] = [
    { name: "shopping-bag", icon: ShoppingBag, label: "Compras" },
    { name: "utensils", icon: Utensils, label: "Comida" },
    { name: "car", icon: Car, label: "Auto" },
    { name: "home", icon: Home, label: "Hogar" },
    { name: "heart", icon: Heart, label: "Salud" },
    { name: "gamepad-2", icon: Gamepad2, label: "Juegos" },
    { name: "shirt", icon: Shirt, label: "Ropa" },
    { name: "plane", icon: Plane, label: "Viajes" },
    { name: "coffee", icon: Coffee, label: "Café" },
    { name: "gift", icon: Gift, label: "Regalos" },
    { name: "smartphone", icon: Smartphone, label: "Tech" },
    { name: "briefcase", icon: Briefcase, label: "Trabajo" },
    { name: "graduation-cap", icon: GraduationCap, label: "Educación" },
    { name: "dumbbell", icon: Dumbbell, label: "Gym" },
    { name: "music", icon: Music, label: "Música" },
    { name: "film", icon: Film, label: "Cine" },
    { name: "book", icon: Book, label: "Libros" },
    { name: "pill", icon: Pill, label: "Medicina" },
    { name: "sparkles", icon: Sparkles, label: "Belleza" },
    { name: "credit-card", icon: CreditCard, label: "Pagos" },
];

// Popular emojis for categories
export const CATEGORY_EMOJIS = [
    "🍔", "🛒", "🏠", "💊", "🚗",
    "✈️", "🎮", "👕", "☕", "🎁",
    "📱", "💼", "🎓", "💪", "🎵",
];

interface IconPickerProps {
    value: string;
    onChange: (icon: string) => void;
    color?: string;
    className?: string;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, color = "#FFB5BA", className }) => {
    const [search, setSearch] = useState("");

    const filteredIcons = useMemo(() => {
        if (!search) return CATEGORY_ICONS;
        const lower = search.toLowerCase();
        return CATEGORY_ICONS.filter(
            i => i.label.toLowerCase().includes(lower) || i.name.includes(lower)
        );
    }, [search]);

    const isEmoji = (str: string) => /\p{Emoji}/u.test(str) && str.length <= 4;

    return (
        <div className={cn("space-y-3", className)}>
            <Input
                placeholder="Buscar ícono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-sm"
            />

            <Tabs defaultValue={isEmoji(value) ? "emoji" : "icons"} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="icons" className="text-xs">Íconos</TabsTrigger>
                    <TabsTrigger value="emoji" className="text-xs">Emojis</TabsTrigger>
                </TabsList>

                <TabsContent value="icons" className="mt-2">
                    <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto p-1">
                        {filteredIcons.map(({ name, icon: Icon, label }) => {
                            const isSelected = value === name;
                            return (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => onChange(name)}
                                    className={cn(
                                        "w-9 h-9 rounded-lg transition-all duration-150",
                                        "flex items-center justify-center",
                                        "hover:scale-110 hover:bg-muted",
                                        "focus:outline-none focus:ring-2 focus:ring-primary",
                                        isSelected && "ring-2 ring-primary bg-muted scale-105"
                                    )}
                                    title={label}
                                >
                                    <Icon
                                        className="w-5 h-5"
                                        style={{ color: isSelected ? color : undefined }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="emoji" className="mt-2">
                    <div className="grid grid-cols-5 gap-1.5 p-1">
                        {CATEGORY_EMOJIS.map((emoji) => {
                            const isSelected = value === emoji;
                            return (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onChange(emoji)}
                                    className={cn(
                                        "w-9 h-9 rounded-lg transition-all duration-150",
                                        "flex items-center justify-center text-xl",
                                        "hover:scale-110 hover:bg-muted",
                                        "focus:outline-none focus:ring-2 focus:ring-primary",
                                        isSelected && "ring-2 ring-primary bg-muted scale-105"
                                    )}
                                >
                                    {emoji}
                                </button>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Selected indicator */}
            <p className="text-xs text-muted-foreground text-center">
                Seleccionado: {value || "ninguno"}
            </p>
        </div>
    );
};

export default IconPicker;
