import Link from 'next/link';
import { type Currency } from '@subtrack/shared';
import { getSubscriptions } from '@/lib/data/subscriptions';
import { getCreditSummary } from '@/lib/data/credit-logs';
import { SpendingSummaryCard } from '@/components/dashboard/SpendingSummaryCard';
import { CreditRemainingChart } from '@/components/dashboard/CreditRemainingChart';
import { RenewalTimeline } from '@/components/dashboard/RenewalTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default async function DashboardPage() {
  const [subscriptions, creditSummary] = await Promise.all([
    getSubscriptions(),
    getCreditSummary(),
  ]);

  const activeSubscriptions = subscriptions.filter((s) => s.is_active);
  const monthlyTotal = activeSubscriptions.reduce(
    (sum, s) => sum + s.monthly_cost,
    0,
  );

  // 가장 많이 사용되는 통화 (기본 USD)
  const currencyCounts = activeSubscriptions.reduce(
    (acc, s) => {
      acc[s.currency] = (acc[s.currency] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const primaryCurrency = (
    Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD'
  ) as Currency;

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
        {/* 월간 총 지출 */}
        <SpendingSummaryCard
          total={monthlyTotal}
          currency={primaryCurrency}
          activeCount={activeSubscriptions.length}
        />

        {/* 크레딧 잔여량 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>크레딧 잔여량</CardTitle>
          </CardHeader>
          <CardContent>
            <CreditRemainingChart data={creditSummary} />
          </CardContent>
        </Card>
      </div>

      {/* 갱신일 타임라인 */}
      <div className="mt-6">
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
