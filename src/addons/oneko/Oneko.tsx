import { useEffect, useRef, useState } from "react";
import "./Remi.css";

interface RemiProps {
  isHiding?: boolean;
  onHidden?: () => void;
}

/**
 * Componente Remi - El gatito que sigue el cursor
 * Basado en el gato real de Catt llamado Remi 🐱
 */
export default function Remi({ isHiding = false, onHidden }: RemiProps) {
  const remiRef = useRef<HTMLDivElement>(null);
  const [showName, setShowName] = useState(false);
  const [facingLeft, setFacingLeft] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  
  const posRef = useRef({ 
    x: -100, // Empieza fuera de la pantalla (izquierda)
    y: window.innerHeight / 2, 
    mouseX: window.innerWidth / 2, 
    mouseY: window.innerHeight / 2 
  });

  // Animación de entrada desde el borde izquierdo
  useEffect(() => {
    const el = remiRef.current;
    if (!el) return;
    
    // Posición inicial fuera de la pantalla
    el.style.left = "-100px";
    el.style.top = `${window.innerHeight / 2}px`;
    
    // Después de un pequeño delay, marcar como "entrado"
    const timer = setTimeout(() => setHasEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animación de huida cuando se desactiva
  useEffect(() => {
    if (!isHiding || !hasEntered) return;
    
    const el = remiRef.current;
    if (!el) return;
    
    // Correr hacia la izquierda (fuera de la pantalla)
    el.classList.add("remi-hiding");
    setFacingLeft(true);
    
    const timer = setTimeout(() => {
      onHidden?.();
    }, 800);
    
    return () => clearTimeout(timer);
  }, [isHiding, hasEntered, onHidden]);

  // Lógica de seguimiento del cursor
  useEffect(() => {
    const el = remiRef.current;
    if (!el || !hasEntered || isHiding) return;

    const state = posRef.current;
    const speed = 5;

    const onMouseMove = (e: MouseEvent) => {
      state.mouseX = e.clientX;
      state.mouseY = e.clientY;
    };

    const animate = () => {
      const dx = state.mouseX - state.x;
      const dy = state.mouseY - state.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Solo moverse si está lejos del cursor
      if (dist > 40) {
        state.x += (dx / dist) * speed;
        state.y += (dy / dist) * speed;
        el.style.left = `${state.x - 24}px`;
        el.style.top = `${state.y - 24}px`;
        
        // Cambiar dirección
        setFacingLeft(dx < 0);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    const intervalId = setInterval(animate, 25);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      clearInterval(intervalId);
    };
  }, [hasEntered, isHiding]);

  return (
    <div
      ref={remiRef}
      className={`remi-container ${facingLeft ? "remi-flip" : ""} ${hasEntered ? "remi-entered" : ""}`}
      onMouseEnter={() => setShowName(true)}
      onMouseLeave={() => setShowName(false)}
    >
      <img src="/remi.png" alt="Remi" className="remi-image" draggable={false} />
      {showName && <div className="remi-tooltip">Remi 🐱</div>}
    </div>
  );
}
