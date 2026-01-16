import React, { useEffect, useRef, useCallback } from "react";

interface ConfettiProps {
    active: boolean;
    duration?: number;
    particleCount?: number;
    colors?: string[];
    onComplete?: () => void;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}

/**
 * Celebration confetti animation 🎉
 * Canvas-based for performance
 */
const Confetti = ({
    active,
    duration = 2000,
    particleCount = 50,
    colors = ["#E879A8", "#5DBE8A", "#B8A9E8", "#F5C869", "#7CB899"],
    onComplete,
}: ConfettiProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const startTimeRef = useRef<number>(0);

    const createParticle = useCallback((canvasWidth: number): Particle => {
        return {
            x: canvasWidth / 2 + (Math.random() - 0.5) * 100,
            y: -10,
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 3 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            opacity: 1,
        };
    }, [colors]);

    useEffect(() => {
        if (!active || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Create initial particles
        particlesRef.current = Array.from({ length: particleCount }, () =>
            createParticle(canvas.width)
        );
        startTimeRef.current = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTimeRef.current;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particlesRef.current = particlesRef.current.filter((particle) => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                particle.vy += 0.1; // Gravity
                particle.rotation += particle.rotationSpeed;

                // Fade out near end
                if (elapsed > duration * 0.7) {
                    particle.opacity = Math.max(0, 1 - (elapsed - duration * 0.7) / (duration * 0.3));
                }

                // Draw particle
                ctx.save();
                ctx.translate(particle.x, particle.y);
                ctx.rotate((particle.rotation * Math.PI) / 180);
                ctx.globalAlpha = particle.opacity;
                ctx.fillStyle = particle.color;

                // Draw rectangle confetti
                ctx.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);

                ctx.restore();

                // Keep particle if still visible
                return particle.y < canvas.height + 50 && particle.opacity > 0;
            });

            // Continue animation
            if (elapsed < duration && particlesRef.current.length > 0) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                onComplete?.();
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [active, duration, particleCount, createParticle, onComplete]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-50"
            style={{ width: "100vw", height: "100vh" }}
        />
    );
};

export default Confetti;
