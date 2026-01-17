import React, { useState, useMemo } from "react";
import { useThemedToast } from "@/hooks/useThemedToast";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Loader2, Search, Star, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import ColorPalette, { CATEGORY_COLORS } from "@/components/ui/ColorPalette";
import IconPicker, { CATEGORY_ICONS } from "@/components/ui/IconPicker";

// Render category icon (Lucide or emoji)
const CategoryIcon: React.FC<{ icon?: string; color: string; size?: "sm" | "md" | "lg" }> = ({
  icon,
  color,
  size = "md"
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-base",
    md: "w-12 h-12 text-xl",
    lg: "w-16 h-16 text-2xl"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  // Check if it's an emoji
  const isEmoji = icon && /\p{Emoji}/u.test(icon) && icon.length <= 4;

  // Find Lucide icon
  const lucideIcon = !isEmoji ? CATEGORY_ICONS.find(i => i.name === icon) : null;
  const IconComponent = lucideIcon?.icon;

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center transition-transform duration-150",
        sizeClasses[size]
      )}
      style={{ backgroundColor: `${color}20` }}
    >
      {isEmoji ? (
        <span>{icon}</span>
      ) : IconComponent ? (
        <IconComponent className={iconSizes[size]} style={{ color }} />
      ) : (
        <Tag className={iconSizes[size]} style={{ color }} />
      )}
    </div>
  );
};

const Categories = () => {
  const toast = useThemedToast();
  const { categories, loading, error, addCategory, updateCategory, deleteCategory } = useCategories();

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    id: null as number | null,
    name: "",
    color: CATEGORY_COLORS[0].hex,
    icon: "shopping-bag"
  });

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const lower = searchQuery.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(lower));
  }, [categories, searchQuery]);

  // Handlers
  const openAddDialog = () => {
    setFormData({
      id: null,
      name: "",
      color: CATEGORY_COLORS[0].hex,
      icon: "shopping-bag"
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: any) => {
    setFormData({
      id: category.id,
      name: category.name,
      color: category.color || CATEGORY_COLORS[0].hex,
      icon: category.icon || "shopping-bag"
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error({ title: "Error", description: "El nombre es requerido" });
      return;
    }

    const categoryData = {
      name: formData.name.trim(),
      color: formData.color,
      icon: formData.icon
    };

    let result;
    if (isEditing && formData.id) {
      result = await updateCategory(formData.id, categoryData);
    } else {
      result = await addCategory(categoryData);
    }

    if (result.success) {
      toast.success({
        title: isEditing ? "Categoría actualizada" : "Categoría creada",
        description: `"${formData.name}" guardada con éxito`
      });
      setIsDialogOpen(false);
    } else {
      toast.error({
        title: "Error",
        description: "No se pudo guardar la categoría"
      });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast.deleted({
        title: "Categoría eliminada",
        description: `"${name}" ha sido eliminada`
      });
    } else {
      toast.error({
        title: "Error",
        description: "No se pudo eliminar la categoría"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        Error al cargar las categorías: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              Categorías
            </span>
            <Sparkles className="inline ml-2 w-5 h-5 text-pink-400" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {categories.length} categorías configuradas
          </p>
        </div>

        <Button
          onClick={openAddDialog}
          className={cn(
            "rounded-xl px-5",
            "bg-gradient-to-r from-pink-500 to-violet-500",
            "hover:shadow-lg hover:shadow-pink-200/50",
            "transition-all duration-200"
          )}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar categorías..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl border-gray-200 focus:border-pink-300 focus:ring-pink-200"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <div
              key={category.id}
              className={cn(
                "group relative p-4 rounded-2xl",
                "bg-white dark:bg-card",
                "border border-gray-100 dark:border-gray-800",
                "shadow-sm hover:shadow-md",
                "transition-all duration-200 hover:-translate-y-1"
              )}
            >
              <div className="flex items-center gap-4">
                <CategoryIcon
                  icon={(category as any).icon}
                  color={category.color}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary truncate">
                    {category.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {CATEGORY_COLORS.find(c => c.hex === category.color)?.name || category.color}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons - appear on hover */}
              <div className={cn(
                "absolute top-2 right-2 flex items-center gap-1",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(category)}
                  className="h-8 w-8 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/30"
                >
                  <Edit className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(category.id, category.name)}
                  className="h-8 w-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-pink-400" />
            </div>
            <p className="text-muted-foreground font-medium">
              {searchQuery ? "No se encontraron categorías" : "No hay categorías aún"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Prueba con otro término" : "Crea una para empezar"}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={cn(
          "sm:max-w-[420px]",
          \"bg-white dark:bg-gray-900\",
          "border-pink-100/50 dark:border-pink-900/30",
          "rounded-2xl shadow-2xl"
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Edit className="w-5 h-5 text-pink-500" />
                  Editar Categoría
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-pink-500" />
                  Nueva Categoría
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifica los detalles de la categoría" : "Configura tu nueva categoría"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Name input */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Comida, Transporte..."
                className="rounded-xl"
              />
            </div>

            {/* Color palette */}
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPalette
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
            </div>

            {/* Icon picker */}
            <div className="space-y-2">
              <Label>Ícono</Label>
              <IconPicker
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
                color={formData.color}
              />
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <CategoryIcon icon={formData.icon} color={formData.color} size="lg" />
                <div>
                  <p className="font-semibold text-text-primary">
                    {formData.name || "Vista previa"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_COLORS.find(c => c.hex === formData.color)?.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className={cn(
                "rounded-xl",
                "bg-gradient-to-r from-pink-500 to-violet-500",
                "hover:from-pink-600 hover:to-violet-600"
              )}
            >
              {isEditing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
