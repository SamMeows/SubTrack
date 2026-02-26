import type { CreditData, ServiceParser } from './types';
import { getCookieHeader } from '../utils/cookies';
import { notifySessionExpired } from '../utils/notifications';

/**
 * Suno 세션 기반 크레딧 수집기.
 * 브라우저 세션 쿠키(clerk JWT)로 내부 API에 접근.
 *
 * Suno는 Clerk 인증을 사용하며, __client_uat / __session 쿠키로 인증.
 * API 도메인은 studio-api.prod.suno.com
 */
export class SunoSessionParser implements ServiceParser {
  name = 'Suno';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    // Suno는 .suno.com 쿠키(Clerk 세션)를 사용
    const cookieHeader = await getCookieHeader('.suno.com');
    if (cookieHeader) return true;
    // suno.ai 도메인 쿠키도 확인
    const cookieHeaderAi = await getCookieHeader('.suno.ai');
    return cookieHeaderAi !== null;
  }

  /**
   * Suno 쿠키에서 Clerk 세션 토큰(__session)을 추출
   */
  private async getSessionToken(): Promise<string | null> {
    // .suno.com 도메인에서 __session 쿠키 확인
    const cookies = await chrome.cookies.getAll({ domain: '.suno.com' });
    const sessionCookie = cookies.find((c) => c.name === '__session');
    if (sessionCookie) return sessionCookie.value;

    // .suno.ai 도메인에서도 확인
    const cookiesAi = await chrome.cookies.getAll({ domain: '.suno.ai' });
    const sessionCookieAi = cookiesAi.find((c) => c.name === '__session');
    if (sessionCookieAi) return sessionCookieAi.value;

    return null;
  }

  async collect(): Promise<CreditData | null> {
    const sessionToken = await this.getSessionToken();
    const cookieHeader = await getCookieHeader('.suno.com') ?? await getCookieHeader('.suno.ai');

    if (!sessionToken && !cookieHeader) {
      console.log('[SubTrack] Suno: no session cookie found');
      notifySessionExpired(this.name);
      return null;
    }

    try {
      // Suno API 호출 - Bearer 토큰 또는 Cookie 방식
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }

      console.log(`[SubTrack] Suno: fetching billing info (hasToken=${!!sessionToken}, hasCookie=${!!cookieHeader})`);

      const res = await fetch('https://studio-api.prod.suno.com/api/billing/info/', {
        headers,
      });

      console.log(`[SubTrack] Suno response: ${res.status} ${res.statusText}`);
      if (res.status === 401 || res.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log(`[SubTrack] Suno error body:`, text.slice(0, 200));
        return null;
      }
      const data = await res.json();
      const remaining = data.total_credits_left ?? (data.monthly_limit - data.monthly_usage);
      const used = data.monthly_usage ?? 0;
      const total = data.monthly_limit ?? 0;

      console.log(`[SubTrack] Suno credits: remaining=${remaining}, used=${used}, total=${total}`);

      return {
        serviceName: this.name,
        remainingCredits: remaining,
        usedCredits: used,
        totalCredits: total,
        unit: 'credits',
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[SubTrack] ${this.name} collection failed:`, error);
      return null;
    }
  }
}
