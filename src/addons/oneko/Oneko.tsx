import { useEffect, useRef, useState } from "react";
import "./Remi.css";
import remiSprite from "./Remi.png";

// Tamaño de cada frame del sprite
// Tu imagen es 500x500 px, con 8 columnas y 8 filas
const SPRITE_WIDTH = 62.5;  // 500 / 8 = 62.5
const SPRITE_HEIGHT = 62.5; // 500 / 8 = 62.5

interface RemiProps {
  isHiding?: boolean;
  onHidden?: () => void;
}

export default function Remi({ isHiding = false, onHidden }: RemiProps) {
  const remiRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const [showName, setShowName] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  // Estado persistente usando refs para evitar re-renders
  const stateRef = useRef({
    nekoPosX: 32,
    nekoPosY: 32,
    mousePosX: 0,
    mousePosY: 0,
    frameCount: 0,
    idleTime: 0,
    idleAnimation: null as string | null,
    idleAnimationFrame: 0,
  });

  const nekoSpeed = 10;

  // Sprite sets - basado en tu sprite sheet 8x8
  // Formato: [columna, fila] (0-indexed)
  // Usamos 4 frames espaciados para ciclo de caminar visible
  const spriteSets: Record<string, number[][]> = {
    // Fila 0: Idle sentado mirando al frente
    idle: [[0, 0]],
    // Fila 0: Mirando a los lados (alerta)
    alert: [[4, 0], [5, 0]],
    // Fila 1: Bostezando/cansado
    tired: [[0, 1], [1, 1]],
    // Fila 1: Durmiendo con Zz
    sleeping: [[2, 1], [3, 1], [4, 1]],
    // Fila 2: Acicalándose
    scratch: [[0, 2], [1, 2], [2, 2]],
    
    // Caminar: 4 frames espaciados para ciclo visible de patas
    // Fila 3: Norte (de espaldas)
    N: [[0, 3], [2, 3], [4, 3], [6, 3]],
    // Fila 4: Sur (de frente)  
    S: [[0, 4], [2, 4], [4, 4], [6, 4]],
    // Fila 5: Este (derecha) - ciclo de caminar completo
    E: [[0, 5], [2, 5], [4, 5], [6, 5]],
    // Oeste: mismos frames volteados
    W: [[0, 5], [2, 5], [4, 5], [6, 5]],
    // Diagonales con ciclo de caminar
    NE: [[0, 6], [2, 6], [4, 6], [6, 6]],
    SE: [[0, 7], [2, 7], [4, 7], [6, 7]],
    NW: [[0, 6], [2, 6], [4, 6], [6, 6]],  // Volteado
    SW: [[0, 7], [2, 7], [4, 7], [6, 7]],  // Volteado
  };

  // Direcciones que necesitan voltear el sprite horizontalmente
  const flipDirections = ['W', 'NW', 'SW'];

  const setSprite = (name: string, frame: number) => {
    const el = spriteRef.current;
    if (!el) return;
    const set = spriteSets[name];
    if (!set) return;
    const sprite = set[frame % set.length];
    // Posición negativa porque movemos el background
    el.style.backgroundPosition = `${-sprite[0] * SPRITE_WIDTH}px ${-sprite[1] * SPRITE_HEIGHT}px`;
    // Voltear horizontalmente para direcciones hacia la izquierda
    el.style.transform = flipDirections.includes(name) ? 'scaleX(-1)' : 'scaleX(1)';
  };

  const resetIdleAnimation = () => {
    stateRef.current.idleAnimation = null;
    stateRef.current.idleAnimationFrame = 0;
  };

  const idle = () => {
    const state = stateRef.current;
    state.idleTime += 1;

    if (
      state.idleTime > 10 &&
      Math.floor(Math.random() * 200) === 0 &&
      state.idleAnimation === null
    ) {
      state.idleAnimation = ["sleeping", "scratch"][Math.floor(Math.random() * 2)];
    }

    switch (state.idleAnimation) {
      case "sleeping":
        if (state.idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(state.idleAnimationFrame / 4));
        if (state.idleAnimationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratch":
        setSprite("scratch", state.idleAnimationFrame);
        if (state.idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    state.idleAnimationFrame += 1;
  };

  // Animación de entrada desde el borde izquierdo
  useEffect(() => {
    const el = remiRef.current;
    if (!el) return;

    // Posición inicial fuera de la pantalla
    stateRef.current.nekoPosX = 32;
    stateRef.current.nekoPosY = 32;
    el.style.left = "16px";
    el.style.top = "16px";

    const timer = setTimeout(() => setHasEntered(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animación de huida cuando se desactiva
  useEffect(() => {
    if (!isHiding || !hasEntered) return;

    const el = remiRef.current;
    if (!el) return;

    el.classList.add("remi-hiding");

    const timer = setTimeout(() => {
      onHidden?.();
    }, 800);

    return () => clearTimeout(timer);
  }, [isHiding, hasEntered, onHidden]);

  // Lógica principal de seguimiento del cursor (basada en el código vanilla JS que funciona)
  useEffect(() => {
    const el = remiRef.current;
    const spriteEl = spriteRef.current;
    if (!el || !spriteEl || !hasEntered || isHiding) return;

    const state = stateRef.current;

    // Configurar el sprite con la imagen PNG
    spriteEl.style.backgroundImage = `url('${remiSprite}')`;
    spriteEl.style.imageRendering = "pixelated";

    // Manejador de movimiento del mouse
    const onMouseMove = (e: MouseEvent) => {
      state.mousePosX = e.clientX;
      state.mousePosY = e.clientY;
    };

    // Función de animación principal (frame loop)
    const frame = () => {
      state.frameCount += 1;
      
      const diffX = state.nekoPosX - state.mousePosX;
      const diffY = state.nekoPosY - state.mousePosY;
      const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

      // Si está cerca del cursor, entrar en modo idle
      if (distance < nekoSpeed || distance < 48) {
        idle();
        return;
      }

      // Resetear animación idle cuando empieza a moverse
      state.idleAnimation = null;
      state.idleAnimationFrame = 0;

      // Mostrar alerta antes de empezar a moverse
      if (state.idleTime > 1) {
        setSprite("alert", 0);
        state.idleTime = Math.min(state.idleTime, 7);
        state.idleTime -= 1;
        return;
      }

      // Calcular dirección
      let direction = "";
      direction = diffY / distance > 0.5 ? "N" : "";
      direction += diffY / distance < -0.5 ? "S" : "";
      direction += diffX / distance > 0.5 ? "W" : "";
      direction += diffX / distance < -0.5 ? "E" : "";
      
      if (direction) {
        setSprite(direction, state.frameCount);
      } else {
        setSprite("idle", 0);
      }

      // Mover el gato hacia el cursor
      state.nekoPosX -= (diffX / distance) * nekoSpeed;
      state.nekoPosY -= (diffY / distance) * nekoSpeed;

      // Actualizar posición visual
      el.style.left = `${state.nekoPosX - 16}px`;
      el.style.top = `${state.nekoPosY - 16}px`;
    };

    document.addEventListener("mousemove", onMouseMove);
    
    // Usar 60ms para animación de caminar más fluida y visible
    const intervalId = setInterval(frame, 60);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      clearInterval(intervalId);
    };
  }, [hasEntered, isHiding]);

  return (
    <div
      ref={remiRef}
      className={`remi-container ${hasEntered ? "remi-entered" : ""}`}
      onMouseEnter={() => setShowName(true)}
      onMouseLeave={() => setShowName(false)}
    >
      <div ref={spriteRef} className="remi-sprite" />
      {showName && <div className="remi-tooltip">Remi 🐱</div>}
    </div>
  );
}
