import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Curated pastel color palette - 10 harmonious colors
export const CATEGORY_COLORS = [
    { name: "Rosa", hex: "#FFB5BA" },
    { name: "Lavanda", hex: "#C9B1FF" },
    { name: "Mint", hex: "#98D8AA" },
    { name: "Cielo", hex: "#87CEEB" },
    { name: "Durazno", hex: "#FFDAB9" },
    { name: "Sage", hex: "#9DC183" },
    { name: "Coral", hex: "#FF7F7F" },
    { name: "Ámbar", hex: "#FFD700" },
    { name: "Violeta", hex: "#DDA0DD" },
    { name: "Teal", hex: "#5F9EA0" },
] as const;

interface ColorPaletteProps {
    value: string;
    onChange: (color: string) => void;
    className?: string;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({ value, onChange, className }) => {
    return (
        <div className={cn("space-y-2", className)}>
            <div className="grid grid-cols-5 gap-2">
                {CATEGORY_COLORS.map((color) => {
                    const isSelected = value === color.hex;
                    return (
                        <button
                            key={color.hex}
                            type="button"
                            onClick={() => onChange(color.hex)}
                            className={cn(
                                "w-10 h-10 rounded-xl transition-all duration-150",
                                "hover:scale-110 hover:shadow-md",
                                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                                "flex items-center justify-center",
                                isSelected && "ring-2 ring-offset-2 ring-gray-800 scale-110"
                            )}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                        >
                            {isSelected && (
                                <Check className="w-5 h-5 text-white drop-shadow-md" />
                            )}
                        </button>
                    );
                })}
            </div>
            {/* Show selected color name */}
            <p className="text-xs text-muted-foreground text-center">
                {CATEGORY_COLORS.find(c => c.hex === value)?.name || "Selecciona un color"}
            </p>
        </div>
    );
};

export default ColorPalette;
