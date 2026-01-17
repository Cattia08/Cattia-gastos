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
      success: "border-green-300 bg-green-100 text-green-900 dark:bg-green-900 dark:border-green-700 dark:text-green-100",
      error: "border-red-300 bg-red-100 text-red-900 dark:bg-red-900 dark:border-red-700 dark:text-red-100",
      warning: "border-amber-300 bg-amber-100 text-amber-900 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-100",
      info: "border-blue-300 bg-blue-100 text-blue-900 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-100",
      delete: "border-pink-300 bg-pink-100 text-pink-900 dark:bg-pink-900 dark:border-pink-700 dark:text-pink-100",
      celebrate: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-emerald-100",
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
      className: `${styles[type]} rounded-2xl border-2 shadow-lg animate-slide-in-right`,
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
