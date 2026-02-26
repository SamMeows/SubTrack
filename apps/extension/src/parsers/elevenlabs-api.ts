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
    if (!cookieHeader) {
      console.log('[SubTrack] ElevenLabs: no cookies found. Log in to elevenlabs.io first.');
    }
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
      console.log(`[SubTrack] ElevenLabs: cookies for ${url}: ${cookies.map(c => c.name).join(', ')}`);
      for (const name of tokenNames) {
        const cookie = cookies.find((c) => c.name === name);
        if (cookie) {
          console.log(`[SubTrack] ElevenLabs: found token '${name}' from '${url}'`);
          return cookie.value;
        }
      }
    }

    console.log('[SubTrack] ElevenLabs: no session token found');
    return null;
  }

  async collect(): Promise<CreditData | null> {
    const cookieHeader = await this.getAnyCookieHeader();
    if (!cookieHeader) {
      console.log('[SubTrack] ElevenLabs: no session cookie found');
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

      console.log(
        `[SubTrack] ElevenLabs: fetching subscription (hasCookie=true, hasToken=${!!sessionToken})`,
      );

      const res = await fetch(
        'https://api.elevenlabs.io/v1/user/subscription',
        { headers },
      );

      console.log(
        `[SubTrack] ElevenLabs response: ${res.status} ${res.statusText}`,
      );

      if (res.status === 401 || res.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.log('[SubTrack] ElevenLabs error body:', errorText.slice(0, 500));
        return null;
      }

      const data = await res.json();
      console.log(
        '[SubTrack] ElevenLabs data:',
        JSON.stringify(data).slice(0, 500),
      );

      const used = data.character_count ?? 0;
      const total = data.character_limit ?? 0;

      return {
        serviceName: this.name,
        remainingCredits: Math.max(0, total - used),
        usedCredits: used,
        totalCredits: total,
        unit: 'characters',
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[SubTrack] ${this.name} collection failed:`, error);
      return null;
    }
  }
}
