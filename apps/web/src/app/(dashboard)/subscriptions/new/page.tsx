import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { createSubscription } from '@/lib/actions/subscriptions';

export default function NewSubscriptionPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">서비스 추가</h1>
      <div className="max-w-2xl">
        <SubscriptionForm mode="create" action={createSubscription} />
      </div>
    </div>
  );
}
