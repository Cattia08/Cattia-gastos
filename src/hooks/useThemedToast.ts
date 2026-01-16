import { useToast as useToastOriginal } from "@/hooks/use-toast";

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'delete' | 'celebrate';

interface ToastOptions {
  title: string;
  description?: string;
}

interface UseThemedToastOptions {
  onCelebrate?: () => void;
}

/**
 * Custom toast hook with themed variants
 * Provides consistent, beautiful toasts that match app theme
 * Now with subtle cat emoji reactions 🐱
 */
export const useThemedToast = (options?: UseThemedToastOptions) => {
  const { toast } = useToastOriginal();

  const showToast = (type: ToastType, toastOptions: ToastOptions) => {
    const catEmojis = {
      success: '✓',    // Checkmark for success
      error: '🙀',     // Scared cat - algo falló  
      warning: '😿',   // Crying cat - advertencia
      info: '😸',      // Grinning cat - información
      delete: '😾',    // Pouting cat - eliminado
      celebrate: '🎉', // Party - celebración
    };

    const styles = {
      success: "border-green-200/50 bg-green-50/95 text-green-900 dark:bg-green-900/20 dark:text-green-100",
      error: "border-red-200/50 bg-red-50/95 text-red-900",
      warning: "border-yellow-200/50 bg-yellow-50/95 text-yellow-900",
      info: "border-blue-200/50 bg-blue-50/95 text-blue-900",
      delete: "border-pastel-pink/50 bg-pastel-pink/20 text-pink-900",
      celebrate: "border-theme-green/50 bg-pastel-green/95 text-green-900 dark:bg-green-900/30 dark:text-green-100",
    };

    const durations = {
      success: 2500,   // Faster feedback
      error: 4500,
      warning: 4000,
      info: 3000,
      delete: 2500,
      celebrate: 3500,
    };

    // Trigger confetti for celebrate type
    if (type === 'celebrate' && options?.onCelebrate) {
      options.onCelebrate();
    }

    toast({
      title: `${catEmojis[type]} ${toastOptions.title}`,
      description: toastOptions.description,
      className: `${styles[type]} rounded-2xl border-2 shadow-soft-glow backdrop-blur-sm animate-slide-in-right`,
      duration: durations[type],
    });
  };

  return {
    success: (opts: ToastOptions) => showToast('success', opts),
    error: (opts: ToastOptions) => showToast('error', opts),
    warning: (opts: ToastOptions) => showToast('warning', opts),
    info: (opts: ToastOptions) => showToast('info', opts),
    deleted: (opts: ToastOptions) => showToast('delete', opts),
    celebrate: (opts: ToastOptions) => showToast('celebrate', opts),
  };
};
