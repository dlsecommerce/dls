import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function MiniChart({ data, color = "#2699fe" }) {
  const chartData = data || [
    { value: 30 },
    { value: 45 },
    { value: 35 },
    { value: 60 },
    { value: 50 },
    { value: 75 },
    { value: 70 }
  ];

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={2000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}