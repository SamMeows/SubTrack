import Link from 'next/link';
import { type Currency, type Subscription } from '@subtrack/shared';
import { getSubscriptions } from '@/lib/data/subscriptions';
import { getCreditSummary, getExpiringGrants, type CreditSummaryItem, type ExpiringGrantInfo } from '@/lib/data/credit-logs';
import { SpendingSummaryCard, type CurrencyTotal } from '@/components/dashboard/SpendingSummaryCard';
import { CreditRemainingChart } from '@/components/dashboard/CreditRemainingChart';
import { PrepaidCreditList } from '@/components/dashboard/PrepaidCreditList';
import { RenewalTimeline } from '@/components/dashboard/RenewalTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default async function DashboardPage() {
  let subscriptions: Subscription[];
  let creditSummary: CreditSummaryItem[];
  let expiringGrants: ExpiringGrantInfo[] = [];

  try {
    [subscriptions, creditSummary, expiringGrants] = await Promise.all([
      getSubscriptions(),
      getCreditSummary(),
      getExpiringGrants(30),
    ]);
  } catch {
    return (
      <div>
        <h1 className="mb-6 text-xl font-bold">대시보드</h1>
        <div className="rounded-md bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">
            데이터를 불러오는 데 실패했습니다.
          </p>
          <p className="mt-1 text-sm text-red-600">
            Supabase 연결 상태를 확인하고 페이지를 새로고침해주세요.
          </p>
        </div>
      </div>
    );
  }

  const activeSubscriptions = subscriptions.filter((s) => s.is_active);

  // 정기 구독만 월간 지출 합산 (billing_type 미적용 시 recurring으로 간주)
  const recurringSubscriptions = activeSubscriptions.filter(
    (s) => (s.billing_type ?? 'recurring') === 'recurring',
  );
  const prepaidSubscriptions = activeSubscriptions.filter(
    (s) => s.billing_type === 'prepaid',
  );

  // 통화별 월간 지출 합산
  const totalsByCurrency = recurringSubscriptions.reduce(
    (acc, s) => {
      const curr = s.currency;
      acc[curr] = (acc[curr] || 0) + (s.monthly_cost ?? 0);
      return acc;
    },
    {} as Record<string, number>,
  );
  const spendingTotals: CurrencyTotal[] = Object.entries(totalsByCurrency)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => ({ currency: currency as Currency, amount }))
    .sort((a, b) => b.amount - a.amount);

  // 크레딧 요약: 정기 vs 선불 분리
  const recurringCredits = creditSummary.filter(
    (c) => c.billingType === 'recurring',
  );
  const prepaidCredits = creditSummary.filter(
    (c) => c.billingType === 'prepaid',
  );

  if (subscriptions.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-bold">대시보드</h1>
        <EmptyState
          title="아직 등록된 서비스가 없습니다"
          description="AI 서비스 구독을 추가하면 지출 현황과 크레딧을 한눈에 볼 수 있습니다."
          action={
            <Link href="/subscriptions/new">
              <Button>첫 서비스 추가하기</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">대시보드</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 월간 정기 지출 (통화별 분리) */}
        <SpendingSummaryCard
          totals={spendingTotals}
          recurringCount={recurringSubscriptions.length}
          prepaidCount={prepaidSubscriptions.length}
        />

        {/* 정기 구독 크레딧 잔여량 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>크레딧 잔여량</CardTitle>
          </CardHeader>
          <CardContent>
            <CreditRemainingChart data={recurringCredits} />
          </CardContent>
        </Card>
      </div>

      {/* 선불 잔여 크레딧 */}
      {prepaidCredits.length > 0 && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>선불 잔여 크레딧</CardTitle>
            </CardHeader>
            <CardContent>
              <PrepaidCreditList data={prepaidCredits} expiringGrants={expiringGrants} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* 갱신일 타임라인 */}
      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>결제 예정</CardTitle>
          </CardHeader>
          <CardContent>
            <RenewalTimeline subscriptions={subscriptions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
