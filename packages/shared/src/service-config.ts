import type { ServiceName } from './constants';
import type { ServiceDataSource } from './types';

/** 서비스별 인증 방식 */
export type AuthMethod = 'api-key' | 'session-cookie' | 'none';

/** 서비스 설정 정보 */
export interface ServiceConfig {
  /** SERVICE_NAMES에 매칭되는 이름 */
  name: ServiceName;
  /** 대시보드 표시용 짧은 이름 */
  shortName: string;
  /** 서비스 브랜드 색상 (hex) - 차트, 아이콘 배경 등 */
  color: string;
  /** 데이터 소스 유형 */
  dataSource: ServiceDataSource;
  /** 인증 방식 */
  authMethod: AuthMethod;
  /** API 엔드포인트 (api-key 방식인 경우) */
  apiBaseUrl: string | null;
  /** 서비스 웹사이트 URL */
  websiteUrl: string;
  /** 기본 크레딧 단위 */
  defaultCreditUnit: string;
  /** 아이콘 식별자 (파일명이나 컴포넌트 이름으로 사용) */
  iconId: string;
}

/** 서비스별 설정 맵 */
export const SERVICE_CONFIGS: Record<ServiceName, ServiceConfig> = {
  // ── API 서비스 (크레딧 수집 가능) ──
  'Anthropic API': {
    name: 'Anthropic API',
    shortName: 'Anthropic',
    color: '#D97757',
    dataSource: 'api',
    authMethod: 'api-key',
    apiBaseUrl: 'https://api.anthropic.com',
    websiteUrl: 'https://console.anthropic.com',
    defaultCreditUnit: 'USD',
    iconId: 'anthropic',
  },
  'OpenAI API': {
    name: 'OpenAI API',
    shortName: 'OpenAI API',
    color: '#10A37F',
    dataSource: 'api',
    authMethod: 'api-key',
    apiBaseUrl: 'https://api.openai.com',
    websiteUrl: 'https://platform.openai.com',
    defaultCreditUnit: 'USD',
    iconId: 'openai',
  },
  'Google Cloud (Gemini API)': {
    name: 'Google Cloud (Gemini API)',
    shortName: 'Gemini API',
    color: '#4285F4',
    dataSource: 'manual',
    authMethod: 'none',
    apiBaseUrl: null,
    websiteUrl: 'https://console.cloud.google.com',
    defaultCreditUnit: 'USD',
    iconId: 'google-cloud',
  },
  'ElevenLabs': {
    name: 'ElevenLabs',
    shortName: 'ElevenLabs',
    color: '#000000',
    dataSource: 'api',
    authMethod: 'api-key',
    apiBaseUrl: 'https://api.elevenlabs.io',
    websiteUrl: 'https://elevenlabs.io',
    defaultCreditUnit: 'characters',
    iconId: 'elevenlabs',
  },

  // ── 구독형 서비스 (크레딧 수집 불필요) ──
  'Claude': {
    name: 'Claude',
    shortName: 'Claude',
    color: '#D97757',
    dataSource: 'manual',
    authMethod: 'none',
    apiBaseUrl: null,
    websiteUrl: 'https://claude.ai',
    defaultCreditUnit: 'credits',
    iconId: 'claude',
  },
  'ChatGPT': {
    name: 'ChatGPT',
    shortName: 'ChatGPT',
    color: '#10A37F',
    dataSource: 'manual',
    authMethod: 'none',
    apiBaseUrl: null,
    websiteUrl: 'https://chat.openai.com',
    defaultCreditUnit: 'credits',
    iconId: 'chatgpt',
  },
  'Gemini': {
    name: 'Gemini',
    shortName: 'Gemini',
    color: '#4285F4',
    dataSource: 'manual',
    authMethod: 'none',
    apiBaseUrl: null,
    websiteUrl: 'https://gemini.google.com',
    defaultCreditUnit: 'credits',
    iconId: 'gemini',
  },

  // ── 세션 기반 서비스 (Extension 크레딧 수집) ──
  'Suno': {
    name: 'Suno',
    shortName: 'Suno',
    color: '#1DB954',
    dataSource: 'extension',
    authMethod: 'session-cookie',
    apiBaseUrl: null,
    websiteUrl: 'https://suno.com',
    defaultCreditUnit: 'credits',
    iconId: 'suno',
  },
  'Midjourney': {
    name: 'Midjourney',
    shortName: 'Midjourney',
    color: '#5865F2',
    dataSource: 'extension',
    authMethod: 'session-cookie',
    apiBaseUrl: null,
    websiteUrl: 'https://www.midjourney.com',
    defaultCreditUnit: 'generations',
    iconId: 'midjourney',
  },
  'Meshy AI': {
    name: 'Meshy AI',
    shortName: 'Meshy',
    color: '#FF6B35',
    dataSource: 'extension',
    authMethod: 'session-cookie',
    apiBaseUrl: null,
    websiteUrl: 'https://www.meshy.ai',
    defaultCreditUnit: 'credits',
    iconId: 'meshy',
  },
};

/** 서비스 이름으로 설정 조회 */
export function getServiceConfig(name: ServiceName): ServiceConfig {
  return SERVICE_CONFIGS[name];
}

/** API 기반 서비스만 필터 */
export function getApiServices(): ServiceConfig[] {
  return Object.values(SERVICE_CONFIGS).filter((c) => c.authMethod === 'api-key');
}

/** 세션(Extension) 기반 서비스만 필터 */
export function getSessionServices(): ServiceConfig[] {
  return Object.values(SERVICE_CONFIGS).filter(
    (c) => c.authMethod === 'session-cookie',
  );
}
