import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, type Currency } from '@subtrack/shared';

interface SpendingSummaryCardProps {
  total: number;
  currency: Currency;
  activeCount: number;
}

export function SpendingSummaryCard({
  total,
  currency,
  activeCount,
}: SpendingSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>월간 총 지출</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-900">
          {formatCurrency(total, currency)}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          활성 구독 {activeCount}개
        </p>
      </CardContent>
    </Card>
  );
}
