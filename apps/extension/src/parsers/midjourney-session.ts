import type { CreditData, ServiceParser } from './types';
import { getCookieHeader } from '../utils/cookies';
import { notifySessionExpired } from '../utils/notifications';

/**
 * Midjourney 세션 기반 크레딧 수집기.
 * 브라우저 세션 쿠키로 내부 API에 접근.
 *
 * [엔드포인트 검증 필요]
 * midjourney.com에서 DevTools Network 탭으로 확인해야 함.
 */
export class MidjourneySessionParser implements ServiceParser {
  name = 'Midjourney';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    const cookieHeader = await getCookieHeader('.midjourney.com');
    return cookieHeader !== null;
  }

  async collect(): Promise<CreditData | null> {
    const cookieHeader = await getCookieHeader('.midjourney.com');
    if (!cookieHeader) {
      notifySessionExpired(this.name);
      return null;
    }

    try {
      // TODO: 실제 엔드포인트로 교체 (DevTools에서 확인)
      const res = await fetch('https://www.midjourney.com/api/auth/session', {
        headers: {
          Cookie: cookieHeader,
          Accept: 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) return null;
      const data = await res.json();

      return {
        serviceName: this.name,
        remainingCredits:
          data.subscription?.remainingFastHours ??
          data.remainingCredits ??
          0,
        usedCredits:
          data.subscription?.usedFastHours ?? data.usedCredits ?? 0,
        totalCredits:
          data.subscription?.totalFastHours ?? data.totalCredits ?? 0,
        unit: 'fast_hours',
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[SubTrack] ${this.name} collection failed:`, error);
      return null;
    }
  }
}
