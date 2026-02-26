import Link from 'next/link';
import type { CreditSummaryItem, ExpiringGrantInfo } from '@/lib/data/credit-logs';
import { getServiceStyle, formatCreditValue, resolveCreditUnit } from '@/lib/service-config';

interface PrepaidCreditListProps {
  data: CreditSummaryItem[];
  expiringGrants?: ExpiringGrantInfo[];
}

export function PrepaidCreditList({ data, expiringGrants = [] }: PrepaidCreditListProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-gray-500">
        선불 충전 서비스가 없습니다.
      </div>
    );
  }

  // 구독ID → 만료 정보 매핑
  const expiryMap = new Map<string, ExpiringGrantInfo>();
  for (const eg of expiringGrants) {
    expiryMap.set(eg.subscriptionId, eg);
  }

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const style = getServiceStyle(item.serviceName);
        const displayUnit = resolveCreditUnit(item.creditUnit, item.currency);
        const expiry = expiryMap.get(item.subscriptionId);

        return (
          <Link
            key={item.subscriptionId}
            href={`/subscriptions/${item.subscriptionId}`}
            className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            <div className="flex flex-col gap-1">
              <span
                className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${style.bgColor} ${style.color}`}
              >
                {style.label}
              </span>
              {expiry && (
                <ExpiryWarning expiry={expiry} unit={displayUnit} />
              )}
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatCreditValue(item.remainingCredits, displayUnit)}
              <span className="ml-1 text-sm font-normal text-gray-500">남음</span>
            </p>
          </Link>
        );
      })}
    </div>
  );
}

function ExpiryWarning({ expiry, unit }: { expiry: ExpiringGrantInfo; unit: string }) {
  // 가장 임박한 grant 기준으로 표시
  const nearest = expiry.grants[0];
  if (!nearest) return null;

  const days = nearest.daysUntilExpiry;
  const isUrgent = days <= 7;
  const isWarning = days <= 14;

  const colorClass = isUrgent
    ? 'text-red-600'
    : isWarning
      ? 'text-amber-600'
      : 'text-amber-500';

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      {isUrgent ? '\u26a0\ufe0f ' : '\u23f3 '}
      {formatCreditValue(expiry.totalExpiringAmount, unit)}
      {days <= 0
        ? ' 만료됨'
        : ` ${days}일 내 만료`}
    </span>
  );
}
