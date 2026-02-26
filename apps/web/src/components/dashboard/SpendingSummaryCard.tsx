import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, type Currency } from '@subtrack/shared';

export interface CurrencyTotal {
  currency: Currency;
  amount: number;
}

interface SpendingSummaryCardProps {
  totals: CurrencyTotal[];
  recurringCount: number;
  prepaidCount: number;
}

export function SpendingSummaryCard({
  totals,
  recurringCount,
  prepaidCount,
}: SpendingSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>월간 정기 지출</CardTitle>
      </CardHeader>
      <CardContent>
        {totals.length === 0 ? (
          <p className="text-3xl font-bold text-gray-900">-</p>
        ) : totals.length === 1 ? (
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(totals[0].amount, totals[0].currency)}
          </p>
        ) : (
          <div className="space-y-1">
            {totals.map(({ currency, amount }) => (
              <p key={currency} className="text-2xl font-bold text-gray-900">
                {formatCurrency(amount, currency)}
              </p>
            ))}
          </div>
        )}
        <p className="mt-1 text-sm text-gray-500">
          정기 구독 {recurringCount}개
          {prepaidCount > 0 && ` · 선불 ${prepaidCount}개`}
        </p>
      </CardContent>
    </Card>
  );
}
