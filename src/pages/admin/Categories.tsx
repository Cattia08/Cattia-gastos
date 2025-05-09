import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
  DialogTrigger
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import CategoryBadge from "@/components/ui/CategoryBadge";

const Categories = () => {
  const { toast } = useToast();
  const { categories, loading, error, addCategory, updateCategory, deleteCategory } = useCategories();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({
    id: null,
    name: "",
    color: ""
  });

  const handleAddCategory = async () => {
    if (!currentCategory.name || !currentCategory.color) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    const result = await addCategory(currentCategory);
    if (result.success) {
      toast({
        title: "Categoría añadida",
        description: "La categoría ha sido añadida con éxito"
      });
      setIsAddDialogOpen(false);
      resetForm();
    } else {
      toast({
        title: "Error",
        description: "Hubo un error al añadir la categoría",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!currentCategory.name || !currentCategory.color) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos",
        variant: "destructive"
      });
      return;
    }

    const result = await updateCategory(currentCategory.id, {
      name: currentCategory.name,
      color: currentCategory.color
    });

    if (result.success) {
      toast({
        title: "Categoría actualizada",
        description: "La categoría ha sido actualizada con éxito"
      });
      setIsEditDialogOpen(false);
      resetForm();
    } else {
      toast({
        title: "Error",
        description: "Hubo un error al actualizar la categoría",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async id => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast({
        title: "Categoría eliminada",
        description: "La categoría ha sido eliminada con éxito"
      });
    } else {
      toast({
        title: "Error",
        description: "Hubo un error al eliminar la categoría",
        variant: "destructive"
      });
    }
  };

  const handleEdit = category => {
    setCurrentCategory({
      id: category.id,
      name: category.name,
      color: category.color
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setCurrentCategory({
      id: null,
      name: "",
      color: ""
    });
  };

  const CategoryForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={currentCategory.name}
          onChange={e => setCurrentCategory({ ...currentCategory, name: e.target.value })}
          placeholder="Ej. Comida"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            id="color"
            value={currentCategory.color || "#FFB7B2"}
            onChange={e => setCurrentCategory({ ...currentCategory, color: e.target.value })}
            className="w-12 h-8 p-0 border-none bg-transparent"
            style={{ cursor: 'pointer' }}
          />
          <Input
            value={currentCategory.color || "#FFB7B2"}
            onChange={e => setCurrentCategory({ ...currentCategory, color: e.target.value })}
            placeholder="Ej. #FFB7B2"
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">Error al cargar las categorías: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorías</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Categoría</DialogTitle>
              <DialogDescription>Añade una nueva categoría para organizar tus gastos</DialogDescription>
            </DialogHeader>
            <CategoryForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddCategory}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length > 0 ? (
              categories.map(category => (
                <TableRow key={category.id}>
                  <TableCell>
                    <CategoryBadge name={category.name} color={category.color} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${category.color.split(" ")[0]}`} />
                      <span className="text-sm text-muted-foreground">{category.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No hay categorías disponibles
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
            <DialogDescription>Modifica los detalles de la categoría</DialogDescription>
          </DialogHeader>
          <CategoryForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCategory}>Actualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
