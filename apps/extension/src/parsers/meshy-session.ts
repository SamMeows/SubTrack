import type { CreditData, ServiceParser } from './types';
import { notifySessionExpired } from '../utils/notifications';

/**
 * Meshy AI 세션 기반 크레딧 수집기.
 * content script가 Supabase access_token을 chrome.storage.local에 캐시.
 * (쿠키 포맷: base64-<JSON> → access_token 추출)
 *
 * 엔드포인트: https://api.meshy.ai/web/v1/me/credits
 */
export class MeshySessionParser implements ServiceParser {
  name = 'Meshy AI';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    const result = await chrome.storage.local.get('meshy_access_token');
    if (!result.meshy_access_token) {
      console.log('[SubTrack] Meshy: no cached token. Visit www.meshy.ai to trigger caching.');
      return false;
    }
    return true;
  }

  async collect(): Promise<CreditData | null> {
    const result = await chrome.storage.local.get('meshy_access_token');
    const token = result.meshy_access_token ?? null;

    if (!token) {
      console.log('[SubTrack] Meshy: no access token (visit www.meshy.ai first)');
      notifySessionExpired(this.name);
      return null;
    }

    try {
      console.log('[SubTrack] Meshy: fetching credits with Bearer token');

      const res = await fetch('https://api.meshy.ai/web/v1/me/credits', {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(
        `[SubTrack] Meshy credits response: ${res.status} ${res.statusText}`,
      );

      if (res.status === 401 || res.status === 403) {
        await chrome.storage.local.remove('meshy_access_token');
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        console.log('[SubTrack] Meshy credits error:', errorText.slice(0, 500));
        return null;
      }

      const data = await res.json();
      console.log(
        '[SubTrack] Meshy credits data:',
        JSON.stringify(data).slice(0, 500),
      );

      // API 응답 구조: { code: "OK", result: { creditBalance, freeCreditBalance, rolloverBalance, shareCreditEarned, ... } }
      const r = data.result ?? data;
      const creditBalance = r.creditBalance ?? 0;
      const freeCreditBalance = r.freeCreditBalance ?? 0;
      const rolloverBalance = r.rolloverBalance ?? 0;
      const shareCreditEarned = r.shareCreditEarned ?? 0;
      const featureCreditEarned = r.featureCreditEarned ?? 0;

      const totalCredits =
        creditBalance +
        freeCreditBalance +
        rolloverBalance +
        shareCreditEarned +
        featureCreditEarned;

      console.log(
        `[SubTrack] Meshy parsed credits: total=${totalCredits} (credit=${creditBalance} free=${freeCreditBalance} rollover=${rolloverBalance} share=${shareCreditEarned} feature=${featureCreditEarned})`,
      );

      return {
        serviceName: this.name,
        remainingCredits: totalCredits,
        usedCredits: 0,
        totalCredits: totalCredits,
        unit: 'credits',
        collectedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[SubTrack] ${this.name} collection failed:`, error);
      return null;
    }
  }
}
