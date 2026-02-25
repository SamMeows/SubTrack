'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CreditSummaryItem } from '@/lib/data/credit-logs';
import { getServiceStyle } from '@/lib/service-config';

interface CreditRemainingChartProps {
  data: CreditSummaryItem[];
}

function getBarColor(percent: number): string {
  if (percent > 50) return '#22c55e'; // green-500
  if (percent > 20) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

export function CreditRemainingChart({ data }: CreditRemainingChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        크레딧 정보가 있는 구독이 없습니다.
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: getServiceStyle(item.serviceName).label,
    percent: item.percentRemaining,
    remaining: item.remainingCredits,
    total: item.totalCredits,
    unit: item.creditUnit,
  }));

  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 40}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
      >
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: number, _name: string, props: any) =>
            `${value}% (${props.payload.remaining.toLocaleString()} / ${props.payload.total.toLocaleString()} ${props.payload.unit})`
          }
          labelFormatter={(label: string) => label}
        />
        <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={20}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.percent)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
