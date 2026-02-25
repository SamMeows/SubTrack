import type { ServiceName } from './constants';

/** 데이터 소스 유형 */
export type ServiceDataSource = 'api' | 'extension' | 'manual';

/** 알림 유형 */
export type AlertType = 'renewal' | 'low_credit';

/** 알림 채널 */
export type AlertChannel = 'email' | 'slack';

/** 통화 */
export type Currency = 'USD' | 'KRW' | 'EUR' | 'JPY';

/** 구독 서비스 */
export interface Subscription {
  id: string;
  user_id: string;
  service_name: ServiceName;
  plan_name: string | null;
  login_email: string | null;
  payment_card_last4: string | null;
  monthly_cost: number;
  currency: Currency;
  billing_day: number; // 1-31
  total_credits: number | null;
  remaining_credits: number | null;
  credit_unit: string | null; // 'tokens', 'credits', 'characters', etc.
  data_source: ServiceDataSource;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 크레딧 사용 로그 */
export interface CreditLog {
  id: string;
  subscription_id: string;
  remaining_credits: number;
  used_credits: number;
  collected_at: string;
  source: ServiceDataSource;
}

/** 알림 설정 */
export interface Alert {
  id: string;
  user_id: string;
  subscription_id: string | null;
  type: AlertType;
  threshold: number | null; // low_credit일 때 잔여 % 기준
  channel: AlertChannel;
  enabled: boolean;
  created_at: string;
}
