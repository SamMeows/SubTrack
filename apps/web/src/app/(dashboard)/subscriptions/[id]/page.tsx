import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSubscription } from '@/lib/data/subscriptions';
import { getCreditLogs, getCreditGrants } from '@/lib/data/credit-logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DeleteSubscriptionButton } from '@/components/subscriptions/DeleteSubscriptionButton';
import { CreditHistoryChart } from '@/components/subscriptions/CreditHistoryChart';
import { formatCurrency, getDaysUntilBilling, getNextBillingDate, calculateCreditPercentage, SERVICE_CONFIGS } from '@subtrack/shared';
import type { ServiceName } from '@subtrack/shared';
import { formatDateKo } from '@/lib/date-utils';
import { getServiceStyle, formatCardDisplay, formatCreditValue, resolveCreditUnit } from '@/lib/service-config';

export default async function SubscriptionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const subscription = await getSubscription(params.id);
  if (!subscription) notFound();

  const [creditLogs, creditGrants] = await Promise.all([
    getCreditLogs(subscription.id),
    getCreditGrants(subscription.id),
  ]);
  const config = getServiceStyle(subscription.service_name);
  const serviceConfig = SERVICE_CONFIGS[subscription.service_name as ServiceName];
  const isPrepaid = subscription.billing_type === 'prepaid';
  const daysUntil = getDaysUntilBilling(subscription.billing_day);
  const nextBilling = getNextBillingDate(subscription.billing_day);
  const creditUnit = resolveCreditUnit(
    subscription.credit_unit,
    subscription.currency,
  );
  const hasCredits =
    subscription.total_credits != null && subscription.total_credits > 0;
  // 최신 credit_log의 remaining_credits 우선 사용 (subscription 테이블 값은 stale할 수 있음)
  const latestRemaining = creditLogs.length > 0
    ? creditLogs[creditLogs.length - 1].remaining_credits
    : (subscription.remaining_credits ?? 0);
  const cardDisplay = formatCardDisplay(
    subscription.payment_card_last4,
    subscription.card_nickname,
  );

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${config.bgColor} ${config.color}`}
          >
            {config.label.charAt(0)}
          </span>
          <div>
            <h1 className="text-xl font-bold">{subscription.service_name}</h1>
            {subscription.plan_name && (
              <p className="text-sm text-gray-500">{subscription.plan_name}</p>
            )}
          </div>
          {isPrepaid && <Badge variant="info">선불</Badge>}
          <Badge variant={subscription.is_active ? 'success' : 'default'}>
            {subscription.is_active ? '활성' : '비활성'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {serviceConfig?.websiteUrl && (
            <a
              href={serviceConfig.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm">
                서비스 바로가기 &rarr;
              </Button>
            </a>
          )}
          <Link href={`/subscriptions/${subscription.id}/edit`}>
            <Button variant="secondary" size="sm">
              수정
            </Button>
          </Link>
          <DeleteSubscriptionButton subscriptionId={subscription.id} />
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 월 결제금액 / 충전 금액 */}
        {(subscription.monthly_cost != null || !isPrepaid) && (
          <Card>
            <CardHeader>
              <CardTitle>{isPrepaid ? '충전 금액' : '월 결제금액'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(subscription.monthly_cost, subscription.currency)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 다음 결제일 (recurring만) */}
        {!isPrepaid && nextBilling && daysUntil != null && (
          <Card>
            <CardHeader>
              <CardTitle>다음 결제일</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatDateKo(nextBilling)}
              </p>
              <p
                className={`text-sm ${daysUntil <= 3 ? 'text-red-600' : 'text-gray-500'}`}
              >
                D-{daysUntil}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 잔여 크레딧 */}
        {(isPrepaid || hasCredits) && (
          <Card>
            <CardHeader>
              <CardTitle>잔여 크레딧</CardTitle>
            </CardHeader>
            <CardContent>
              {isPrepaid ? (
                <p className="text-2xl font-bold">
                  {formatCreditValue(latestRemaining, creditUnit)}
                </p>
              ) : (
                <>
                  <p className="text-2xl font-bold">
                    {calculateCreditPercentage(latestRemaining, subscription.total_credits)}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {latestRemaining.toLocaleString()} /{' '}
                    {subscription.total_credits!.toLocaleString()} {creditUnit}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 계정 + 카드 정보 */}
        {(subscription.login_email || cardDisplay) && (
          <Card>
            <CardHeader>
              <CardTitle>계정</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription.login_email && (
                <p className="truncate text-sm font-medium">
                  {subscription.login_email}
                </p>
              )}
              {cardDisplay && (
                <p className="text-sm text-gray-500">
                  {cardDisplay}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 크레딧 배치별 만료 현황 */}
      {creditGrants.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>크레딧 배치별 만료 현황</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {creditGrants.map((grant) => {
                  const now = Date.now();
                  const expiresAt = grant.expires_at ? new Date(grant.expires_at).getTime() : null;
                  const daysUntil = expiresAt
                    ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
                    : null;
                  const isExpired = daysUntil !== null && daysUntil <= 0;
                  const isUrgent = daysUntil !== null && daysUntil <= 7;
                  const isWarning = daysUntil !== null && daysUntil <= 30;
                  const isFullyUsed = grant.remaining_amount <= 0;

                  return (
                    <div
                      key={grant.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                        isExpired || isFullyUsed
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : isUrgent
                            ? 'border-red-200 bg-red-50'
                            : isWarning
                              ? 'border-amber-200 bg-amber-50'
                              : 'border-gray-100'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCreditValue(grant.grant_amount, creditUnit)}
                          {' '}
                          <span className="font-normal text-gray-500">충전</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          사용: {formatCreditValue(grant.used_amount, creditUnit)}
                          {' / '}
                          잔여: {formatCreditValue(grant.remaining_amount, creditUnit)}
                        </p>
                        {grant.effective_at && (
                          <p className="text-xs text-gray-400">
                            {formatDateKo(new Date(grant.effective_at), 'yyyy년 M월 d일')} 충전
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {grant.expires_at ? (
                          <>
                            <p className={`text-sm font-medium ${
                              isExpired ? 'text-gray-400' : isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-700'
                            }`}>
                              {formatDateKo(new Date(grant.expires_at), 'yyyy년 M월 d일')}
                            </p>
                            <p className={`text-xs ${
                              isExpired ? 'text-gray-400' : isUrgent ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-400'
                            }`}>
                              {isExpired ? '만료됨' : `D-${daysUntil}`}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">만료일 없음</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 크레딧 이력 차트 */}
      {hasCredits && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>크레딧 사용 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <CreditHistoryChart
                logs={creditLogs}
                creditUnit={creditUnit}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
