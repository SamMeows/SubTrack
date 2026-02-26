/** 지원 서비스 목록 */
export const SERVICE_NAMES = [
  'Anthropic API',
  'Claude',
  'OpenAI API',
  'ChatGPT',
  'Google Cloud (Gemini API)',
  'Gemini',
  'ElevenLabs',
  'Suno',
  'Midjourney',
  'Meshy AI',
] as const;

export type ServiceName = (typeof SERVICE_NAMES)[number];

/** 지원 통화 */
export const SUPPORTED_CURRENCIES = ['USD', 'KRW', 'EUR', 'JPY'] as const;

/** 결제 유형 */
export const BILLING_TYPES = ['recurring', 'prepaid'] as const;
export type BillingType = (typeof BILLING_TYPES)[number];
