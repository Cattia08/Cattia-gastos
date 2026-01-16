import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
    showDot?: boolean;
    className?: string;
}

/**
 * Mini sparkline chart for trend visualization
 * Used alongside "vs. anterior" comparison text
 */
const Sparkline = ({
    data,
    color = "#5DBE8A",
    width = 60,
    height = 24,
    showDot = true,
    className = "",
}: SparklineProps) => {
    // Convert number array to recharts format
    const chartData = data.map((value, index) => ({ value, index }));

    // Determine trend color: green if last > first, red if declining
    const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0;
    const trendColor = trend >= 0 ? "#5DBE8A" : "#E57373";
    const finalColor = color === "auto" ? trendColor : color;

    if (data.length < 2) {
        return null;
    }

    return (
        <div
            className={`inline-flex items-center ${className}`}
            style={{ width, height }}
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={finalColor}
                        strokeWidth={1.5}
                        dot={showDot ? {
                            r: 2,
                            fill: finalColor,
                            strokeWidth: 0
                        } : false}
                        activeDot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default Sparkline;
