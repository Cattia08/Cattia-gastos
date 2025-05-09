import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");

      if (error) throw error;
      setCategories(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async categoryData => {
    try {
      const { data, error } = await supabase.from("categories").insert([categoryData]).select();

      if (error) throw error;
      setCategories(prev => [...prev, data[0]]);
      return { success: true, data: data[0] };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const { data, error } = await supabase.from("categories").update(categoryData).eq("id", id).select();

      if (error) throw error;
      setCategories(prev => prev.map(cat => (cat.id === id ? data[0] : cat)));
      return { success: true, data: data[0] };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const deleteCategory = async id => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);

      if (error) throw error;
      setCategories(prev => prev.filter(cat => cat.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: fetchCategories
  };
};
