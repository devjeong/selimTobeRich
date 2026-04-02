"use client";

import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  data: number[];
  isPositive: boolean;
}

export function MarketSparkline({ data, isPositive }: Props) {
  if (!data || data.length < 2) {
    return <div className="h-12 bg-gray-50 rounded" />;
  }

  const chartData = data.map((v, i) => ({ i, v }));
  const color = isPositive ? "#16a34a" : "#dc2626";
  const fillColor = isPositive ? "#dcfce7" : "#fee2e2";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = (max - min) * 0.15 || 1;

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          fill={fillColor}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
