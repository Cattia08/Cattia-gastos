import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'export-pdf': ['jspdf'],
          'export-xlsx': ['exceljs', 'xlsx'],
          'supabase': ['@supabase/supabase-js'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'date': ['date-fns', 'react-day-picker'],
          'query': ['@tanstack/react-query'],
        },
      },
    },
  },
}));
