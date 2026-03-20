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
 *  4. invoices 엔드포인트에서 배치별 만료 정보 조회
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
      const res = await fetch(
        'https://platform.claude.com/api/organizations',
        { headers },
      );

      if (res.status === 401 || res.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      if (!res.ok) return null;

      const data = await res.json();

      // 응답이 배열인 경우 첫 번째 조직의 id 사용
      if (Array.isArray(data) && data.length > 0) {
        return data[0].uuid ?? data[0].organization_id ?? String(data[0].id) ?? null;
      }

      // 응답이 객체(단일 조직)인 경우
      if (data.id || data.uuid || data.organization_id) {
        return data.uuid ?? data.organization_id ?? String(data.id) ?? null;
      }

      return null;
    } catch {
      console.error('[SubTrack] Claude API: failed to fetch organizations');
      return null;
    }
  }

  async collect(): Promise<CreditData | null> {
    const headers = await this.buildHeaders();
    if (!headers) {
      notifySessionExpired(this.name);
      return null;
    }

    try {
      // 1. 조직 ID 조회
      const orgId = await this.getOrganizationId(headers);
      if (!orgId) return null;

      // 2. prepaid/credits 엔드포인트에서 잔액 조회
      const creditsRes = await fetch(
        `https://platform.claude.com/api/organizations/${orgId}/prepaid/credits`,
        { headers },
      );

      if (creditsRes.status === 401 || creditsRes.status === 403) {
        notifySessionExpired(this.name);
        return null;
      }

      let remainingCredits = 0;
      let totalCredits = 0;

      if (creditsRes.ok) {
        const creditsData = await creditsRes.json();

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
      }

      // 3. current_spend 엔드포인트에서 현재 사용량 조회
      const spendRes = await fetch(
        `https://platform.claude.com/api/organizations/${orgId}/current_spend`,
        { headers },
      );

      let usedCredits = 0;

      if (spendRes.ok) {
        const spendData = await spendRes.json();

        const rawSpend =
          spendData.amount ??
          spendData.current_spend ??
          spendData.spend ??
          spendData.used ??
          spendData.total_usage ??
          0;
        usedCredits = rawSpend / 100; // 센트 → 달러
      }

      // totalCredits가 0이면 remaining + used로 추정
      if (totalCredits === 0 && (remainingCredits > 0 || usedCredits > 0)) {
        totalCredits = remainingCredits + usedCredits;
      }

      // 4. /invoices 엔드포인트에서 배치별 만료 정보 조회
      const creditGrants = await this.fetchCreditGrants(orgId, headers, usedCredits);

      console.log(
        `[SubTrack] Claude API: collected (grants=${creditGrants.length})`,
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
    } catch {
      console.error(`[SubTrack] ${this.name} collection failed`);
      return null;
    }
  }

  /**
   * /invoices 엔드포인트에서 크레딧 배치별 만료 정보 추출.
   * type이 "free_credits" 또는 "prepaid_credits"이고 expires_at이 미래인 항목만 반환.
   *
   * Claude API는 배치별 사용량을 제공하지 않으므로,
   * 전체 사용량(totalUsed)을 FIFO(오래된 배치부터) 방식으로 배분.
   */
  private async fetchCreditGrants(
    orgId: string,
    headers: Record<string, string>,
    totalUsed: number,
  ): Promise<CreditGrant[]> {
    try {
      const res = await fetch(
        `https://platform.claude.com/api/organizations/${orgId}/invoices`,
        { headers },
      );

      if (!res.ok) return [];

      const data = await res.json();
      const invoices: Array<{
        type: string;
        amount: number;
        effective_at: string | null;
        expires_at: string | null;
      }> = data.invoices ?? [];

      const now = Date.now();
      const creditTypes = ['free_credits', 'prepaid_credits'];

      // expires_at 기준 오름차순 정렬 (만료 임박한 배치부터 사용량 차감)
      const activeInvoices = invoices
        .filter((inv) => {
          if (!creditTypes.includes(inv.type)) return false;
          if (!inv.expires_at) return false;
          if (new Date(inv.expires_at).getTime() <= now) return false;
          return true;
        })
        .sort((a, b) => {
          const aTime = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const bTime = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return aTime - bTime;
        });

      // FIFO 방식으로 사용량 배분
      let remainingUsed = totalUsed;
      const grants: CreditGrant[] = [];

      for (const inv of activeInvoices) {
        const amountUsd = (inv.amount ?? 0) / 100;
        const usedFromGrant = Math.min(remainingUsed, amountUsd);
        remainingUsed = Math.max(0, remainingUsed - amountUsd);

        grants.push({
          grantId: `${inv.type}_${inv.effective_at ?? ''}`,
          grantAmount: amountUsd,
          usedAmount: usedFromGrant,
          remainingAmount: Math.max(0, amountUsd - usedFromGrant),
          expiresAt: inv.expires_at,
          effectiveAt: inv.effective_at,
        });
      }

      return grants;
    } catch {
      return [];
    }
  }
}
