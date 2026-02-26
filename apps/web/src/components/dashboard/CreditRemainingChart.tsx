'use client';

import { useRouter } from 'next/navigation';
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
import { getServiceStyle, resolveCreditUnit } from '@/lib/service-config';

interface CreditRemainingChartProps {
  data: CreditSummaryItem[];
}

function getBarColor(percent: number): string {
  if (percent > 50) return '#22c55e'; // green-500
  if (percent > 20) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

interface ChartEntry {
  name: string;
  percent: number;
  remaining: number;
  total: number;
  unit: string;
  subscriptionId: string;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-gray-900">{entry.name}</p>
      <p className="mt-1 text-sm text-gray-600">
        {entry.remaining.toLocaleString()} / {entry.total.toLocaleString()}{' '}
        {entry.unit} 남음
      </p>
      <p className="text-xs text-gray-400">{entry.percent}%</p>
    </div>
  );
}

export function CreditRemainingChart({ data }: CreditRemainingChartProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-gray-500">
        크레딧 정보가 있는 정기 구독이 없습니다.
      </div>
    );
  }

  const chartData: ChartEntry[] = data.map((item) => ({
    name: getServiceStyle(item.serviceName).label,
    percent: item.percentRemaining,
    remaining: item.remainingCredits,
    total: item.totalCredits,
    unit: resolveCreditUnit(item.creditUnit, item.currency),
    subscriptionId: item.subscriptionId,
  }));

  const handleBarClick = (entry: ChartEntry) => {
    router.push(`/subscriptions/${entry.subscriptionId}`);
  };

  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 40}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        className="cursor-pointer"
      >
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar
          dataKey="percent"
          radius={[0, 4, 4, 0]}
          barSize={20}
          onClick={(_data: any, index: number) => handleBarClick(chartData[index])}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.percent)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
