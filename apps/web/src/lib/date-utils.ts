import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

/** 날짜 포맷 (한국어) - UI 전용 */
export function formatDateKo(date: Date | string, formatStr: string = 'M월 d일'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr, { locale: ko });
}
