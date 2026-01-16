import { useState, useCallback, useSyncExternalStore, useEffect } from "react";

const STORAGE_KEY = "remiEnabled";

// Store para sincronizar el estado entre componentes
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function notifyListeners() {
  listeners.forEach((l) => l());
}

/**
 * Hook para controlar el estado de Remi
 * Usa useSyncExternalStore para sincronización instantánea
 * Y gestiona la animación de salida
 */
export function useOneko() {
  const isEnabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  
  // Estados para manejar el ciclo de vida de la animación
  const [shouldRender, setShouldRender] = useState(isEnabled);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      setShouldRender(true);
      setIsHiding(false);
    } else if (shouldRender) {
      // Si se desactiva pero sigue renderizado, iniciar animación de huida
      setIsHiding(true);
    }
  }, [isEnabled, shouldRender]);

  const onHideComplete = useCallback(() => {
    setShouldRender(false);
    setIsHiding(false);
  }, []);

  const toggle = useCallback(() => {
    const newValue = !getSnapshot();
    localStorage.setItem(STORAGE_KEY, String(newValue));
    notifyListeners();
  }, []);

  const enable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    notifyListeners();
  }, []);

  const disable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "false");
    notifyListeners();
  }, []);

  return { 
    isEnabled, 
    toggle, 
    enable, 
    disable,
    // Props para la animación
    shouldRender,
    isHiding,
    onHideComplete
  };
}

export default useOneko;
