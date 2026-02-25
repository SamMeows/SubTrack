/** 지원 서비스 목록 */
export const SERVICE_NAMES = [
  'Claude API',
  'OpenAI',
  'ElevenLabs',
  'Suno',
  'Midjourney',
  'Meshy AI',
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

/** 지원 통화 */
export const SUPPORTED_CURRENCIES = ['USD', 'KRW', 'EUR', 'JPY'] as const;
