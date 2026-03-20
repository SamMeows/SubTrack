import Link from 'next/link';
import { getSubscriptions } from '@/lib/data/subscriptions';
import { getLatestCredits } from '@/lib/data/credit-logs';
import { SubscriptionTabs } from '@/components/subscriptions/SubscriptionTabs';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function SubscriptionsPage() {
  const subscriptions = await getSubscriptions();
  const latestCredits = await getLatestCredits(
    subscriptions.map((s) => s.id),
  );

  // credit_log 최신값으로 remaining_credits 보강
  const enriched = subscriptions.map((s) => ({
    ...s,
    remaining_credits: latestCredits.get(s.id) ?? s.remaining_credits,
  }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">구독 관리</h1>
        <Link href="/subscriptions/new">
          <Button>서비스 추가</Button>
        </Link>
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          title="등록된 서비스가 없습니다"
          description="AI 서비스 구독을 추가하여 관리를 시작하세요."
          action={
            <Link href="/subscriptions/new">
              <Button>첫 서비스 추가하기</Button>
            </Link>
          }
        />
      ) : (
        <SubscriptionTabs subscriptions={enriched} />
      )}
    </div>
  );
}
