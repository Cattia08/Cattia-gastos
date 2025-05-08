
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Star, Search, ChevronUp, ChevronDown, Heart, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import CustomDatePicker from "@/components/ui/CustomDatePicker";
import CategoryBadge from "@/components/ui/CategoryBadge";

// Mock transaction data
const mockTransactions = [
  { 
    id: 1, 
    name: "Supermercado", 
    amount: 85.50, 
    category: "Comida", 
    categoryColor: "bg-pastel-pink text-foreground",
    date: new Date(2025, 4, 1) 
  },
  { 
    id: 2, 
    name: "Ropa nueva", 
    amount: 120.75, 
    category: "Ropa", 
    categoryColor: "bg-pastel-green text-foreground",
    date: new Date(2025, 4, 3) 
  },
  { 
    id: 3, 
    name: "Taxi", 
    amount: 25.00, 
    category: "Transporte", 
    categoryColor: "bg-pastel-blue text-foreground",
    date: new Date(2025, 4, 5) 
  },
  { 
    id: 4, 
    name: "Cine", 
    amount: 35.00, 
    category: "Entretenimiento", 
    categoryColor: "bg-pastel-yellow text-foreground",
    date: new Date(2025, 4, 7) 
  },
  { 
    id: 5, 
    name: "Libros", 
    amount: 42.50, 
    category: "", 
    categoryColor: "",
    date: new Date(2025, 4, 10) 
  },
];

// Mock categories
const mockCategories = [
  { name: "Comida", color: "bg-pastel-pink text-foreground" },
  { name: "Ropa", color: "bg-pastel-green text-foreground" },
  { name: "Entretenimiento", color: "bg-pastel-yellow text-foreground" },
  { name: "Transporte", color: "bg-pastel-blue text-foreground" },
  { name: "Otros", color: "bg-pastel-purple text-foreground" },
];

const Transactions = () => {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState(mockTransactions);
  const [filterDate, setFilterDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  
  // New transaction form state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    name: "",
    amount: "",
    category: "",
    date: new Date(),
  });

  const handleSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedTransactions = () => {
    let sortableTransactions = [...transactions];
    
    // Apply search filter
    if (searchQuery) {
      sortableTransactions = sortableTransactions.filter(
        transaction => transaction.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      sortableTransactions = sortableTransactions.filter(
        transaction => transaction.category === categoryFilter
      );
    }
    
    // Apply date filter
    if (filterDate) {
      sortableTransactions = sortableTransactions.filter(
        transaction => 
          transaction.date.getDate() === filterDate.getDate() &&
          transaction.date.getMonth() === filterDate.getMonth() &&
          transaction.date.getFullYear() === filterDate.getFullYear()
      );
    }
    
    // Sort transactions
    if (sortConfig !== null) {
      sortableTransactions.sort((a, b) => {
        if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return sortableTransactions;
  };

  const handleAddTransaction = () => {
    if (!newTransaction.name || !newTransaction.amount) {
      toast({
        title: "Error",
        description: "Por favor completa los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const selectedCategory = mockCategories.find(cat => cat.name === newTransaction.category);
    
    const newEntry = {
      id: transactions.length + 1,
      name: newTransaction.name,
      amount: parseFloat(newTransaction.amount),
      category: newTransaction.category,
      categoryColor: selectedCategory ? selectedCategory.color : "",
      date: newTransaction.date,
    };
    
    setTransactions([...transactions, newEntry]);
    setIsAddDialogOpen(false);
    setNewTransaction({
      name: "",
      amount: "",
      category: "",
      date: new Date(),
    });
    
    toast({
      title: "Transacción añadida",
      description: "La transacción ha sido añadida con éxito",
    });
  };

  const handleCategoryUpdate = (id: number, category: string) => {
    const selectedCategory = mockCategories.find(cat => cat.name === category);
    
    setTransactions(
      transactions.map(transaction => 
        transaction.id === id 
          ? { 
              ...transaction, 
              category, 
              categoryColor: selectedCategory ? selectedCategory.color : ""
            }
          : transaction
      )
    );
    
    toast({
      title: "Categoría actualizada",
      description: "La categoría ha sido actualizada con éxito",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">
          <span className="text-primary">Transacciones</span>
          <Heart className="inline ml-2 w-5 h-5 text-primary" />
        </h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 rounded-full px-4">
              <Plus className="w-4 h-4 mr-2" /> Añadir Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-white rounded-2xl border-pastel-pink/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                Nueva Transacción
              </DialogTitle>
              <DialogDescription>
                Completa los detalles de tu nueva transacción aquí.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newTransaction.name}
                  onChange={(e) => setNewTransaction({...newTransaction, name: e.target.value})}
                  className="border-pastel-pink/30"
                  placeholder="Ej. Compras supermercado"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  className="border-pastel-pink/30"
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría</Label>
                <Select 
                  value={newTransaction.category}
                  onValueChange={(value) => setNewTransaction({...newTransaction, category: value})}
                >
                  <SelectTrigger className="border-pastel-pink/30">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Fecha</Label>
                <CustomDatePicker
                  date={newTransaction.date}
                  setDate={(date) => setNewTransaction({...newTransaction, date: date || new Date()})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="border-pastel-pink/30">
                Cancelar
              </Button>
              <Button onClick={handleAddTransaction} className="bg-primary hover:bg-primary/90">
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter section */}
      <Card className="p-4 border-pastel-pink/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              placeholder="Buscar transacciones"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-pastel-pink/30"
              icon={<Search className="w-4 h-4 text-muted-foreground" />}
            />
          </div>
          <div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full border-pastel-pink/30">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {mockCategories.map((category) => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <CustomDatePicker 
              date={filterDate} 
              setDate={setFilterDate} 
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="border-pastel-pink/30">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] cursor-pointer" onClick={() => handleSort('name')}>
                Nombre
                {sortConfig?.key === 'name' ? (
                  sortConfig.direction === 'ascending' ? <ChevronUp className="inline w-4 h-4 ml-1" /> : <ChevronDown className="inline w-4 h-4 ml-1" />
                ) : null}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                Monto
                {sortConfig?.key === 'amount' ? (
                  sortConfig.direction === 'ascending' ? <ChevronUp className="inline w-4 h-4 ml-1" /> : <ChevronDown className="inline w-4 h-4 ml-1" />
                ) : null}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('category')}>
                Categoría
                {sortConfig?.key === 'category' ? (
                  sortConfig.direction === 'ascending' ? <ChevronUp className="inline w-4 h-4 ml-1" /> : <ChevronDown className="inline w-4 h-4 ml-1" />
                ) : null}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                Fecha
                {sortConfig?.key === 'date' ? (
                  sortConfig.direction === 'ascending' ? <ChevronUp className="inline w-4 h-4 ml-1" /> : <ChevronDown className="inline w-4 h-4 ml-1" />
                ) : null}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getSortedTransactions().length > 0 ? (
              getSortedTransactions().map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.name}</TableCell>
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {transaction.category ? (
                      <CategoryBadge
                        name={transaction.category}
                        color={transaction.categoryColor}
                      />
                    ) : (
                      <Select 
                        onValueChange={(value) => handleCategoryUpdate(transaction.id, value)}
                      >
                        <SelectTrigger className="h-8 border-pastel-pink/30 pr-2 mr-2 max-w-[160px] bg-muted/30">
                          <div className="flex items-center">
                            <CircleAlert className="w-4 h-4 text-pastel-yellow mr-1" />
                            <span>Sin categoría</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {mockCategories.map((category) => (
                            <SelectItem key={category.name} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.date.toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10">
                  <div className="flex flex-col items-center justify-center">
                    <Star className="w-10 h-10 text-pastel-yellow mb-2 animate-pulse" />
                    <p className="text-muted-foreground">No hay transacciones que mostrar</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Transactions;
