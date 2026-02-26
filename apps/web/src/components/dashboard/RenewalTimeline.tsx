import Link from 'next/link';
import { getDaysUntilBilling, getNextBillingDate, formatCurrency } from '@subtrack/shared';
import type { Subscription } from '@subtrack/shared';
import { formatDateKo } from '@/lib/date-utils';
import { getServiceStyle } from '@/lib/service-config';

interface RenewalTimelineProps {
  subscriptions: Subscription[];
}

export function RenewalTimeline({ subscriptions }: RenewalTimelineProps) {
  // 정기 결제 + 활성 + billing_day 있는 구독만 표시
  const sorted = [...subscriptions]
    .filter((s) => s.is_active && (s.billing_type ?? 'recurring') === 'recurring' && s.billing_day != null)
    .map((s) => ({
      ...s,
      daysUntil: getDaysUntilBilling(s.billing_day)!,
      nextDate: getNextBillingDate(s.billing_day)!,
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (sorted.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-gray-500">
        정기 결제 예정이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((sub) => {
        const config = getServiceStyle(sub.service_name);
        const isUrgent = sub.daysUntil <= 3;

        return (
          <Link
            key={sub.id}
            href={`/subscriptions/${sub.id}`}
            className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${config.bgColor} ${config.color}`}
              >
                {config.label.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {sub.service_name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDateKo(sub.nextDate, 'M월 d일 (EEEE)')}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(sub.monthly_cost ?? 0, sub.currency)}
              </p>
              <p
                className={`text-xs font-medium ${
                  isUrgent ? 'text-red-600' : 'text-gray-400'
                }`}
              >
                D-{sub.daysUntil}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
