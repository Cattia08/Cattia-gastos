import React from "react";
import { cn } from "@/lib/utils";

interface SuccessCheckProps {
    size?: number;
    color?: string;
    className?: string;
    animate?: boolean;
}

/**
 * Animated checkmark for success feedback
 * SVG-based with stroke animation
 */
const SuccessCheck = ({
    size = 24,
    color = "currentColor",
    className = "",
    animate = true,
}: SuccessCheckProps) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className={cn("inline-block", className)}
        >
            {/* Circle background */}
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke={color}
                strokeWidth="2"
                fill="none"
                className={animate ? "animate-[scale-in_0.2s_ease-out]" : ""}
                style={{ opacity: 0.2 }}
            />

            {/* Checkmark */}
            <path
                d="M7 12.5L10 15.5L17 8.5"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className={animate ? "animate-check-draw" : ""}
                style={{
                    strokeDasharray: animate ? 20 : 0,
                    strokeDashoffset: animate ? 0 : 0,
                }}
            />

            <style>{`
        @keyframes check-draw {
          0% {
            stroke-dashoffset: 20;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        .animate-check-draw {
          animation: check-draw 0.25s ease-out forwards;
          stroke-dasharray: 20;
          stroke-dashoffset: 20;
        }
      `}</style>
        </svg>
    );
};

export default SuccessCheck;
