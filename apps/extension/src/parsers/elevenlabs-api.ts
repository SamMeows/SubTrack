import type { CreditData, ServiceParser } from './types';
import { getApiKey } from '../utils/storage';

/**
 * ElevenLabs 크레딧 수집기.
 * 공식 API: GET /v1/user/subscription
 * 응답: character_count, character_limit 등
 */
export class ElevenLabsApiParser implements ServiceParser {
  name = 'ElevenLabs';
  source = 'api' as const;

  private apiKey = '';

  async init(): Promise<boolean> {
    this.apiKey = (await getApiKey('elevenlabs')) ?? '';
    return !!this.apiKey;
  }

  async checkAuth(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': this.apiKey },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async collect(): Promise<CreditData | null> {
    if (!this.apiKey) return null;

    try {
      const res = await fetch(
        'https://api.elevenlabs.io/v1/user/subscription',
        { headers: { 'xi-api-key': this.apiKey } },
      );

      if (!res.ok) return null;
      const data = await res.json();

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
    } catch {
      return null;
    }
  }
}
