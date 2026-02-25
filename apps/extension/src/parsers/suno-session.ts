import type { CreditData, ServiceParser } from './types';
import { getCookieHeader } from '../utils/cookies';
import { notifySessionExpired } from '../utils/notifications';

/**
 * Suno 세션 기반 크레딧 수집기.
 * 브라우저 세션 쿠키로 내부 API에 접근.
 *
 * [엔드포인트 검증 필요]
 * 실제 URL은 suno.com에서 DevTools Network 탭으로 확인해야 함.
 * 아래는 예상 엔드포인트 - 실사용 시 교체 필요.
 */
export class SunoSessionParser implements ServiceParser {
  name = 'Suno';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    const cookieHeader = await getCookieHeader('.suno.com');
    return cookieHeader !== null;
  }

  async collect(): Promise<CreditData | null> {
    const cookieHeader = await getCookieHeader('.suno.com');
    if (!cookieHeader) {
      notifySessionExpired(this.name);
      return null;
    }

    try {
      // TODO: 실제 엔드포인트로 교체 (DevTools에서 확인)
      const res = await fetch('https://studio-api.suno.ai/api/billing/info/', {
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
        remainingCredits: data.credits_left ?? data.remaining ?? 0,
        usedCredits: data.total_credits_used ?? 0,
        totalCredits:
          ((data.credits_left ?? 0) + (data.total_credits_used ?? 0)) ||
          (data.total_credits ?? 0),
        unit: 'credits',
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[SubTrack] ${this.name} collection failed:`, error);
      return null;
    }
  }
}
