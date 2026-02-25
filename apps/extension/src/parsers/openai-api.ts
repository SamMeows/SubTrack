import type { CreditData, ServiceParser } from './types';
import { getApiKey } from '../utils/storage';

/**
 * OpenAI 크레딧 수집기.
 * /dashboard/billing/subscription + /dashboard/billing/usage 엔드포인트 사용.
 * 이 엔드포인트들은 비공식이며 변경될 수 있음.
 */
export class OpenAiApiParser implements ServiceParser {
  name = 'OpenAI';
  source = 'api' as const;

  private apiKey = '';

  async init(): Promise<boolean> {
    this.apiKey = (await getApiKey('openai')) ?? '';
    return !!this.apiKey;
  }

  async checkAuth(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async collect(): Promise<CreditData | null> {
    if (!this.apiKey) return null;

    try {
      // 구독 정보 (hard_limit_usd)
      const subRes = await fetch(
        'https://api.openai.com/dashboard/billing/subscription',
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );

      if (!subRes.ok) {
        // 비공식 엔드포인트 실패 시 auth 확인만 반환
        if (await this.checkAuth()) {
          return {
            serviceName: this.name,
            remainingCredits: -1,
            usedCredits: -1,
            totalCredits: -1,
            unit: 'USD',
            collectedAt: new Date().toISOString(),
          };
        }
        return null;
      }

      const sub = await subRes.json();

      // 이번 달 사용량
      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const usageRes = await fetch(
        `https://api.openai.com/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
        { headers: { Authorization: `Bearer ${this.apiKey}` } },
      );

      if (!usageRes.ok) return null;
      const usage = await usageRes.json();

      const totalUsd = sub.hard_limit_usd ?? 0;
      const usedUsd = (usage.total_usage ?? 0) / 100; // cents → dollars
      const remainingUsd = totalUsd - usedUsd;

      return {
        serviceName: this.name,
        remainingCredits: Math.max(0, remainingUsd),
        usedCredits: usedUsd,
        totalCredits: totalUsd,
        unit: 'USD',
        collectedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }
}
