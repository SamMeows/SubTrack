import { SERVICE_CONFIGS } from '@subtrack/shared';

/** 서비스별 Tailwind CSS 클래스 매핑 (UI 전용) */
const SERVICE_STYLES: Record<string, { textColor: string; bgColor: string }> = {
  'Claude API': { textColor: 'text-orange-600', bgColor: 'bg-orange-100' },
  OpenAI: { textColor: 'text-green-600', bgColor: 'bg-green-100' },
  ElevenLabs: { textColor: 'text-gray-800', bgColor: 'bg-gray-200' },
  Suno: { textColor: 'text-green-600', bgColor: 'bg-green-100' },
  Midjourney: { textColor: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  'Meshy AI': { textColor: 'text-orange-600', bgColor: 'bg-orange-50' },
};

const DEFAULT_STYLE = { textColor: 'text-gray-600', bgColor: 'bg-gray-100' };

export function getServiceStyle(serviceName: string) {
  const config = SERVICE_CONFIGS[serviceName as keyof typeof SERVICE_CONFIGS];
  const style = SERVICE_STYLES[serviceName] ?? DEFAULT_STYLE;
  return {
    label: config?.shortName ?? serviceName,
    color: style.textColor,
    bgColor: style.bgColor,
  };
}
