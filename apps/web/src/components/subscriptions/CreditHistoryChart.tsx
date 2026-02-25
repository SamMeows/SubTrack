'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, isAfter } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CreditLog } from '@subtrack/shared';

interface CreditHistoryChartProps {
  logs: CreditLog[];
  creditUnit: string;
}

type Range = '7d' | '30d' | '90d';

const rangeOptions: { value: Range; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
];

const rangeDays: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 };

export function CreditHistoryChart({
  logs,
  creditUnit,
}: CreditHistoryChartProps) {
  const [range, setRange] = useState<Range>('30d');

  const filteredData = useMemo(() => {
    const cutoff = subDays(new Date(), rangeDays[range]);
    return logs
      .filter((log) => isAfter(new Date(log.collected_at), cutoff))
      .map((log) => ({
        date: format(new Date(log.collected_at), 'M/d HH:mm', { locale: ko }),
        remaining: log.remaining_credits,
        used: log.used_credits,
      }));
  }, [logs, range]);

  if (logs.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        크레딧 이력이 없습니다. Chrome Extension을 설치하여 자동 수집을
        시작하세요.
      </div>
    );
  }

  return (
    <div>
      {/* 범위 선택 */}
      <div className="mb-4 flex gap-1">
        {rangeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              range === opt.value
                ? 'bg-brand-100 text-brand-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filteredData.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">
          선택한 기간에 데이터가 없습니다.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={filteredData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
              }
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} ${creditUnit}`,
                name === 'remaining' ? '잔여' : '사용',
              ]}
            />
            <Area
              type="monotone"
              dataKey="remaining"
              stroke="#3b82f6"
              fill="#dbeafe"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
