'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface UsageChartProps {
  data: Array<{
    date: string;
    calls: number;
  }>;
}

export default function UsageChart({ data }: UsageChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2962FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#2962FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="date"
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#6B7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1A1A1A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#fff'
          }}
        />
        <Area
          type="monotone"
          dataKey="calls"
          stroke="#2962FF"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCalls)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
