import type { CreditData, CreditGrant, ServiceParser } from './types';
import { notifySessionExpired } from '../utils/notifications';

/**
 * OpenAI 세션 기반 크레딧 수집기.
 * content script가 Auth0 access_token을 chrome.storage.local에 캐시.
 * background에서 OAuth 토큰으로 session key를 획득한 뒤 billing API 호출.
 *
 * 흐름:
 *  1. OAuth token → POST /dashboard/onboarding/login → session key (sens_id)
 *  2. session key → GET /v1/dashboard/billing/credit_grants
 *  3. session key → GET /v1/dashboard/billing/subscription
 */
export class OpenAiApiParser implements ServiceParser {
  name = 'OpenAI API';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    const token = await this.getOAuthToken();
    return !!token;
  }

  /** content script가 캐시한 Auth0 OAuth 토큰 읽기 */
  private async getOAuthToken(): Promise<string | null> {
    const result = await chrome.storage.local.get('openai_access_token');
    return result.openai_access_token ?? null;
  }

  /**
   * OAuth 토큰으로 /dashboard/onboarding/login 호출하여 session key 획득.
   * 응답에서 user.session.sensitive_id를 추출.
   */
  private async getSessionKey(oauthToken: string): Promise<string | null> {
    try {
      const res = await fetch('https://api.openai.com/dashboard/onboarding/login', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oauthToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) return null;

      const data = await res.json();

      // session key 추출 시도 (여러 가능한 경로)
      const sessionKey =
        data?.user?.session?.sensitive_id ??
        data?.user?.session?.id ??
        data?.session?.sensitive_id ??
        data?.session_key ??
        data?.sensitive_id ??
        null;

      if (sessionKey) {
        // 캐시하여 재사용
        await chrome.storage.local.set({ openai_session_key: sessionKey });
      }

      return sessionKey;
    } catch {
      console.error('[SubTrack] OpenAI session key exchange failed');
      return null;
    }
  }

  async collect(): Promise<CreditData | null> {
    const oauthToken = await this.getOAuthToken();
    if (!oauthToken) {
      notifySessionExpired(this.name);
      return null;
    }

    try {
      // 1. 캐시된 session key가 있으면 먼저 시도, 없으면 새로 획득
      let sessionKey = (await chrome.storage.local.get('openai_session_key')).openai_session_key ?? null;

      if (!sessionKey) {
        sessionKey = await this.getSessionKey(oauthToken);
      }

      if (!sessionKey) {
        notifySessionExpired(this.name);
        return null;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${sessionKey}`,
        Accept: 'application/json',
      };

      // 2. 크레딧 잔액 조회
      const creditsRes = await fetch(
        'https://api.openai.com/v1/dashboard/billing/credit_grants',
        { headers },
      );

      if (creditsRes.status === 401 || creditsRes.status === 403) {
        // session key 만료 → 재시도
        await chrome.storage.local.remove('openai_session_key');
        const newKey = await this.getSessionKey(oauthToken);
        if (!newKey) {
          await chrome.storage.local.remove('openai_access_token');
          notifySessionExpired(this.name);
          return null;
        }

        // 새 session key로 재시도
        headers.Authorization = `Bearer ${newKey}`;
        const retryRes = await fetch(
          'https://api.openai.com/v1/dashboard/billing/credit_grants',
          { headers },
        );

        if (!retryRes.ok) {
          await chrome.storage.local.remove('openai_access_token');
          await chrome.storage.local.remove('openai_session_key');
          notifySessionExpired(this.name);
          return null;
        }

        return this.parseBillingData(retryRes, headers);
      }

      return this.parseBillingData(creditsRes, headers);
    } catch {
      console.error(`[SubTrack] ${this.name} collection failed`);
      return null;
    }
  }

  /** Unix timestamp(초)를 ISO 8601 문자열로 변환 */
  private unixToIso(ts: number | null | undefined): string | null {
    if (!ts) return null;
    return new Date(ts * 1000).toISOString();
  }

  /** credit_grants + subscription 응답으로 CreditData 생성 */
  private async parseBillingData(
    creditsRes: Response,
    headers: Record<string, string>,
  ): Promise<CreditData> {
    let remainingCredits = 0;
    let totalCredits = 0;
    let usedCredits = 0;
    const creditGrants: CreditGrant[] = [];

    if (creditsRes.ok) {
      const creditsData = await creditsRes.json();

      totalCredits = creditsData.total_granted ?? creditsData.total ?? 0;
      usedCredits = creditsData.total_used ?? creditsData.used ?? 0;
      remainingCredits =
        creditsData.total_available ??
        creditsData.remaining ??
        Math.max(0, totalCredits - usedCredits);

      // grant 배열 추출 (만료 정보 포함)
      const grantsArray = creditsData.grants?.data ?? (Array.isArray(creditsData.grants) ? creditsData.grants : []);
      for (const grant of grantsArray) {
        const grantAmount = grant.grant_amount ?? 0;
        const usedAmount = grant.used_amount ?? 0;
        creditGrants.push({
          grantId: grant.id ?? '',
          grantAmount,
          usedAmount,
          remainingAmount: Math.max(0, grantAmount - usedAmount),
          expiresAt: this.unixToIso(grant.expires_at),
          effectiveAt: this.unixToIso(grant.effective_at),
        });
      }
    }

    // 구독 정보 조회 (보조)
    try {
      const subRes = await fetch(
        'https://api.openai.com/v1/dashboard/billing/subscription',
        { headers },
      );

      if (subRes.ok) {
        const subData = await subRes.json();
        if (totalCredits === 0 && subData.hard_limit_usd) {
          totalCredits = subData.hard_limit_usd;
        }
      }
    } catch {
      // subscription 조회 실패해도 크레딧 데이터는 반환
    }

    if (totalCredits === 0 && (remainingCredits > 0 || usedCredits > 0)) {
      totalCredits = remainingCredits + usedCredits;
    }

    console.log(
      `[SubTrack] OpenAI: collected (grants=${creditGrants.length})`,
    );

    return {
      serviceName: this.name,
      remainingCredits,
      usedCredits,
      totalCredits,
      unit: 'USD',
      collectedAt: new Date().toISOString(),
      creditGrants: creditGrants.length > 0 ? creditGrants : undefined,
    };
  }
}
