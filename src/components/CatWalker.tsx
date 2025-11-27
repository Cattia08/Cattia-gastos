import React, { useEffect, useRef, useState } from "react";
import styles from "./CatWalker.module.css";

type CatWalkerProps = {
  src?: string;
  size?: number;
  bottom?: number;
  top?: number;
  initialDelayMs?: number;
  debug?: boolean;
  minDuration?: number;
  maxDuration?: number;
  alignToCardTops?: boolean;
};

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const CatWalker: React.FC<CatWalkerProps> = ({
  src = "/cat.gif",
  size = 170,
  bottom = 24,
  top,
  initialDelayMs = 0,
  debug = true,
  minDuration = 7,
  maxDuration = 10,
  alignToCardTops = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [duration, setDuration] = useState<number>(14);
  const timerRef = useRef<number | null>(null);
  const catRef = useRef<HTMLImageElement | null>(null);
  const [y, setY] = useState<number | undefined>(undefined);
  const [phase, setPhase] = useState<"walking" | "resting" | "hidden">("hidden");
  const [restLeft, setRestLeft] = useState<number | undefined>(undefined);

  const computeY = () => {
    if (!alignToCardTops) return typeof top === "number" ? top : undefined;
    const nodes = Array.from(document.querySelectorAll('[data-catwalker="card"]')) as HTMLElement[];
    const candidates = nodes.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight;
    });
    const target = (candidates.length ? candidates : nodes).sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top
    )[0];
    if (!target) return typeof top === "number" ? top : undefined;
    const rect = target.getBoundingClientRect();
    const offset = 6;
    const yTop = Math.max(0, Math.round(rect.top - offset));
    if (debug) console.log("[CatWalker] computed Y from card top:", yTop);
    return yTop;
  };

  useEffect(() => {
    if (debug) console.log("[CatWalker] mount; initial delay", initialDelayMs, "ms");
    timerRef.current = window.setTimeout(() => {
      const d = randomBetween(minDuration, maxDuration);
      if (debug) console.log("[CatWalker] start walk; duration", d, "s");
      const yTop = computeY();
      setY(yTop);
      setDuration(d);
      setVisible(true);
      setPhase("walking");
    }, initialDelayMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const node = catRef.current;
    if (!node) return;

    const handleEnd = () => {
      if (debug) console.log("[CatWalker] animation end; go rest then schedule next");
      const restTarget = document.querySelector('[data-catwalker="rest-daily"]') as HTMLElement | null;
      if (restTarget) {
        const rect = restTarget.getBoundingClientRect();
        const yTop = Math.max(0, Math.round(rect.top - 6));
        const left = Math.round(rect.left + rect.width * 0.75 - size / 2);
        setY(yTop);
        setRestLeft(Math.max(8, Math.min(left, window.innerWidth - size - 8)));
        setPhase("resting");
        if (debug) console.log("[CatWalker] resting at", { top: yTop, left });
        // Rest 3-6 seconds visible, then schedule next walk 15-30s later
        const restMs = randomBetween(3, 6) * 1000;
        window.setTimeout(() => {
          setVisible(false);
          setPhase("hidden");
          const waitSeconds = 10;
          if (debug) console.log("[CatWalker] next walk in", waitSeconds, "s");
          timerRef.current = window.setTimeout(() => {
            const d = randomBetween(minDuration, maxDuration);
            const yTop2 = computeY();
            setY(yTop2);
            setRestLeft(undefined);
            setDuration(d);
            setVisible(true);
            setPhase("walking");
          }, waitSeconds * 1000);
        }, restMs);
      } else {
        // Fallback to previous behavior
        setVisible(false);
        setPhase("hidden");
        const waitSeconds = 10;
        timerRef.current = window.setTimeout(() => {
          const d = randomBetween(minDuration, maxDuration);
          const yTop = computeY();
          setY(yTop);
          setDuration(d);
          setVisible(true);
          setPhase("walking");
        }, waitSeconds * 1000);
      }
    };

    node.addEventListener("animationend", handleEnd);
    return () => node.removeEventListener("animationend", handleEnd);
  }, [visible]);

  if (!visible) return null;

  const style: React.CSSProperties & { [key: string]: string | number } = {
    width: `${size}px`,
    ...(typeof (y ?? top) === "number" ? { top: `${y ?? top}px` } : { bottom: `${bottom}px` }),
    ...(typeof restLeft === "number" && phase === "resting" ? { left: `${restLeft}px` } : {}),
    "--duration": `${duration}s`,
  };

  return (
    <div className={styles.overlay}>
      <img
        ref={catRef}
        src={src}
        alt="Cat Walker"
        className={`${styles.cat} ${phase === "walking" ? styles.walk : styles.idle}`}
        style={style}
        draggable={false}
      />
    </div>
  );
};

export default CatWalker;
