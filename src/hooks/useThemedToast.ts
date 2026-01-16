import { useToast as useToastOriginal } from "@/hooks/use-toast";

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'delete';

interface ToastOptions {
  title: string;
  description?: string;
}

/**
 * Custom toast hook with themed variants
 * Provides consistent, beautiful toasts that match app theme
 * Now with subtle cat emoji reactions 🐱
 */
export const useThemedToast = () => {
  const { toast } = useToastOriginal();

  const showToast = (type: ToastType, options: ToastOptions) => {
    const catEmojis = {
      success: '😺', // Happy cat - todo salió bien
      error: '🙀',   // Scared cat - algo falló  
      warning: '😿', // Crying cat - advertencia
      info: '😸',    // Grinning cat - información
      delete: '😾',  // Pouting cat - eliminado
    };

    const styles = {
      success: "border-green-200/50 bg-green-50/95 text-green-900",
      error: "border-red-200/50 bg-red-50/95 text-red-900",
      warning: "border-yellow-200/50 bg-yellow-50/95 text-yellow-900",
      info: "border-blue-200/50 bg-blue-50/95 text-blue-900",
      delete: "border-pastel-pink/50 bg-pastel-pink/20 text-pink-900",
    };

    const durations = {
      success: 3000,
      error: 5000,
      warning: 4500,
      info: 3500,
      delete: 3000,
    };

    toast({
      title: `${catEmojis[type]} ${options.title}`,
      description: options.description,
      className: `${styles[type]} rounded-2xl border-2 shadow-soft-glow backdrop-blur-sm`,
      duration: durations[type],
    });
  };

  return {
    success: (options: ToastOptions) => showToast('success', options),
    error: (options: ToastOptions) => showToast('error', options),
    warning: (options: ToastOptions) => showToast('warning', options),
    info: (options: ToastOptions) => showToast('info', options),
    deleted: (options: ToastOptions) => showToast('delete', options),
  };
};
