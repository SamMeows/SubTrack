import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSubscription } from '@/lib/data/subscriptions';
import { getCreditLogs } from '@/lib/data/credit-logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DeleteSubscriptionButton } from '@/components/subscriptions/DeleteSubscriptionButton';
import { CreditHistoryChart } from '@/components/subscriptions/CreditHistoryChart';
import { formatCurrency, getDaysUntilBilling, getNextBillingDate, calculateCreditPercentage } from '@subtrack/shared';
import { formatDateKo } from '@/lib/date-utils';
import { getServiceStyle } from '@/lib/service-config';

export default async function SubscriptionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const subscription = await getSubscription(params.id);
  if (!subscription) notFound();

  const creditLogs = await getCreditLogs(subscription.id);
  const config = getServiceStyle(subscription.service_name);
  const daysUntil = getDaysUntilBilling(subscription.billing_day);
  const nextBilling = getNextBillingDate(subscription.billing_day);
  const hasCredits =
    subscription.total_credits != null && subscription.total_credits > 0;

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
          <Badge variant={subscription.is_active ? 'success' : 'default'}>
            {subscription.is_active ? '활성' : '비활성'}
          </Badge>
        </div>
        <div className="flex gap-2">
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
        <Card>
          <CardHeader>
            <CardTitle>월 결제금액</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(subscription.monthly_cost, subscription.currency)}
            </p>
          </CardContent>
        </Card>

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

        {hasCredits && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>잔여 크레딧</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {calculateCreditPercentage(
                    subscription.remaining_credits,
                    subscription.total_credits,
                  )}
                  %
                </p>
                <p className="text-sm text-gray-500">
                  {(subscription.remaining_credits ?? 0).toLocaleString()} /{' '}
                  {subscription.total_credits!.toLocaleString()}{' '}
                  {subscription.credit_unit ?? 'credits'}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {subscription.login_email && (
          <Card>
            <CardHeader>
              <CardTitle>계정</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="truncate text-sm font-medium">
                {subscription.login_email}
              </p>
              {subscription.payment_card_last4 && (
                <p className="text-sm text-gray-500">
                  카드 •••• {subscription.payment_card_last4}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
                creditUnit={subscription.credit_unit ?? 'credits'}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
