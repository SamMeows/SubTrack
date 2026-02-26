import type { CreditData, ServiceParser } from './types';
import { getCookieHeader, getCookieHeaderByUrl } from '../utils/cookies';
import { notifySessionExpired } from '../utils/notifications';

/**
 * ElevenLabs 세션 기반 크레딧 수집기.
 * 브라우저 세션 쿠키로 공식 API에 접근.
 *
 * 엔드포인트: GET /v1/user/subscription
 * 응답: character_count, character_limit 등
 */
export class ElevenLabsApiParser implements ServiceParser {
  name = 'ElevenLabs';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    const cookieHeader = await this.getAnyCookieHeader();
    return cookieHeader !== null;
  }

  /**
   * 여러 도메인에서 쿠키 검색
   */
  private async getAnyCookieHeader(): Promise<string | null> {
    // url 기반 검색 우선
    const urls = ['https://elevenlabs.io', 'https://www.elevenlabs.io', 'https://api.elevenlabs.io'];
    for (const url of urls) {
      const header = await getCookieHeaderByUrl(url);
      if (header) return header;
    }
    // fallback: domain 기반
    const header = await getCookieHeader('.elevenlabs.io');
    return header;
  }

  /**
   * ElevenLabs 쿠키에서 세션 토큰 추출 (url 기반)
   */
  private async getSessionToken(): Promise<string | null> {
    const urls = ['https://elevenlabs.io', 'https://www.elevenlabs.io', 'https://api.elevenlabs.io'];
    const tokenNames = ['__session', 'session', 'token', 'auth_token', '__client_uat', '__clerk_db_jwt'];

    for (const url of urls) {
      const cookies = await chrome.cookies.getAll({ url });
      for (const name of tokenNames) {
        const cookie = cookies.find((c) => c.name === name);
        if (cookie) return cookie.value;
      }
    }

    return null;
  }

  async collect(): Promise<CreditData | null> {
    const cookieHeader = await this.getAnyCookieHeader();
    if (!cookieHeader) {
      notifySessionExpired(this.name);
      return null;
    }

    const sessionToken = await this.getSessionToken();

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Cookie: cookieHeader,
      };
      if (sessionToken) {
        headers['Authorization'] = `Bearer ${sessionToken}`;
      }

      const res = await fetch(
        'https://api.elevenlabs.io/v1/user/subscription',
        { headers },
      );

      if (res.status === 401 || res.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) return null;

      const data = await res.json();

      const used = data.character_count ?? 0;
      const total = data.character_limit ?? 0;

      console.log('[SubTrack] ElevenLabs: collected');

      return {
        serviceName: this.name,
        remainingCredits: Math.max(0, total - used),
        usedCredits: used,
        totalCredits: total,
        unit: 'characters',
        collectedAt: new Date().toISOString(),
      };
    } catch {
      console.error(`[SubTrack] ${this.name} collection failed`);
      return null;
    }
  }
}
