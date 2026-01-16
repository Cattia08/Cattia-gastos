import React, { useEffect, useState, useRef } from "react";

interface AnimatedCounterProps {
    value: number;
    /** Animation duration in ms (default: 800ms for visible roll-up) */
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    /** Trigger re-animation when value changes */
    animateOnChange?: boolean;
}

/**
 * Animated counter with roll-up effect
 * Animates from 0 (or previous value) to target value
 */
const AnimatedCounter = ({
    value,
    duration = 800,
    decimals = 2,
    prefix = "",
    suffix = "",
    className = "",
    animateOnChange = true,
}: AnimatedCounterProps) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = animateOnChange ? previousValue.current : 0;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease-out cubic for smooth deceleration
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            const currentValue = startValue + (endValue - startValue) * easedProgress;
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        // Cancel any existing animation
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration, animateOnChange]);

    const formattedValue = displayValue.toFixed(decimals);

    return (
        <span className={className}>
            {prefix}
            {formattedValue}
            {suffix}
        </span>
    );
};

export default AnimatedCounter;
