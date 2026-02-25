import type { CreditData, ServiceParser } from './types';
import { getApiKey } from '../utils/storage';

/**
 * Claude API (Anthropic) 크레딧 수집기.
 * Anthropic은 공개 billing/usage API가 없으므로 auth 검증만 수행.
 * remainingCredits=-1은 "API에서 수집 불가" 표시.
 */
export class ClaudeApiParser implements ServiceParser {
  name = 'Claude API';
  source = 'api' as const;

  private apiKey = '';

  async init(): Promise<boolean> {
    this.apiKey = (await getApiKey('claude_api')) ?? '';
    return !!this.apiKey;
  }

  async checkAuth(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      return res.status !== 401 && res.status !== 403;
    } catch {
      return false;
    }
  }

  async collect(): Promise<CreditData | null> {
    if (!(await this.checkAuth())) return null;

    // Anthropic billing API 미지원 → 센티널 값
    return {
      serviceName: this.name,
      remainingCredits: -1,
      usedCredits: -1,
      totalCredits: -1,
      unit: 'USD',
      collectedAt: new Date().toISOString(),
    };
  }
}
