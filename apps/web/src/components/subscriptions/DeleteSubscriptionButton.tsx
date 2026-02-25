'use client';

import { useState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { Button } from '@/components/ui/Button';
import { deleteSubscription } from '@/lib/actions/subscriptions';

interface DeleteSubscriptionButtonProps {
  subscriptionId: string;
}

export function DeleteSubscriptionButton({
  subscriptionId,
}: DeleteSubscriptionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    setLoading(true);
    setError('');
    try {
      const result = await deleteSubscription(subscriptionId);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError('삭제 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-sm text-red-600">{error}</span>}
        <span className="text-sm text-red-600">정말 삭제하시겠습니까?</span>
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? '삭제 중...' : '삭제'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          취소
        </Button>
      </div>
    );
  }

  return (
    <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
      삭제
    </Button>
  );
}
