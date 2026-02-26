import type { Currency } from './types';
import type { BillingType } from './constants';

/**
 * 크레딧 잔여 비율 계산 (%)
 * @returns 0-100 사이의 정수, total이 0이면 0 반환
 */
export function calculateCreditPercentage(
  remaining: number | null,
  total: number | null,
): number {
  if (!total || total <= 0 || remaining == null) return 0;
  const pct = Math.round((remaining / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

/**
 * 통화 포맷팅
 * Intl.NumberFormat을 사용하여 로케일에 맞게 표시
 * amount가 null이면 "-" 반환
 */
export function formatCurrency(amount: number | null, currency: Currency): string {
  if (amount == null) return '-';

  const localeMap: Record<Currency, string> = {
    USD: 'en-US',
    KRW: 'ko-KR',
    EUR: 'de-DE',
    JPY: 'ja-JP',
  };

  return new Intl.NumberFormat(localeMap[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

/**
 * 다음 결제일 계산
 * billing_day 기준으로 현재 날짜에서 다음 결제일을 반환
 * @param billingDay 결제일 (1-31), null이면 null 반환
 * @param referenceDate 기준 날짜 (기본값: 현재)
 */
export function getNextBillingDate(
  billingDay: number | null,
  referenceDate: Date = new Date(),
): Date | null {
  if (billingDay == null) return null;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  // 이번 달 결제일 시도
  let nextDate = new Date(currentYear, currentMonth, billingDay);

  // Date 생성자가 오버플로 처리 (예: 2월 31일 -> 3월 3일)
  // 오버플로된 경우 해당 월의 마지막 날로 설정
  if (nextDate.getMonth() !== currentMonth) {
    nextDate = new Date(currentYear, currentMonth + 1, 0);
  }

  // 이미 지난 경우 다음 달로
  if (nextDate <= referenceDate) {
    const nextMonth = currentMonth + 1;
    nextDate = new Date(currentYear, nextMonth, billingDay);
    if (nextDate.getMonth() !== nextMonth % 12) {
      nextDate = new Date(currentYear, nextMonth + 1, 0);
    }
  }

  return nextDate;
}

/**
 * 결제일까지 남은 일수 계산
 * billing_day가 null이면 null 반환
 */
export function getDaysUntilBilling(
  billingDay: number | null,
  referenceDate: Date = new Date(),
): number | null {
  if (billingDay == null) return null;
  const nextBilling = getNextBillingDate(billingDay, referenceDate);
  if (!nextBilling) return null;
  const diffMs = nextBilling.getTime() - referenceDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 크레딧 숫자 포맷팅 (큰 숫자를 읽기 쉽게)
 * 예: 1234567 -> "1.23M", 12345 -> "12.3K", 999 -> "999"
 */
export function formatCredits(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * 결제카드 표시 포맷
 * @returns "신한 체크 •••• 1234" / "신한 체크" / "•••• 1234" / null
 */
export function formatCardDisplay(
  cardLast4: string | null,
  nickname: string | null,
): string | null {
  if (!cardLast4 && !nickname) return null;
  if (nickname && cardLast4) return `${nickname} •••• ${cardLast4}`;
  if (nickname) return nickname;
  return `•••• ${cardLast4}`;
}

/**
 * 선불 서비스인지 확인
 */
export function isPrepaid(subscription: { billing_type: BillingType }): boolean {
  return subscription.billing_type === 'prepaid';
}
