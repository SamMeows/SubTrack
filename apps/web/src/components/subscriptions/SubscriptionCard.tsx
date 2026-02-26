import Link from 'next/link';
import { formatCurrency, getDaysUntilBilling, calculateCreditPercentage } from '@subtrack/shared';
import type { Subscription } from '@subtrack/shared';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getServiceStyle, formatCardDisplay, formatCreditValue, resolveCreditUnit } from '@/lib/service-config';

interface SubscriptionCardProps {
  subscription: Subscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const config = getServiceStyle(subscription.service_name);
  const daysUntil = getDaysUntilBilling(subscription.billing_day);
  const hasCredits =
    subscription.total_credits != null && subscription.total_credits > 0;
  const creditPercent = hasCredits
    ? calculateCreditPercentage(
        subscription.remaining_credits,
        subscription.total_credits,
      )
    : null;
  const isPrepaid = subscription.billing_type === 'prepaid';
  const cardDisplay = formatCardDisplay(
    subscription.payment_card_last4,
    subscription.card_nickname,
  );
  const displayUnit = resolveCreditUnit(
    subscription.credit_unit,
    subscription.currency,
  );

  return (
    <Link href={`/subscriptions/${subscription.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <div className="p-5">
          {/* 헤더 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${config.bgColor} ${config.color}`}
              >
                {config.label.charAt(0)}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {subscription.service_name}
                </h3>
                {subscription.plan_name && (
                  <p className="text-xs text-gray-500">
                    {subscription.plan_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isPrepaid && (
                <Badge variant="info">선불</Badge>
              )}
              <Badge variant={subscription.is_active ? 'success' : 'default'}>
                {subscription.is_active ? '활성' : '비활성'}
              </Badge>
            </div>
          </div>

          {/* 카드 정보 */}
          {cardDisplay && (
            <p className="mt-2 text-xs text-gray-400">{cardDisplay}</p>
          )}

          {/* 금액 + 결제일 (recurring) or 잔여 크레딧 (prepaid) */}
          <div className="mt-3 flex items-end justify-between">
            {isPrepaid ? (
              <>
                {subscription.remaining_credits != null ? (
                  <p className="text-lg font-bold text-gray-900">
                    {formatCreditValue(subscription.remaining_credits, displayUnit)}{' '}
                    <span className="text-sm font-normal text-gray-500">남음</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">크레딧 정보 없음</p>
                )}
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(subscription.monthly_cost, subscription.currency)}
                </p>
                {daysUntil != null && (
                  <p className="text-xs text-gray-500">
                    매월 {subscription.billing_day}일{' '}
                    <span
                      className={
                        daysUntil <= 3 ? 'font-medium text-red-600' : 'text-gray-400'
                      }
                    >
                      (D-{daysUntil})
                    </span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* 크레딧 바 — 정기 구독만 % 표시 */}
          {!isPrepaid && hasCredits && creditPercent !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>크레딧 {creditPercent}% 남음</span>
                <span>{displayUnit}</span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-1.5 rounded-full ${
                    creditPercent > 50
                      ? 'bg-green-500'
                      : creditPercent > 20
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(creditPercent, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
