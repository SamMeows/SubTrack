import type { CreditData, CreditGrant, ServiceParser } from './types';
import { getCookieHeader } from '../utils/cookies';
import { notifySessionExpired } from '../utils/notifications';

/**
 * Claude API (Anthropic) 세션 기반 크레딧 수집기.
 * platform.claude.com 브라우저 세션 쿠키로 내부 billing API에 접근.
 *
 * 흐름:
 *  1. 세션 쿠키로 조직 목록 조회 → 첫 번째 org_id 추출
 *  2. prepaid/credits 엔드포인트에서 잔액 조회
 *  3. current_spend 엔드포인트에서 사용량 조회
 */
export class ClaudeApiParser implements ServiceParser {
  name = 'Anthropic API';
  source = 'session' as const;

  async init(): Promise<boolean> {
    return this.checkAuth();
  }

  async checkAuth(): Promise<boolean> {
    // platform.claude.com 또는 .claude.com 쿠키 존재 여부 확인
    const cookieHeader = await getCookieHeader('platform.claude.com');
    if (cookieHeader) return true;
    const cookieHeaderWild = await getCookieHeader('.claude.com');
    return cookieHeaderWild !== null;
  }

  /**
   * 세션 쿠키로 HTTP 요청 헤더 생성
   */
  private async buildHeaders(): Promise<Record<string, string> | null> {
    const cookieHeader =
      (await getCookieHeader('platform.claude.com')) ??
      (await getCookieHeader('.claude.com'));

    if (!cookieHeader) return null;

    return {
      Accept: 'application/json',
      Cookie: cookieHeader,
    };
  }

  /**
   * 조직 목록을 조회하여 첫 번째 org_id를 반환
   */
  private async getOrganizationId(
    headers: Record<string, string>,
  ): Promise<string | null> {
    try {
      console.log('[SubTrack] Claude API: fetching organization list');
      const res = await fetch(
        'https://platform.claude.com/api/organizations',
        { headers },
      );

      console.log(
        `[SubTrack] Claude API orgs response: ${res.status} ${res.statusText}`,
      );

      if (res.status === 401 || res.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('[SubTrack] Claude API orgs error body:', text.slice(0, 500));
        return null;
      }

      const data = await res.json();
      console.log('[SubTrack] Claude API orgs response data:', JSON.stringify(data).slice(0, 500));

      // 응답이 배열인 경우 첫 번째 조직의 id 사용
      if (Array.isArray(data) && data.length > 0) {
        const orgId = data[0].uuid ?? data[0].organization_id ?? String(data[0].id);
        console.log(`[SubTrack] Claude API: using org_id=${orgId}`);
        return orgId ?? null;
      }

      // 응답이 객체(단일 조직)인 경우
      if (data.id || data.uuid || data.organization_id) {
        const orgId = data.uuid ?? data.organization_id ?? String(data.id);
        console.log(`[SubTrack] Claude API: using org_id=${orgId}`);
        return orgId ?? null;
      }

      console.log('[SubTrack] Claude API: could not extract org_id from response');
      return null;
    } catch (error) {
      console.error('[SubTrack] Claude API: failed to fetch organizations:', error);
      return null;
    }
  }

  async collect(): Promise<CreditData | null> {
    const headers = await this.buildHeaders();
    if (!headers) {
      console.log('[SubTrack] Claude API: no session cookie found');
      notifySessionExpired(this.name);
      return null;
    }

    try {
      // 1. 조직 ID 조회
      const orgId = await this.getOrganizationId(headers);
      if (!orgId) {
        console.log('[SubTrack] Claude API: no organization found');
        return null;
      }

      // 2. prepaid/credits 엔드포인트에서 잔액 조회
      console.log(`[SubTrack] Claude API: fetching credits for org=${orgId}`);
      const creditsRes = await fetch(
        `https://platform.claude.com/api/organizations/${orgId}/prepaid/credits`,
        { headers },
      );

      console.log(
        `[SubTrack] Claude API credits response: ${creditsRes.status} ${creditsRes.statusText}`,
      );

      if (creditsRes.status === 401 || creditsRes.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      let remainingCredits = 0;
      let totalCredits = 0;

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();
        console.log(
          '[SubTrack] Claude API credits data:',
          JSON.stringify(creditsData).slice(0, 500),
        );

        // 응답: { amount: 1502420, currency: "USD" }
        // amount는 센트 단위 → 달러로 변환
        const rawAmount =
          creditsData.amount ??
          creditsData.remaining ??
          creditsData.balance ??
          creditsData.remaining_credits ??
          0;
        remainingCredits = creditsData.currency === 'USD' ? rawAmount / 100 : rawAmount;
        totalCredits =
          creditsData.total ??
          creditsData.total_credits ??
          creditsData.granted ??
          remainingCredits;
      } else {
        const errorText = await creditsRes.text().catch(() => '');
        console.log('[SubTrack] Claude API credits error body:', errorText.slice(0, 500));
      }

      // 3. current_spend 엔드포인트에서 현재 사용량 조회
      console.log(`[SubTrack] Claude API: fetching current spend for org=${orgId}`);
      const spendRes = await fetch(
        `https://platform.claude.com/api/organizations/${orgId}/current_spend`,
        { headers },
      );

      console.log(
        `[SubTrack] Claude API spend response: ${spendRes.status} ${spendRes.statusText}`,
      );

      let usedCredits = 0;

      if (spendRes.ok) {
        const spendData = await spendRes.json();
        console.log(
          '[SubTrack] Claude API spend data:',
          JSON.stringify(spendData).slice(0, 500),
        );

        // 응답: { amount: 59, resets_at: "..." }
        const rawSpend =
          spendData.amount ??
          spendData.current_spend ??
          spendData.spend ??
          spendData.used ??
          spendData.total_usage ??
          0;
        usedCredits = rawSpend / 100; // 센트 → 달러
      } else {
        const errorText = await spendRes.text().catch(() => '');
        console.log('[SubTrack] Claude API spend error body:', errorText.slice(0, 500));
      }

      // totalCredits가 0이면 remaining + used로 추정
      if (totalCredits === 0 && (remainingCredits > 0 || usedCredits > 0)) {
        totalCredits = remainingCredits + usedCredits;
      }

      // 4. /invoices 엔드포인트에서 배치별 만료 정보 조회
      const creditGrants = await this.fetchCreditGrants(orgId, headers);

      console.log(
        `[SubTrack] Claude API: remaining=${remainingCredits}, used=${usedCredits}, total=${totalCredits}, grants=${creditGrants.length}`,
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
    } catch (error) {
      console.error(`[SubTrack] ${this.name} collection failed:`, error);
      return null;
    }
  }

  /**
   * /invoices 엔드포인트에서 크레딧 배치별 만료 정보 추출.
   * type이 "free_credits" 또는 "prepaid_credits"이고 expires_at이 미래인 항목만 반환.
   */
  private async fetchCreditGrants(
    orgId: string,
    headers: Record<string, string>,
  ): Promise<CreditGrant[]> {
    try {
      console.log(`[SubTrack] Claude API: fetching invoices for org=${orgId}`);
      const res = await fetch(
        `https://platform.claude.com/api/organizations/${orgId}/invoices`,
        { headers },
      );

      if (!res.ok) {
        console.log(`[SubTrack] Claude API invoices response: ${res.status}`);
        return [];
      }

      const data = await res.json();
      const invoices: Array<{
        type: string;
        amount: number;
        effective_at: string | null;
        expires_at: string | null;
      }> = data.invoices ?? [];

      const now = Date.now();
      const creditTypes = ['free_credits', 'prepaid_credits'];
      const grants: CreditGrant[] = [];

      for (const inv of invoices) {
        // 크레딧 관련 항목만 필터
        if (!creditTypes.includes(inv.type)) continue;
        if (!inv.expires_at) continue;

        // 이미 만료된 항목 제외
        if (new Date(inv.expires_at).getTime() <= now) continue;

        const amountUsd = (inv.amount ?? 0) / 100; // 센트 → 달러
        grants.push({
          grantId: `${inv.type}_${inv.effective_at ?? ''}`,
          grantAmount: amountUsd,
          usedAmount: 0, // API에서 배치별 사용량 미제공
          remainingAmount: amountUsd,
          expiresAt: inv.expires_at,
          effectiveAt: inv.effective_at,
        });
      }

      if (grants.length > 0) {
        console.log(`[SubTrack] Claude API: extracted ${grants.length} credit grants from invoices`);
      }

      return grants;
    } catch (e) {
      console.log('[SubTrack] Claude API: invoices fetch failed:', e);
      return [];
    }
  }
}
