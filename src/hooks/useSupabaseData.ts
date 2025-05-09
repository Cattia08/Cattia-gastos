import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const useSupabaseData = () => {
  const [transactions, setTransactions] = useState([]);
  const [income, setIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mover fetchData fuera del useEffect
  const fetchData = async () => {
    try {
      // Consulta de transacciones con relación a categorías
      const { data: transactionsData, error: transactionsError } = await supabase.from("transactions").select(`
          *,
          categories (
            id,
            name,
            color
          )
        `);
      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData);

      // Consulta de categorías
      const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("*");
      if (categoriesError) throw categoriesError;
      setCategories(categoriesData);

      // Consulta de ingresos
      const { data: incomeData, error: incomeError } = await supabase.from("income").select("*");
      if (incomeError) throw incomeError;
      setIncome(incomeData);

      setLoading(false);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { transactions, income, categories, loading, error, refreshData: fetchData };
};
