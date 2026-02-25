import { notFound } from 'next/navigation';
import { getSubscription } from '@/lib/data/subscriptions';
import { SubscriptionForm } from '@/components/subscriptions/SubscriptionForm';
import { updateSubscription } from '@/lib/actions/subscriptions';

export default async function EditSubscriptionPage({
  params,
}: {
  params: { id: string };
}) {
  const subscription = await getSubscription(params.id);
  if (!subscription) notFound();

  const boundAction = updateSubscription.bind(null, params.id);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">서비스 수정</h1>
      <div className="max-w-2xl">
        <SubscriptionForm
          mode="edit"
          subscription={subscription}
          action={boundAction}
        />
      </div>
    </div>
  );
}
