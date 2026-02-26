import { SERVICE_CONFIGS } from '@subtrack/shared';

/**
 * 결제카드 표시 포맷 (UI 전용)
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

/** 서비스별 Tailwind CSS 클래스 매핑 (UI 전용) */
const SERVICE_STYLES: Record<string, { textColor: string; bgColor: string }> = {
  'Anthropic API': { textColor: 'text-orange-600', bgColor: 'bg-orange-100' },
  Claude: { textColor: 'text-orange-600', bgColor: 'bg-orange-100' },
  'OpenAI API': { textColor: 'text-green-600', bgColor: 'bg-green-100' },
  ChatGPT: { textColor: 'text-green-600', bgColor: 'bg-green-100' },
  'Google Cloud (Gemini API)': { textColor: 'text-blue-600', bgColor: 'bg-blue-100' },
  Gemini: { textColor: 'text-blue-600', bgColor: 'bg-blue-100' },
  ElevenLabs: { textColor: 'text-gray-800', bgColor: 'bg-gray-200' },
  Suno: { textColor: 'text-green-600', bgColor: 'bg-green-100' },
  Midjourney: { textColor: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  'Meshy AI': { textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
};

const DEFAULT_STYLE = { textColor: 'text-gray-600', bgColor: 'bg-gray-100' };

export function getServiceStyle(serviceName: string) {
  const config = SERVICE_CONFIGS[serviceName as keyof typeof SERVICE_CONFIGS];
  const style = SERVICE_STYLES[serviceName] ?? DEFAULT_STYLE;
  return {
    label: config?.shortName ?? serviceName,
    color: style.textColor,
    bgColor: style.bgColor,
  };
}

/** 통화 기호로 인식되는 단위 목록 */
const CURRENCY_UNITS = ['USD', '$', 'KRW', '₩', '원', 'EUR', '€', 'JPY', '¥', '円'];

/**
 * 크레딧 표시 단위 결정
 * credit_unit이 비어있거나 없을 때만 구독의 currency를 대신 사용
 * 사용자가 설정한 단위(credits, generations 등)는 그대로 유지
 */
export function resolveCreditUnit(creditUnit: string | null | undefined, currency?: string): string {
  // creditUnit이 있으면 그대로 사용 (사용자가 명시적으로 설정한 값 존중)
  if (creditUnit && creditUnit.trim()) return creditUnit;
  // creditUnit이 없을 때만 currency로 폴백
  if (currency && CURRENCY_UNITS.includes(currency)) return currency;
  return 'credits';
}

/**
 * 크레딧 잔여량을 단위와 함께 포맷 (UI 전용)
 * 통화 단위($, ₩ 등)는 통화 포맷으로, 일반 단위(credits 등)는 숫자+단위로 표시
 */
export function formatCreditValue(value: number, unit: string): string {
  if (unit === 'USD' || unit === '$') {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (unit === 'KRW' || unit === '₩' || unit === '원') {
    return `₩${value.toLocaleString('ko-KR')}`;
  }
  if (unit === 'EUR' || unit === '€') {
    return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (unit === 'JPY' || unit === '¥' || unit === '円') {
    return `¥${value.toLocaleString('ja-JP')}`;
  }
  return `${value.toLocaleString()} ${unit}`;
}
